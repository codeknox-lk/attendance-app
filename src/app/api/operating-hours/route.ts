import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get("clinicId") || "default-clinic-id";

    const hours = await db.clinicOperatingHours.findMany({
      where: { clinicId },
      orderBy: { dayOfWeek: "asc" }
    });
    
    // If empty, initialize defaults
    if (hours.length === 0) {
      const defaultHours = [];
      for (let i = 0; i < 7; i++) {
        defaultHours.push({
          clinicId,
          dayOfWeek: i,
          isOpen: i !== 0, // Sunday closed by default
          startTime: "08:30",
          endTime: "17:00"
        });
      }
      
      await db.clinicOperatingHours.createMany({
        data: defaultHours
      });
      
      const newHours = await db.clinicOperatingHours.findMany({
        where: { clinicId },
        orderBy: { dayOfWeek: "asc" }
      });
      return NextResponse.json({ success: true, operatingHours: newHours });
    }

    return NextResponse.json({ success: true, operatingHours: hours });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clinicId = "default-clinic-id", operatingHours } = body;

    // We expect operatingHours to be an array of exactly 7 objects (0-6)
    if (!Array.isArray(operatingHours) || operatingHours.length !== 7) {
      return NextResponse.json({ success: false, error: "Invalid operating hours format" }, { status: 400 });
    }

    // Upsert each day
    const updated = await Promise.all(
      operatingHours.map((h: any) => 
        db.clinicOperatingHours.upsert({
          where: {
            clinicId_dayOfWeek: {
              clinicId,
              dayOfWeek: h.dayOfWeek
            }
          },
          update: {
            isOpen: h.isOpen,
            startTime: h.startTime,
            endTime: h.endTime
          },
          create: {
            clinicId,
            dayOfWeek: h.dayOfWeek,
            isOpen: h.isOpen,
            startTime: h.startTime,
            endTime: h.endTime
          }
        })
      )
    );

    return NextResponse.json({ success: true, operatingHours: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
