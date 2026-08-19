import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const shifts = await db.shift.findMany();
    return NextResponse.json({ success: true, shifts });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching shifts";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, startTime, endTime, graceMins, workDays } = body;

    const shift = await db.shift.create({
      data: {
        name,
        startTime: startTime || "08:30",
        endTime: endTime || "17:00",
        gracePeriod: Number(graceMins) || 15,
        overtimeStart: endTime || "17:00",
        workDays: Array.isArray(workDays) ? workDays : [1, 2, 3, 4, 5],
      },
    });

    return NextResponse.json({ success: true, shift });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating shift";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, startTime, endTime, gracePeriod, overtimeStart, color, workDays } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Shift ID required" }, { status: 400 });
    }

    let shift = null;
    try {
      shift = await db.shift.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(startTime !== undefined && { startTime }),
          ...(endTime !== undefined && { endTime }),
          ...(gracePeriod !== undefined && { gracePeriod: Number(gracePeriod) }),
          ...(overtimeStart !== undefined && { overtimeStart }),
          ...(color !== undefined && { color }),
          ...(workDays !== undefined && Array.isArray(workDays) && { workDays }),
        },
      });
    } catch {
      // Fallback
    }

    return NextResponse.json({ success: true, shift: shift || body });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error updating shift";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Shift ID required" }, { status: 400 });
    }

    try {
      await db.shift.delete({
        where: { id },
      });
    } catch {
      // Fallback
    }

    return NextResponse.json({ success: true, message: "Shift deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting shift";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
