import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Hikvision DS-K1T320EFWX Cloud Event Receiver
 * Protocol: ISUP 5.0 / HTTP Event Notification Listener
 * Handles real-time face, fingerprint, and card scanning events pushed by the terminal.
 */

interface HikvisionEventBody {
  AccessControllerEvent?: {
    deviceName?: string;
    serialNo?: string;
    employeeNoString?: string;
    cardNo?: string;
    currentVerifyMode?: string;
    verifyResult?: string;
    time?: string;
    minor?: number;
    major?: number;
  };
  eventLog?: {
    employeeNo?: string;
    authMethod?: string;
    time?: string;
  };
  // Direct flat JSON payload format support
  employeeNo?: string;
  employeeNoString?: string;
  authMethod?: string;
  deviceName?: string;
  serialNo?: string;
  time?: string;
  timestamp?: string;
  name?: string;
}

export async function GET() {
  // Hikvision terminal handshake / healthcheck endpoint
  return NextResponse.json({
    status: "online",
    deviceType: "Hikvision DS-K1T320EFWX",
    protocol: "ISUP 5.0 / HTTP Event Listener",
    timestamp: new Date().toISOString(),
    statusCode: 1,
    statusString: "OK",
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: HikvisionEventBody = {};
    const contentType = req.headers.get("content-type") || "";
    const rawText = await req.text();

    try {
      body = JSON.parse(rawText);
    } catch {
      // Hikvision Multipart JSON extraction
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          body = JSON.parse(jsonMatch[0]);
        } catch {
          // Fall through
        }
      }

      // Hikvision XML or Form-encoded fallback parsing
      if (!body.employeeNoString && !body.employeeNo && !body.AccessControllerEvent) {
        const empMatch =
          rawText.match(/<employeeNoString>(.*?)<\/employeeNoString>/i) ||
          rawText.match(/<employeeNo>(.*?)<\/employeeNo>/i) ||
          rawText.match(/employeeNoString["=:\s]+["']?([a-zA-Z0-9_-]+)/i) ||
          rawText.match(/employeeNo["=:\s]+["']?([a-zA-Z0-9_-]+)/i) ||
          rawText.match(/<cardNo>(.*?)<\/cardNo>/i);

        if (empMatch) {
          body.employeeNoString = empMatch[1].trim();
        }
      }
    }

    // Extract employee biometric ID
    const biometricId =
      body.AccessControllerEvent?.employeeNoString ||
      body.employeeNoString ||
      body.employeeNo ||
      body.eventLog?.employeeNo ||
      body.AccessControllerEvent?.cardNo;

    console.log(`[HIKVISION RECV] Content-Type: ${contentType} | BiometricID: ${biometricId || "None"} | Raw: ${rawText.slice(0, 150).replace(/\n/g, " ")}`);

    if (!biometricId) {
      // Hikvision Heartbeat / Registration Ping
      try {
        const serialNo = body.AccessControllerEvent?.serialNo || body.serialNo || "HK-TERMINAL-01";
        const device = await db.biometricDevice.findFirst({ where: { serialNumber: serialNo } });
        if (device) {
          await db.biometricDevice.update({
            where: { id: device.id },
            data: { status: "Connected", lastSyncTime: new Date() }
          });
        } else {
          await db.biometricDevice.create({
            data: {
              name: body.deviceName || "Hikvision Terminal",
              model: "DS-K1T320EFWX",
              serialNumber: serialNo,
              location: "Clinic Main Gate",
              status: "Connected",
              protocol: "ISUP 5.0",
            }
          });
        }
      } catch {
        // Fallback
      }

      const acceptHeader = req.headers.get("accept") || "";
      if (acceptHeader.includes("xml")) {
        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?><ResponseStatus version="1.0"><requestURL>/ISUP/Register</requestURL><statusCode>1</statusCode><statusString>OK</statusString><subStatusCode>ok</subStatusCode></ResponseStatus>`,
          { headers: { "Content-Type": "application/xml" } }
        );
      }

      return NextResponse.json({
        ResponseStatus: {
          requestURL: "/ISUP/Register",
          statusCode: 1,
          statusString: "OK",
          subStatusCode: "ok",
        },
        statusCode: 1,
        statusString: "OK",
        data: { status: "online" },
      });
    }

    // Extract Event Metadata
    const deviceName = body.AccessControllerEvent?.deviceName || body.deviceName || "DS-K1T320EFWX Terminal";
    const serialNo = body.AccessControllerEvent?.serialNo || body.serialNo || "HK-TERMINAL-01";
    
    // Determine Auth Method (Fingerprint vs Face vs Card) based on Minor Code & VerifyMode
    const minorCode = body.AccessControllerEvent?.minor;
    const modeRaw = String(body.AccessControllerEvent?.currentVerifyMode || body.authMethod || "").toLowerCase();
    
    let authMethod = "Face"; // Default
    if (minorCode === 22 || minorCode === 23 || minorCode === 24 || minorCode === 25 || modeRaw.includes("finger")) {
      authMethod = "Fingerprint";
    } else if (minorCode === 75 || modeRaw.includes("face")) {
      authMethod = "Face";
    } else if (minorCode === 1 || minorCode === 38 || modeRaw.includes("card")) {
      authMethod = "Card";
    }

    // Extract Event Timestamp in Sri Lanka Time (Asia/Colombo UTC+5:30) robustly
    const rawTimeInput = body.AccessControllerEvent?.time || body.time || body.timestamp;
    let eventDateObj = new Date();
    
    if (rawTimeInput) {
      // Hikvision sends local time (e.g. "2026-08-27T14:12:42").
      // If we pass this to new Date() on Vercel, it assumes it's UTC and adds 5.5 hours.
      // We fix this by ensuring the string explicitly declares it is already +05:30.
      let safeTimeStr = rawTimeInput.replace("Z", ""); // Remove 'Z' if it incorrectly sends it
      if (!safeTimeStr.includes("+") && !safeTimeStr.includes("-")) {
        safeTimeStr += "+05:30";
      }
      
      const parsed = new Date(safeTimeStr);
      if (!isNaN(parsed.getTime())) eventDateObj = parsed;
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Colombo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(eventDateObj);
    const dateParts: Record<string, string> = {};
    parts.forEach(p => { dateParts[p.type] = p.value; });
    
    const slYear = parseInt(dateParts.year);
    const slMonth = parseInt(dateParts.month);
    const slDay = parseInt(dateParts.day);
    const slHour = parseInt(dateParts.hour) === 24 ? 0 : parseInt(dateParts.hour);
    const slMinute = parseInt(dateParts.minute);
    const slSecond = parseInt(dateParts.second);

    const dateStr = `${slYear}-${String(slMonth).padStart(2, "0")}-${String(slDay).padStart(2, "0")}`;
    const timeStr = `${String(slHour).padStart(2, "0")}:${String(slMinute).padStart(2, "0")}:${String(slSecond).padStart(2, "0")}`;

    // Find or Auto-Create Employee in Database (Ensures Foreign Key is 100% valid)
    let employee = null;
    try {
      employee = await db.employee.findFirst({
        where: { biometricId: String(biometricId) },
      });

      if (!employee) {
        // Extract name from rawText or body payload if sent by Hikvision
        const nameMatch = rawText.match(/<name>(.*?)<\/name>/i) || rawText.match(/name["=:\s]+["']?([a-zA-Z0-9_\s]+)/i);
        const rawName = nameMatch ? nameMatch[1].trim() : ((body.AccessControllerEvent as unknown as Record<string, string>)?.name || body.name || "");
        const nameParts = rawName ? rawName.split(" ") : [];
        const fName = nameParts[0] || "Staff";
        const lName = nameParts.slice(1).join(" ") || `#${biometricId}`;

        // Auto-register missing biometric ID to guarantee database foreign key integrity
        employee = await db.employee.create({
          data: {
            biometricId: String(biometricId),
            firstName: fName,
            lastName: lName,
            role: "Nurse",
            payType: "Fixed Monthly",
            basicSalary: 60000,
          },
        });
      }
    } catch (err) {
      console.error("[HIKVISION] DB Employee lookup error:", err);
    }

    if (!employee) {
      console.error("[HIKVISION] Cannot record log: Employee not found and auto-creation failed.");
      return NextResponse.json({ statusCode: 0, statusString: "Employee Not Found" }, { status: 400 });
    }

    // We must use the true Prisma UUID/CUID for Postgres Foreign Key 'employeeId'
    const employeeId = employee.id;
    const employeeName = `${employee.firstName} ${employee.lastName}`;

    // Update Device Status in DB
    try {
      const device = await db.biometricDevice.findFirst({ where: { serialNumber: serialNo } });
      if (device) {
        await db.biometricDevice.update({
          where: { id: device.id },
          data: {
            status: "Connected",
            lastSyncTime: new Date(),
            ipAddress: req.headers.get("x-forwarded-for") || "Cloud Wi-Fi Client",
          }
        });
      } else {
        await db.biometricDevice.create({
          data: {
            name: deviceName,
            model: "DS-K1T320EFWX",
            serialNumber: serialNo,
            location: "Clinic Main Gate",
            status: "Connected",
            protocol: "ISUP 5.0",
            ipAddress: req.headers.get("x-forwarded-for") || "Cloud Wi-Fi Client",
          }
        });
      }
    } catch {
      // Database bypass fallback
    }

    // Check existing attendance log for today in DB or Memory
    const existingLog = await db.attendanceLog.findFirst({
      where: {
        date: dateStr,
        OR: [
          { employeeId: employeeId },
          { employee: { biometricId: biometricId } },
        ],
      },
    });



    const isCheckOut = Boolean(existingLog && existingLog.checkIn);
    const actionType = isCheckOut ? "checkOut" : "checkIn";

    // Calculate Status based on assigned shifts and arrival time
    const arrivalHour = slHour;
    const arrivalMin = slMinute;
    const arrivalTimeMinutes = arrivalHour * 60 + arrivalMin;
    
    let shiftStartMinutes = 8 * 60 + 30; // Default 08:30 AM
    let gracePeriodMinutes = 15;

    try {
      // Find the specific shift for this employee on today's weekday
      if (employee && Array.isArray(employee.shiftIds) && employee.shiftIds.length > 0) {
        // Create a UTC date at noon to reliably get the day of the week in Sri Lanka
        const currentDayOfWeek = new Date(Date.UTC(slYear, slMonth - 1, slDay, 12)).getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

        const allShifts = await db.shift.findMany({
          where: { id: { in: employee.shiftIds as string[] } }
        });
        
        // Find the active shift for today based on workDays
        const todayShift = allShifts.find(s => Array.isArray(s.workDays) && s.workDays.includes(currentDayOfWeek));
        
        if (todayShift) {
          const [h, m] = todayShift.startTime.split(':').map(Number);
          shiftStartMinutes = h * 60 + m;
          gracePeriodMinutes = todayShift.gracePeriod || 15;
        }
      }
    } catch (err) {
      console.error("[HIKVISION] Error calculating dynamic shift:", err);
    }

    let computedStatus: "On-Time" | "Late" | "Half-Day" | "On-Leave" | "Absent" = "On-Time";
    if (arrivalTimeMinutes > shiftStartMinutes + gracePeriodMinutes) {
      computedStatus = "Late";
    }


    if (isCheckOut && existingLog) {
      // SECOND SCAN TODAY -> Record Check-Out
      await db.attendanceLog.update({
        where: { id: existingLog.id },
        data: {
          checkOut: timeStr,
          authMethod: authMethod,
        },
      });
    } else {
      await db.attendanceLog.create({
        data: {
          employeeId: employeeId,
          date: dateStr,
          checkIn: timeStr,
          status: computedStatus,
          authMethod: authMethod,
          deviceId: serialNo,
        },
      });
    }

    console.log(`[HIKVISION ISUP] Punch Received - ${employeeName} (${biometricId}) via ${authMethod} at ${timeStr}`);

    // Return standard Hikvision success payload
    return NextResponse.json({
      statusCode: 1,
      statusString: "OK",
      data: {
        action: actionType,
        employeeName,
        biometricId,
        time: timeStr,
        date: dateStr,
        status: computedStatus,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Error";
    console.error("[HIKVISION ERROR]", errorMessage);
    return NextResponse.json(
      { statusCode: 0, statusString: errorMessage },
      { status: 500 }
    );
  }
}
