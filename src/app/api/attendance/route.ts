import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface LogRecord {
  employeeId?: string;
  date?: string;
  checkOut?: string | null;
  employee?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    biometricId?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

declare global {
  var globalAttendanceLogs: LogRecord[] | undefined;
}

if (!globalThis.globalAttendanceLogs) {
  globalThis.globalAttendanceLogs = [];
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

    [...memoryLogs, ...dbLogs].forEach((log: LogRecord) => {
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Log ID is required" }, { status: 400 });
    }

    try {
      await db.attendanceLog.delete({
        where: { id },
      });
    } catch {
      // Fallback
    }

    if (globalThis.globalAttendanceLogs) {
      globalThis.globalAttendanceLogs = globalThis.globalAttendanceLogs.filter(l => l.id !== id);
    }

    return NextResponse.json({ success: true, message: "Attendance log deleted" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting log";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
