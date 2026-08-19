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
    const { name, startTime, endTime, graceMins } = body;

    const shift = await db.shift.create({
      data: {
        name,
        startTime: startTime || "08:30",
        endTime: endTime || "17:00",
        gracePeriod: Number(graceMins) || 15,
        overtimeStart: endTime || "17:00",
      },
    });

    return NextResponse.json({ success: true, shift });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating shift";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
