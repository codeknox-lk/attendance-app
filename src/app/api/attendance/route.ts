import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Global persistent in-memory attendance log store for cloud serverless (Vercel)
declare global {
  // eslint-disable-next-line no-var
  var globalAttendanceLogs: any[] | undefined;
}

if (!globalThis.globalAttendanceLogs) {
  globalThis.globalAttendanceLogs = [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    let dbLogs: any[] = [];
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
    const consolidatedMap = new Map<string, any>();

    [...dbLogs, ...memoryLogs].forEach(log => {
      const empId = log.employeeId || log.employee?.id;
      if (!empId) return;
      const key = `${empId}-${log.date}`;

      if (!consolidatedMap.has(key)) {
        consolidatedMap.set(key, { ...log });
      } else {
        const existing = consolidatedMap.get(key);
        const times = [log.checkIn, log.checkOut, existing.checkIn, existing.checkOut]
          .filter(t => t && t !== "--:--:--" && t !== "–")
          .sort();

        if (times.length > 0) {
          existing.checkIn = times[0];
          existing.checkOut = times.length > 1 && times[times.length - 1] !== times[0] ? times[times.length - 1] : existing.checkOut;
        }

        if (log.employee && !existing.employee) {
          existing.employee = log.employee;
        }
        consolidatedMap.set(key, existing);
      }
    });

    const logs = Array.from(consolidatedMap.values()).sort((a, b) => b.date.localeCompare(a.date));

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
