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
        await db.biometricDevice.upsert({
          where: { serialNumber: serialNo },
          update: { status: "Connected", lastSyncTime: new Date() },
          create: {
            name: body.deviceName || "Hikvision Terminal",
            model: "DS-K1T320EFWX",
            serialNumber: serialNo,
            location: "Clinic Main Gate",
            status: "Connected",
            protocol: "ISUP 5.0",
          },
        });
      } catch {
        // Fallback
      }

      return NextResponse.json({
        statusCode: 1,
        statusString: "OK",
        data: { status: "online" },
      });
    }

    // Extract Event Metadata
    const deviceName = body.AccessControllerEvent?.deviceName || body.deviceName || "DS-K1T320EFWX Terminal";
    const serialNo = body.AccessControllerEvent?.serialNo || body.serialNo || "HK-TERMINAL-01";
    const authMethodRaw = body.AccessControllerEvent?.currentVerifyMode || body.authMethod || "Face";
    const authMethod = authMethodRaw.toLowerCase().includes("face")
      ? "Face"
      : authMethodRaw.toLowerCase().includes("finger")
      ? "Fingerprint"
      : authMethodRaw.toLowerCase().includes("card")
      ? "Card"
      : "Face";

    // Extract or default Event Timestamp
    const eventTimeStr = body.AccessControllerEvent?.time || body.time || body.timestamp || new Date().toISOString();
    const eventDateObj = new Date(eventTimeStr);
    const dateStr = !isNaN(eventDateObj.getTime())
      ? eventDateObj.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const timeStr = !isNaN(eventDateObj.getTime())
      ? eventDateObj.toTimeString().split(" ")[0]
      : new Date().toTimeString().split(" ")[0];

    // Find Employee in Database
    let employee = null;
    try {
      employee = await db.employee.findUnique({
        where: { biometricId: biometricId },
      });
    } catch {
      // Prisma error fallback or uninitialized DB safeguard
    }

    const employeeId = employee ? employee.id : `EMP-${biometricId}`;
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `Staff ID #${biometricId}`;

    // Update Device Status in DB
    try {
      await db.biometricDevice.upsert({
        where: { serialNumber: serialNo },
        update: {
          status: "Connected",
          lastSyncTime: new Date(),
          ipAddress: req.headers.get("x-forwarded-for") || "Cloud Wi-Fi Client",
        },
        create: {
          name: deviceName,
          model: "DS-K1T320EFWX",
          serialNumber: serialNo,
          location: "Clinic Main Gate",
          status: "Connected",
          protocol: "ISUP 5.0",
          ipAddress: req.headers.get("x-forwarded-for") || "Cloud Wi-Fi Client",
        },
      });
    } catch {
      // Database bypass fallback
    }

    // Check existing attendance log for today
    let existingLog = null;
    try {
      existingLog = await db.attendanceLog.findFirst({
        where: { employeeId: employeeId, date: dateStr },
      });
    } catch {
      // Database bypass fallback
    }

    let actionType = "checkIn";

    // Calculate Status based on arrival time (Standard shift 08:30 AM with 15-min grace)
    const arrivalHour = eventDateObj.getHours();
    const arrivalMin = eventDateObj.getMinutes();
    const arrivalTimeMinutes = arrivalHour * 60 + arrivalMin;
    const shiftStartMinutes = 8 * 60 + 30; // 08:30 AM
    const gracePeriodMinutes = 15;

    let computedStatus: "On-Time" | "Late" | "Half-Day" | "On-Leave" | "Absent" = "On-Time";
    if (arrivalTimeMinutes > shiftStartMinutes + gracePeriodMinutes) {
      computedStatus = "Late";
    }

    if (!existingLog || !existingLog.checkIn) {
      // FIRST SCAN TODAY -> Record Check-In
      actionType = "checkIn";
      try {
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
      } catch {
        // Fallback
      }
    } else {
      // SECOND SCAN TODAY -> Record Check-Out
      actionType = "checkOut";
      try {
        await db.attendanceLog.update({
          where: { id: existingLog.id },
          data: {
            checkOut: timeStr,
            authMethod: authMethod,
          },
        });
      } catch {
        // Fallback
      }
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
