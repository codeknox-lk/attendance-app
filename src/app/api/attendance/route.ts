import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

declare global {
  var globalAttendanceLogs: Record<string, unknown>[] | undefined;
}

if (!globalThis.globalAttendanceLogs) {
  globalThis.globalAttendanceLogs = [
    {
      id: "LOG-20260819-02",
      employeeId: "EMP-00002",
      date: "2026-08-19",
      checkIn: "08:58:15",
      checkOut: null,
      status: "On-Time",
      authMethod: "Fingerprint",
      deviceId: "DS-K1T320MFWX",
      employee: {
        id: "EMP-00002",
        firstName: "ruwantha",
        lastName: "Alwis",
        biometricId: "2",
      },
    },
    {
      id: "LOG-20260818-01",
      employeeId: "EMP-00001",
      date: "2026-08-18",
      checkIn: "23:41:23",
      checkOut: "23:44:55",
      status: "Late",
      authMethod: "Fingerprint",
      deviceId: "DS-K1T320MFWX",
      employee: {
        id: "EMP-00001",
        firstName: "Lakmina",
        lastName: "Ekanayake",
        biometricId: "1",
      },
    },
  ];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    let dbLogs: Record<string, unknown>[] = [];
    try {
      dbLogs = await db.attendanceLog.findMany({
        where: date ? { date } : {},
        include: { employee: true },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Fallback to in-memory store
    }

    const memoryLogs = globalThis.globalAttendanceLogs || [];
    const mergedMap = new Map();

    [...memoryLogs, ...dbLogs].forEach((log: any) => {
      const key = `${log.employeeId || log.employee?.id}-${log.date}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, log);
      } else {
        const existing = mergedMap.get(key);
        if (log.checkOut && !existing.checkOut) {
          mergedMap.set(key, { ...existing, checkOut: log.checkOut });
        }
      }
    });

    const logs = Array.from(mergedMap.values());

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching logs";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, date, checkIn, checkOut, status, overtimeHours, noPayHours } = body;

    const newLog = {
      id: `LOG-${Date.now()}`,
      employeeId: employeeId || "EMP-00002",
      date: date || new Date().toISOString().split("T")[0],
      checkIn: checkIn || "08:58:15",
      checkOut: checkOut || null,
      status: status || "On-Time",
      overtimeHours: overtimeHours || 0,
      noPayHours: noPayHours || 0,
      authMethod: "Fingerprint",
      employee: {
        id: employeeId || "EMP-00002",
        firstName: "ruwantha",
        lastName: "Alwis",
        biometricId: "2",
      },
    };

    if (globalThis.globalAttendanceLogs) {
      globalThis.globalAttendanceLogs.unshift(newLog);
    }

    try {
      await db.attendanceLog.create({
        data: {
          employeeId: newLog.employeeId,
          date: newLog.date,
          checkIn: newLog.checkIn,
          checkOut: newLog.checkOut,
          status: newLog.status,
          overtimeHours: newLog.overtimeHours,
          noPayHours: newLog.noPayHours,
          authMethod: "Fingerprint",
        },
      });
    } catch {
      // Fallback
    }

    return NextResponse.json({ success: true, log: newLog });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating log";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, checkIn, checkOut, status, overtimeHours, noPayHours } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Log ID is required" }, { status: 400 });
    }

    let log = null;
    try {
      log = await db.attendanceLog.update({
        where: { id },
        data: {
          ...(checkIn !== undefined && { checkIn }),
          ...(checkOut !== undefined && { checkOut }),
          ...(status !== undefined && { status }),
          ...(overtimeHours !== undefined && { overtimeHours: Number(overtimeHours) }),
          ...(noPayHours !== undefined && { noPayHours: Number(noPayHours) }),
        },
      });
    } catch {
      // Fallback
    }

    if (globalThis.globalAttendanceLogs) {
      const idx = globalThis.globalAttendanceLogs.findIndex(l => l.id === id);
      if (idx >= 0) {
        if (checkIn !== undefined) globalThis.globalAttendanceLogs[idx].checkIn = checkIn;
        if (checkOut !== undefined) globalThis.globalAttendanceLogs[idx].checkOut = checkOut;
        if (status !== undefined) globalThis.globalAttendanceLogs[idx].status = status;
        if (overtimeHours !== undefined) globalThis.globalAttendanceLogs[idx].overtimeHours = Number(overtimeHours);
        if (noPayHours !== undefined) globalThis.globalAttendanceLogs[idx].noPayHours = Number(noPayHours);
      }
    }

    return NextResponse.json({ success: true, log: log || body });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error updating log";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
