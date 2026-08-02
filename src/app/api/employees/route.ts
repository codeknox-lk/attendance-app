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
        lastName,
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
