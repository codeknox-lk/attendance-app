import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const holidays = await db.publicHoliday.findMany({
      where: { clinicId },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ success: true, holidays });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch holidays";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const body = await req.json();
    const { date, name, isDoubleOT } = body;

    if (!date || !name) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const holiday = await db.publicHoliday.create({
      data: {
        clinicId,
        date,
        name,
        isDoubleOT: Boolean(isDoubleOT),
      },
    });
    return NextResponse.json({ success: true, holiday });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create holiday";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    await db.publicHoliday.delete({
      where: { id, clinicId },
    });

    return NextResponse.json({ success: true, message: "Holiday deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete holiday";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
