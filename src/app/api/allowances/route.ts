export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

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
    const { name, amount, type, isTaxable, taxDeductible } = body;
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const allowance = await db.allowance.create({
      data: {
        clinicId,
        name,
        amount: Number(amount) || 0,
        type: type || "Monthly",
        isTaxable: taxDeductible !== undefined ? !taxDeductible : (isTaxable ?? false),
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
    const { id, name, amount, type, isTaxable, epfApplicable } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Allowance ID required" }, { status: 400 });
    }
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const allowance = await db.allowance.update({
      where: { id, clinicId },
      data: {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(type !== undefined && { type }),
        ...(isTaxable !== undefined && { isTaxable }),
        ...(epfApplicable !== undefined && { epfApplicable }),
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
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    await db.allowance.delete({
      where: { id, clinicId },
    });

    return NextResponse.json({ success: true, message: "Allowance deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting allowance";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
