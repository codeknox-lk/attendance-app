import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";

export async function GET(req: NextRequest) {
  try {
    const clinicId = await getClinicId(req);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    let whereClause: any = { clinicId };
    if (month) whereClause.month = month;

    const payrolls = await db.payrollPeriod.findMany({
      where: whereClause,
      orderBy: { month: "desc" },
    });
    return NextResponse.json({ success: true, payrolls });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch payrolls";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const clinicId = await getClinicId(req);

    const body = await req.json();
    const { month, label, grossSalaryPool, netRemittances, totalEpf, totalEtf, totalApit, employeeCount } = body;

    if (!month || !label) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const payroll = await db.payrollPeriod.create({
      data: {
        clinicId,
        month,
        label,
        grossSalaryPool: Number(grossSalaryPool) || 0,
        netRemittances: Number(netRemittances) || 0,
        totalEpf: Number(totalEpf) || 0,
        totalEtf: Number(totalEtf) || 0,
        totalApit: Number(totalApit) || 0,
        employeeCount: Number(employeeCount) || 0,
      },
    });
    return NextResponse.json({ success: true, payroll });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create payroll";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
