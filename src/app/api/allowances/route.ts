export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";

export async function GET(req: NextRequest) {
  try {
    const clinicId = await getClinicId(req);

    const allowances = await db.allowance.findMany({ where: { clinicId } });
    const employeeAllowances = await db.employeeAllowance.findMany({
      where: { employee: { clinicId } }
    });
    return NextResponse.json({ success: true, allowances, employeeAllowances });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching allowances";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clinicId = await getClinicId(req);

    // Support Employee Allowance Assignment
    if (body.action === "assign") {
      const { employeeId, allowanceId, overrideAmount } = body;
      if (!employeeId || !allowanceId) {
        return NextResponse.json({ success: false, error: "employeeId and allowanceId are required" }, { status: 400 });
      }
      await db.employeeAllowance.deleteMany({
        where: { employeeId, allowanceId },
      });
      const ea = await db.employeeAllowance.create({
        data: {
          employeeId,
          allowanceId,
          overrideAmount: overrideAmount !== undefined && overrideAmount !== null ? Number(overrideAmount) : null,
        },
      });
      return NextResponse.json({ success: true, employeeAllowance: ea });
    }

    // Support Employee Allowance Removal
    if (body.action === "remove") {
      const { employeeId, allowanceId } = body;
      await db.employeeAllowance.deleteMany({
        where: { employeeId, allowanceId },
      });
      return NextResponse.json({ success: true });
    }

    const { name, amount, type, isTaxable, taxDeductible, epfApplicable } = body;

    const allowance = await db.allowance.create({
      data: {
        clinicId,
        name,
        amount: Number(amount) || 0,
        type: type || "Monthly",
        isTaxable: taxDeductible !== undefined ? !taxDeductible : (isTaxable ?? false),
        epfApplicable: Boolean(epfApplicable),
      },
    });

    return NextResponse.json({ success: true, allowance });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating allowance";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, amount, type, isTaxable, taxDeductible, epfApplicable } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Allowance ID required" }, { status: 400 });
    }
    const clinicId = await getClinicId(req);

    const target = await db.allowance.findFirst({ where: { id, clinicId } });
    if (!target) {
      return NextResponse.json({ success: false, error: "Allowance not found" }, { status: 404 });
    }

    const allowance = await db.allowance.update({
      where: { id: target.id },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(type !== undefined && { type }),
        ...(taxDeductible !== undefined ? { isTaxable: !taxDeductible } : (isTaxable !== undefined ? { isTaxable: Boolean(isTaxable) } : {})),
        ...(epfApplicable !== undefined && { epfApplicable: Boolean(epfApplicable) }),
      },
    });

    return NextResponse.json({ success: true, allowance });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error updating allowance";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Allowance ID required" }, { status: 400 });
    }
    const clinicId = await getClinicId(req);

    const target = await db.allowance.findFirst({ where: { id, clinicId } });
    if (!target) {
      return NextResponse.json({ success: false, error: "Allowance not found" }, { status: 404 });
    }

    await db.allowance.delete({
      where: { id: target.id },
    });

    return NextResponse.json({ success: true, message: "Allowance deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting allowance";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
