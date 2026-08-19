import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      orderBy: { createdAt: "desc" },
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
      shiftIds,
      attendanceBonusRate,
      punctualBonusRate,
      incomeBonusPercentage,
    } = body;

    const existing = await db.employee.findFirst({
      where: { biometricId: String(biometricId) },
    });

    let employee = null;
    if (existing) {
      employee = await db.employee.update({
        where: { id: existing.id },
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
          shiftIds: Array.isArray(shiftIds) ? shiftIds : [],
          attendanceBonusRate: Number(attendanceBonusRate) || 0,
          punctualBonusRate: Number(punctualBonusRate) || 0,
          incomeBonusPercentage: Number(incomeBonusPercentage) || 0,
        },
      });
    } else {
      employee = await db.employee.create({
        data: {
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
          shiftIds: Array.isArray(shiftIds) ? shiftIds : [],
          attendanceBonusRate: Number(attendanceBonusRate) || 0,
          punctualBonusRate: Number(punctualBonusRate) || 0,
          incomeBonusPercentage: Number(incomeBonusPercentage) || 0,
        },
      });
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
      shiftIds,
      attendanceBonusRate,
      punctualBonusRate,
      incomeBonusPercentage,
    } = body;

    if (!id && !biometricId) {
      return NextResponse.json({ success: false, error: "Employee ID or Biometric ID is required" }, { status: 400 });
    }

    let target = null;
    if (id) {
      target = await db.employee.findUnique({ where: { id } }).catch(() => null);
    }
    if (!target && biometricId) {
      target = await db.employee.findFirst({ where: { biometricId: String(biometricId) } });
    }
    if (!target && id) {
      target = await db.employee.findFirst({ where: { biometricId: String(id) } });
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
          ...(shiftIds !== undefined && Array.isArray(shiftIds) && { shiftIds }),
        },
      });
    } else {
      employee = await db.employee.create({
        data: {
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
          shiftIds: Array.isArray(shiftIds) ? shiftIds : [],
          attendanceBonusRate: Number(attendanceBonusRate) || 0,
          punctualBonusRate: Number(punctualBonusRate) || 0,
          incomeBonusPercentage: Number(incomeBonusPercentage) || 0,
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Employee ID is required" }, { status: 400 });
    }

    let target = await db.employee.findUnique({ where: { id } }).catch(() => null);
    if (!target) {
      target = await db.employee.findFirst({ where: { biometricId: String(id) } });
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
