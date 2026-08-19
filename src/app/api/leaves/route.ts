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

    const leave = await db.leaveRequest.create({
      data: {
        employeeId,
        type: type || "Annual",
        startDate,
        endDate,
        reason: reason || "Personal",
        status: "Pending",
      },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating leave request";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    const leave = await db.leaveRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, leave });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error updating leave request";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
