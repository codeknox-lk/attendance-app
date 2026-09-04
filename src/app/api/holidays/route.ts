import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSriLankanHolidaysForYear } from "@/lib/holidays";

export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    let holidays = await db.publicHoliday.findMany({
      where: { clinicId },
      orderBy: { date: "asc" },
    });

    // Auto-seed official 2026 gazette if clinic has no holidays configured yet
    if (holidays.length === 0) {
      const defaults = await getSriLankanHolidaysForYear(2026);
      await db.publicHoliday.createMany({
        data: defaults.map(h => ({
          clinicId,
          date: h.date,
          name: h.name,
          isDoubleOT: h.isDoubleOT,
        })),
        skipDuplicates: true,
      });

      holidays = await db.publicHoliday.findMany({
        where: { clinicId },
        orderBy: { date: "asc" },
      });
    }

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

    // Batch Auto-Sync Action for Sri Lanka Holidays (e.g. 2026, 2027, 2028+)
    if (body.action === "sync") {
      const targetYear = Number(body.year) || new Date().getFullYear();
      const yearHolidays = await getSriLankanHolidaysForYear(targetYear);

      for (const h of yearHolidays) {
        const existing = await db.publicHoliday.findFirst({
          where: { clinicId, date: h.date },
        });
        if (!existing) {
          await db.publicHoliday.create({
            data: {
              clinicId,
              date: h.date,
              name: h.name,
              isDoubleOT: h.isDoubleOT,
            },
          });
        }
      }

      const allHolidays = await db.publicHoliday.findMany({
        where: { clinicId },
        orderBy: { date: "asc" },
      });
      return NextResponse.json({ success: true, holidays: allHolidays, syncedCount: yearHolidays.length, year: targetYear });
    }

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
    const errorMessage = error instanceof Error ? error.message : "Failed to process holiday request";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const body = await req.json();
    const { id, isDoubleOT } = body;

    if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

    const holiday = await db.publicHoliday.update({
      where: { id, clinicId },
      data: {
        isDoubleOT: Boolean(isDoubleOT),
      },
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update holiday";
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
