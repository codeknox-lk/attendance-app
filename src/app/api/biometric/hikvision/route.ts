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
              clinicId: "default-clinic-id",
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

    // Determine Clinic ID from the Device
    let clinicId = "default-clinic-id";
    try {
      const device = await db.biometricDevice.findFirst({ where: { serialNumber: serialNo } });
      if (device && device.clinicId) {
        clinicId = device.clinicId;
      }
    } catch {
      // Use default
    }

    // Find or Auto-Create Employee in Database (Ensures Foreign Key is 100% valid)
    let employee = null;
    try {
      const cleanBioId = String(biometricId).trim();
      const numericBioId = cleanBioId.replace(/\D/g, "");
      const intBioId = numericBioId ? String(parseInt(numericBioId, 10)) : "";

      employee = await db.employee.findFirst({
        where: {
          clinicId,
          OR: [
            { biometricId: cleanBioId },
            ...(intBioId ? [{ biometricId: intBioId }] : []),
            ...(cleanBioId.startsWith("SH") ? [] : [{ biometricId: `SH${cleanBioId.padStart(3, "0")}` }]),
            ...(intBioId ? [{ biometricId: `SH${intBioId.padStart(3, "0")}` }] : []),
          ],
        },
      });

      if (!employee) {
        // Extract real person name from XML/JSON (explicitly ignoring event_log / multipart boundaries)
        let rawName = "";
        const xmlNameMatch = rawText.match(/<name>([^<]+)<\/name>/i);
        if (xmlNameMatch && xmlNameMatch[1] && !xmlNameMatch[1].toLowerCase().includes("event_log")) {
          rawName = xmlNameMatch[1].trim();
        } else if (body.name && typeof body.name === "string" && !body.name.toLowerCase().includes("event_log")) {
          rawName = body.name.trim();
        }

        const nameParts = rawName ? rawName.split(/\s+/) : [];
        const fName = (nameParts[0] && !nameParts[0].toLowerCase().includes("event_log")) ? nameParts[0] : "Staff";
        const lName = nameParts.slice(1).join(" ") || `#${cleanBioId}`;

        // Auto-register missing biometric ID to guarantee database foreign key integrity
        employee = await db.employee.create({
          data: {
            clinicId,
            biometricId: cleanBioId,
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
            clinicId,
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
        clinicId,
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
    let shiftEndMinutes = 17 * 60 + 0;   // Default 05:00 PM
    let gracePeriodMinutes = 15;

    let clinicSettings: { otCalculationType?: string | null; otGracePeriodMinutes?: number | null; punctualGraceType?: string | null; punctualGraceMinutes?: number | null } | null = null;
    try {
      clinicSettings = await db.clinic.findUnique({ where: { id: clinicId } });
      if (clinicSettings?.punctualGraceType === "Strict") {
        gracePeriodMinutes = 0;
      } else if (clinicSettings?.punctualGraceMinutes !== undefined && clinicSettings?.punctualGraceMinutes !== null) {
        gracePeriodMinutes = clinicSettings.punctualGraceMinutes;
      }
    } catch (err) {
      console.error("[HIKVISION] Error fetching clinic settings:", err);
    }

    try {
      const currentDayOfWeek = new Date(Date.UTC(slYear, slMonth - 1, slDay, 12)).getUTCDay();
      let targetHours: { startTime: string; endTime: string } | null = await db.employeeOperatingHours.findUnique({
        where: { employeeId_dayOfWeek: { employeeId, dayOfWeek: currentDayOfWeek } }
      });

      if (!targetHours) {
        targetHours = await db.clinicOperatingHours.findUnique({
          where: { clinicId_dayOfWeek: { clinicId, dayOfWeek: currentDayOfWeek } }
        });
      }
      
      if (targetHours) {
        const [h1, m1] = targetHours.startTime.split(':').map(Number);
        shiftStartMinutes = h1 * 60 + m1;
        const [h2, m2] = targetHours.endTime.split(':').map(Number);
        shiftEndMinutes = h2 * 60 + m2;
      }
    } catch (err) {
      console.error("[HIKVISION] Error fetching operating hours:", err);
    }

    let computedStatus: "On-Time" | "Late" | "Half-Day" | "On-Leave" | "Absent" = "On-Time";
    if (!isCheckOut && arrivalTimeMinutes > shiftStartMinutes + gracePeriodMinutes) {
      computedStatus = "Late";
    }

    if (isCheckOut && existingLog) {
      let overtimeHours = existingLog.overtimeHours || 0;
      
      try {
        const otType = clinicSettings?.otCalculationType || "Manual";
        const otGrace = clinicSettings?.otGracePeriodMinutes ?? 30;

        if (otType === "Manual" || otType === "Disabled") {
          overtimeHours = 0;
        } else if (otType === "Strict") {
          if (arrivalTimeMinutes > shiftEndMinutes) {
            const otMinutes = arrivalTimeMinutes - shiftEndMinutes;
            overtimeHours = Math.round((otMinutes / 60) * 10) / 10;
          }
        } else if (otType === "Grace Period") {
          if (arrivalTimeMinutes > shiftEndMinutes + otGrace) {
            const otMinutes = arrivalTimeMinutes - shiftEndMinutes;
            overtimeHours = Math.round((otMinutes / 60) * 10) / 10;
          } else {
            overtimeHours = 0;
          }
        }
      } catch (err) {
        console.error("[HIKVISION] Error calculating clinic OT:", err);
      }

      // SECOND SCAN TODAY -> Record Check-Out
      await db.attendanceLog.update({
        where: { id: existingLog.id, clinicId },
        data: {
          checkOut: timeStr,
          authMethod: authMethod,
          overtimeHours,
        },
      });
    } else {
      await db.attendanceLog.create({
        data: {
          clinicId,
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
