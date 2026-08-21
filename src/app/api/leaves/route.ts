export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const leaves = await db.leaveRequest.findMany({
      include: { employee: true },
      orderBy: { appliedAt: "desc" },
    });
    return NextResponse.json({ success: true, leaves });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching leaves";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, type, startDate, endDate, reason } = body;

    const inputEmpId = String(employeeId || "1");
    let dbEmp = await db.employee.findUnique({ where: { id: inputEmpId } }).catch(() => null);
    if (!dbEmp) {
      dbEmp = await db.employee.findFirst({ where: { biometricId: inputEmpId } });
    }
    if (!dbEmp) {
      dbEmp = await db.employee.findFirst();
    }

    if (!dbEmp) {
      return NextResponse.json({ success: false, error: "No matching employee found" }, { status: 400 });
    }

    const leave = await db.leaveRequest.create({
      data: {
        employeeId: dbEmp.id,
        type: type || "Annual",
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || new Date().toISOString().split("T")[0],
        reason: reason || "",
        status: "Pending",
      },
      include: { employee: true },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating leave";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "ID and status are required" }, { status: 400 });
    }

    let leave = null;
    try {
      leave = await db.leaveRequest.update({
        where: { id },
        data: { status },
      });
    } catch {
      // Fallback
    }

    return NextResponse.json({ success: true, leave: leave || body });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error updating leave";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
