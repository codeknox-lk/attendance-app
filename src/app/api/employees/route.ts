export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";

export async function GET(req: NextRequest) {
  try {
    const clinicId = await getClinicId(req);

    const employees = await db.employee.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" }, include: { customOperatingHours: true }
    });
    return NextResponse.json({ success: true, employees });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching employees";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      role,
      payType,
      basicSalary,
      hourlyRate,
      sessionRate,
      commissionRate,
      biometricId,
      epfEligible,
      taxable,
      attendanceBonusRate,
      punctualBonusRate,
      incomeBonusPercentage,
      customOperatingHours,
    } = body;

    const clinicId = await getClinicId(req);

    const existing = await db.employee.findFirst({
      where: { biometricId: String(biometricId), clinicId },
    });

    let employee = null;
    if (existing) {
      employee = await db.employee.update({
        where: { id: existing.id, clinicId },
        data: {
          firstName,
          lastName: lastName || "",
          role: role || "Doctor",
          payType: payType || "Fixed Monthly",
          basicSalary: Number(basicSalary) || 0,
          hourlyRate: Number(hourlyRate) || 0,
          sessionRate: Number(sessionRate) || 0,
          commissionRate: Number(commissionRate) || 0,
          epfEligible: epfEligible ?? true,
          taxable: taxable ?? false,
          attendanceBonusRate: attendanceBonusRate !== undefined ? Number(attendanceBonusRate) : undefined,
          punctualBonusRate: punctualBonusRate !== undefined ? Number(punctualBonusRate) : undefined,
          incomeBonusPercentage: incomeBonusPercentage !== undefined ? Number(incomeBonusPercentage) : undefined,
        },
      });
      if (customOperatingHours && Array.isArray(customOperatingHours)) {
        await db.employeeOperatingHours.deleteMany({ where: { employeeId: existing.id } });
        for (const h of customOperatingHours) {
          await db.employeeOperatingHours.create({ data: { employeeId: existing.id, dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime } });
        }
      }
    } else {
      employee = await db.employee.create({
        data: {
          clinicId,
          firstName,
          lastName: lastName || "",
          role: role || "Doctor",
          payType: payType || "Fixed Monthly",
          basicSalary: Number(basicSalary) || 0,
          hourlyRate: Number(hourlyRate) || 0,
          sessionRate: Number(sessionRate) || 0,
          commissionRate: Number(commissionRate) || 0,
          biometricId: String(biometricId),
          epfEligible: epfEligible ?? true,
          taxable: taxable ?? false,
          attendanceBonusRate: attendanceBonusRate !== undefined ? Number(attendanceBonusRate) : 0,
          punctualBonusRate: punctualBonusRate !== undefined ? Number(punctualBonusRate) : 0,
          incomeBonusPercentage: incomeBonusPercentage !== undefined ? Number(incomeBonusPercentage) : 0,
        },
      });
      if (customOperatingHours && Array.isArray(customOperatingHours)) {
        for (const h of customOperatingHours) {
          await db.employeeOperatingHours.create({ data: { employeeId: employee.id, dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime } });
        }
      }
    }

    return NextResponse.json({ success: true, employee });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating employee";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      firstName,
      lastName,
      role,
      payType,
      basicSalary,
      hourlyRate,
      sessionRate,
      commissionRate,
      biometricId,
      epfEligible,
      taxable,
      active,
      attendanceBonusRate,
      punctualBonusRate,
      incomeBonusPercentage,
      customOperatingHours,
    } = body;

    const clinicId = await getClinicId(req);

    if (!id && !biometricId) {
      return NextResponse.json({ success: false, error: "Employee ID or Biometric ID is required" }, { status: 400 });
    }

    let target = null;
    if (id) {
      target = await db.employee.findUnique({ where: { id } }).catch(() => null);
      if (target && target.clinicId !== clinicId) target = null;
    }
    if (!target && biometricId) {
      target = await db.employee.findFirst({ where: { biometricId: String(biometricId), clinicId } });
    }
    if (!target && id) {
      target = await db.employee.findFirst({ where: { biometricId: String(id), clinicId } });
    }

    let employee = null;
    if (target) {
      employee = await db.employee.update({
        where: { id: target.id },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(role !== undefined && { role }),
          ...(payType !== undefined && { payType }),
          ...(basicSalary !== undefined && { basicSalary: Number(basicSalary) }),
          ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
          ...(sessionRate !== undefined && { sessionRate: Number(sessionRate) }),
          ...(commissionRate !== undefined && { commissionRate: Number(commissionRate) }),
          ...(biometricId !== undefined && { biometricId: String(biometricId) }),
          ...(epfEligible !== undefined && { epfEligible: Boolean(epfEligible) }),
          ...(taxable !== undefined && { taxable: Boolean(taxable) }),
          ...(active !== undefined && { active: Boolean(active) }),
          ...(attendanceBonusRate !== undefined && { attendanceBonusRate: Number(attendanceBonusRate) }),
          ...(punctualBonusRate !== undefined && { punctualBonusRate: Number(punctualBonusRate) }),
          ...(incomeBonusPercentage !== undefined && { incomeBonusPercentage: Number(incomeBonusPercentage) }),
        },
      });
      if (customOperatingHours && Array.isArray(customOperatingHours)) {
        await db.employeeOperatingHours.deleteMany({ where: { employeeId: employee.id } });
        for (const h of customOperatingHours) {
          await db.employeeOperatingHours.create({ data: { employeeId: employee.id, dayOfWeek: h.dayOfWeek, isOpen: h.isOpen, startTime: h.startTime, endTime: h.endTime } });
        }
      }
    } else {
      employee = await db.employee.create({
        data: {
          clinicId,
          firstName: firstName || "Staff",
          lastName: lastName || "",
          role: role || "Nurse",
          payType: payType || "Fixed Monthly",
          basicSalary: Number(basicSalary) || 60000,
          hourlyRate: Number(hourlyRate) || 350,
          sessionRate: Number(sessionRate) || 0,
          commissionRate: Number(commissionRate) || 0,
          biometricId: String(biometricId || "1"),
          epfEligible: epfEligible ?? true,
          taxable: taxable ?? false,
          active: active ?? true,
          attendanceBonusRate: attendanceBonusRate !== undefined ? Number(attendanceBonusRate) : 0,
          punctualBonusRate: punctualBonusRate !== undefined ? Number(punctualBonusRate) : 0,
          incomeBonusPercentage: incomeBonusPercentage !== undefined ? Number(incomeBonusPercentage) : 0,
        },
      });
    }

    return NextResponse.json({ success: true, employee });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error updating employee";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const clinicId = await getClinicId(req);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Employee ID is required" }, { status: 400 });
    }

    let target = await db.employee.findUnique({ where: { id } }).catch(() => null);
    if (target && target.clinicId !== clinicId) target = null;

    if (!target) {
      target = await db.employee.findFirst({ where: { biometricId: String(id), clinicId } });
    }

    if (target) {
      await db.employee.delete({
        where: { id: target.id },
      });
    }

    return NextResponse.json({ success: true, message: "Employee deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting employee";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
