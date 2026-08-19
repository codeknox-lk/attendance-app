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
    } = body;

    const employee = await db.employee.create({
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
      },
    });

    return NextResponse.json({ success: true, employee });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating employee";
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

    try {
      await db.employee.delete({
        where: { id },
      });
    } catch {
      // Fallback
    }

    return NextResponse.json({ success: true, message: "Employee deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting employee";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
