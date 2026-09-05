export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    const clinicId = await getClinicId(req);

    let whereClause: any = { clinicId };
    if (date) {
      whereClause.date = date;
    } else if (month) {
      whereClause.date = { startsWith: month };
    }

    const logs = await db.attendanceLog.findMany({
      where: whereClause,
      include: { employee: true },
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
    const { employeeId, date, checkIn, checkOut, status, overtimeHours, noPayHours, authMethod } = body;

    const inputEmpId = String(employeeId || "1");
    const logDate = date || new Date().toISOString().split("T")[0];

    const clinicId = await getClinicId(req);

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
      where: { employeeId: dbEmp.id, date: logDate, clinicId },
    });

    let savedLog = null;
    if (existing) {
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
    } else {
      savedLog = await db.attendanceLog.create({
        data: {
          clinicId,
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
