import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const whereClause = date ? { date } : {};
    let logs: unknown[] = [];
    try {
      logs = await db.attendanceLog.findMany({
        where: whereClause,
        include: { employee: true },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Fallback if db empty
    }

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching logs";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, date, checkIn, checkOut, status, overtimeHours, noPayHours } = body;

    const log = await db.attendanceLog.create({
      data: {
        employeeId,
        date: date || new Date().toISOString().split("T")[0],
        checkIn: checkIn || "08:30:00",
        checkOut: checkOut || null,
        status: status || "On-Time",
        overtimeHours: overtimeHours || 0,
        noPayHours: noPayHours || 0,
        authMethod: "Manual",
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating log";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
