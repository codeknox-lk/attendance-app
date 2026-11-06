import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const clinicId = await getClinicId(req);

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const whereClause: Prisma.PayrollPeriodWhereInput = { clinicId };
    if (month) whereClause.month = month;

    const payrolls = await db.payrollPeriod.findMany({
      where: whereClause,
      orderBy: { month: "desc" },
      include: { slips: true },
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
    const { month, label, grossSalaryPool, netRemittances, totalEpf, totalEtf, totalApit, employeeCount, slips } = body;

    if (!month || !label) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const existing = await db.payrollPeriod.findFirst({
      where: { clinicId, month },
    });

    let payroll;
    if (existing) {
      payroll = await db.payrollPeriod.update({
        where: { id: existing.id },
        data: {
          label,
          status: "Finalized",
          finalizedAt: new Date(),
          grossSalaryPool: Number(grossSalaryPool) || 0,
          netRemittances: Number(netRemittances) || 0,
          totalEpf: Number(totalEpf) || 0,
          totalEtf: Number(totalEtf) || 0,
          totalApit: Number(totalApit) || 0,
          employeeCount: Number(employeeCount) || 0,
        },
      });
    } else {
      payroll = await db.payrollPeriod.create({
        data: {
          clinicId,
          month,
          label,
          status: "Finalized",
          finalizedAt: new Date(),
          grossSalaryPool: Number(grossSalaryPool) || 0,
          netRemittances: Number(netRemittances) || 0,
          totalEpf: Number(totalEpf) || 0,
          totalEtf: Number(totalEtf) || 0,
          totalApit: Number(totalApit) || 0,
          employeeCount: Number(employeeCount) || 0,
        },
      });
    }

    if (slips && Array.isArray(slips) && slips.length > 0) {
      await db.payrollSlip.deleteMany({ where: { payrollPeriodId: payroll.id } });
      for (const s of slips) {
        if (!s.employeeId) continue;
        await db.payrollSlip.create({
          data: {
            payrollPeriodId: payroll.id,
            employeeId: s.employeeId,
            employeeName: s.employeeName || "Staff Member",
            employeeRole: s.employeeRole || "Staff",
            biometricId: String(s.biometricId || ""),
            payType: s.payType || "Fixed Monthly",
            basicSalary: Number(s.basicSalary) || 0,
            otHours: Number(s.otHours) || 0,
            otPay: Number(s.otPay) || 0,
            totalAllowances: Number(s.totalAllowances) || 0,
            noPayDays: Number(s.noPayDays) || 0,
            noPayDeduction: Number(s.noPayDeduction) || 0,
            manualBonus: Number(s.manualBonus) || 0,
            manualDeduction: Number(s.manualDeduction) || 0,
            workedDaysBonus: Number(s.workedDaysBonus) || 0,
            punctualBonus: Number(s.punctualBonus) || 0,
            exceedBonus: Number(s.exceedBonus) || 0,
            employeeEpf: Number(s.employeeEpf) || 0,
            employerEpf: Number(s.employerEpf) || 0,
            employerEtf: Number(s.employerEtf) || 0,
            apit: Number(s.apit) || 0,
            grossSalary: Number(s.grossSalary) || 0,
            netSalary: Number(s.netSalary) || 0,
            workedSessions: Number(s.workedSessions) || 0,
            punctualSessions: Number(s.punctualSessions) || 0,
          },
        });
      }
    }

    const finalizedPayroll = await db.payrollPeriod.findUnique({
      where: { id: payroll.id },
      include: { slips: true },
    });

    return NextResponse.json({ success: true, payroll: finalizedPayroll || payroll });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create payroll";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
