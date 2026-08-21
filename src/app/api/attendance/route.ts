export const dynamic = 'force-dynamic';

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

    // 1. Load permanent Neon DB logs first
    dbLogs.forEach((log: Record<string, unknown>) => {
      const empId = (log.employeeId as string) || (log.employee as { id?: string })?.id;
      const key = `${empId}-${log.date}`;
      mergedMap.set(key, log);
    });

    // 2. Merge in-memory logs if DB row doesn't exist yet
    memoryLogs.forEach((log: LogRecord) => {
      const empId = (log.employeeId as string) || (log.employee as { id?: string })?.id;
      const key = `${empId}-${log.date}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, log);
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
    const { employeeId, date, checkIn, checkOut, status, overtimeHours, noPayHours, authMethod } = body;

    const inputEmpId = String(employeeId || "1");
    const logDate = date || new Date().toISOString().split("T")[0];

    // Dynamic Employee Lookup to guarantee valid Foreign Key
    let dbEmp = await db.employee.findUnique({ where: { id: inputEmpId } }).catch(() => null);
    if (!dbEmp) {
      dbEmp = await db.employee.findFirst({ where: { biometricId: inputEmpId } });
    }
    if (!dbEmp) {
      // Auto create employee if missing
      dbEmp = await db.employee.create({
        data: {
          firstName: "Staff",
          lastName: `#${inputEmpId}`,
          biometricId: inputEmpId,
          role: "Nurse",
          payType: "Fixed Monthly",
          basicSalary: 60000,
        },
      });
    }

    // Check if log exists for today to update checkOut instead of creating duplicate
    const existing = await db.attendanceLog.findFirst({
      where: { employeeId: dbEmp.id, date: logDate },
    });

    let savedLog = null;
    if (existing) {
      savedLog = await db.attendanceLog.update({
        where: { id: existing.id },
        data: {
          ...(checkIn && { checkIn }),
          ...(checkOut && { checkOut }),
          ...(status && { status }),
          ...(overtimeHours !== undefined && { overtimeHours: Number(overtimeHours) }),
          ...(noPayHours !== undefined && { noPayHours: Number(noPayHours) }),
          ...(authMethod && { authMethod }),
        },
        include: { employee: true },
      });
    } else {
      savedLog = await db.attendanceLog.create({
        data: {
          employeeId: dbEmp.id,
          date: logDate,
          checkIn: checkIn || "08:30:00",
          checkOut: checkOut || null,
          status: status || "On-Time",
          overtimeHours: Number(overtimeHours) || 0,
          noPayHours: Number(noPayHours) || 0,
          authMethod: authMethod || "Fingerprint",
        },
        include: { employee: true },
      });
    }

    return NextResponse.json({ success: true, log: savedLog });
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
