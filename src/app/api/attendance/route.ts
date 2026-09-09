export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    const clinicId = await getClinicId(req);

    const whereClause: Prisma.AttendanceLogWhereInput = { clinicId };
    if (date) {
      whereClause.date = date;
    } else if (month) {
      whereClause.date = { startsWith: month };
    }

    const logs = await db.attendanceLog.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            biometricId: true,
            payType: true,
            basicSalary: true,
            hourlyRate: true,
            sessionRate: true,
            epfEligible: true,
            taxable: true,
            active: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching logs";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clinicId = await getClinicId(req);

    const logItems = Array.isArray(body.logs) ? body.logs : [body];
    const savedLogs = [];

    for (const item of logItems) {
      const { employeeId, date, checkIn, checkOut, status, overtimeHours, noPayHours, authMethod } = item;
      if (!employeeId && !item.biometricId) continue;

      const inputEmpId = String(employeeId || item.biometricId || "1");
      const logDate = date || new Date().toISOString().split("T")[0];

      // Dynamic Employee Lookup to guarantee valid Foreign Key
      let dbEmp = await db.employee.findUnique({ where: { id: inputEmpId } }).catch(() => null);
      if (dbEmp && dbEmp.clinicId !== clinicId) dbEmp = null;

      if (!dbEmp) {
        dbEmp = await db.employee.findFirst({ where: { biometricId: inputEmpId, clinicId } });
      }
      if (!dbEmp) {
        // Auto create employee if missing
        dbEmp = await db.employee.create({
          data: {
            clinicId,
            firstName: item.employeeFirstName || "Staff",
            lastName: item.employeeLastName || `#${inputEmpId}`,
            biometricId: inputEmpId,
            role: "Nurse",
            payType: "Fixed Monthly",
            basicSalary: 60000,
          },
        });
      }

      // Check if log exists for today to update checkOut instead of creating duplicate
      const existing = await db.attendanceLog.findFirst({
        where: { employeeId: dbEmp.id, date: logDate, clinicId },
      });

      const action = item.conflictAction || body.defaultConflictStrategy || "merge";

      let savedLog = null;
      if (existing) {
        if (action === "skip") {
          // Admin chose to skip existing records
          savedLogs.push(existing);
          continue;
        }

        if (action === "merge") {
          // Smart Merge: Preserve precise biometric hardware check-in if present
          const isBiometric = existing.authMethod && (existing.authMethod.includes("Fingerprint") || existing.authMethod.includes("Face") || existing.authMethod.includes("Card"));
          
          const finalCheckIn = isBiometric && existing.checkIn ? existing.checkIn : (checkIn || existing.checkIn);
          const finalCheckOut = existing.checkOut ? existing.checkOut : (checkOut || null);
          const finalAuth = isBiometric && checkOut ? `${existing.authMethod} + Logbook` : (existing.authMethod || authMethod || "Physical Logbook");

          savedLog = await db.attendanceLog.update({
            where: { id: existing.id, clinicId },
            data: {
              checkIn: finalCheckIn,
              checkOut: finalCheckOut,
              ...(status && !isBiometric && { status }),
              ...(overtimeHours !== undefined && { overtimeHours: Number(overtimeHours) }),
              ...(noPayHours !== undefined && { noPayHours: Number(noPayHours) }),
              authMethod: finalAuth,
            },
            include: { employee: true },
          });
        } else {
          // Overwrite mode
          savedLog = await db.attendanceLog.update({
            where: { id: existing.id, clinicId },
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
        }
      } else {
        const isNonWorking = status === "On-Leave" || status === "Absent" || status === "Holiday" || status === "Clinic Closed";
        const finalCheckIn = checkIn && checkIn.trim() !== "" ? checkIn : (isNonWorking ? "--:--:--" : "08:30:00");
        const finalCheckOut = isNonWorking ? null : (checkOut || null);
        const finalOt = isNonWorking ? 0 : (Number(overtimeHours) || 0);

        savedLog = await db.attendanceLog.create({
          data: {
            clinicId,
            employeeId: dbEmp.id,
            date: logDate,
            checkIn: finalCheckIn,
            checkOut: finalCheckOut,
            status: status || "On-Time",
            overtimeHours: finalOt,
            noPayHours: Number(noPayHours) || 0,
            authMethod: authMethod || "Physical Logbook",
          },
          include: { employee: true },
        });
      }
      if (savedLog) {
        savedLogs.push(savedLog);
      }
    }

    if (Array.isArray(body.logs)) {
      return NextResponse.json({ success: true, count: savedLogs.length, logs: savedLogs });
    }

    return NextResponse.json({ success: true, log: savedLogs[0] });
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
    const clinicId = await getClinicId(req);

    const log = await db.attendanceLog.update({
      where: { id, clinicId },
      data: {
        ...(checkIn !== undefined && { checkIn }),
        ...(checkOut !== undefined && { checkOut }),
        ...(status !== undefined && { status }),
        ...(overtimeHours !== undefined && { overtimeHours: Number(overtimeHours) }),
        ...(noPayHours !== undefined && { noPayHours: Number(noPayHours) }),
      },
    });

    return NextResponse.json({ success: true, log });
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
    const clinicId = await getClinicId(req);

    await db.attendanceLog.delete({
      where: { id, clinicId },
    });

    return NextResponse.json({ success: true, message: "Attendance log deleted" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting log";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
