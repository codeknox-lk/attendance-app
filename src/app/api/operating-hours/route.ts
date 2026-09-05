import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";

export async function GET(req: Request) {
  try {
    const clinicId = await getClinicId(req);

    let hours = await db.clinicOperatingHours.findMany({
      where: { clinicId },
      orderBy: { dayOfWeek: "asc" },
    });

    // If no hours found for this specific clinicId, check if any exist in DB
    if (hours.length === 0) {
      hours = await db.clinicOperatingHours.findMany({
        orderBy: { dayOfWeek: "asc" },
        take: 7,
      });
    }

    // If still empty, initialize standard clinic hours
    if (hours.length === 0) {
      const defaultHours = [];
      for (let i = 0; i < 7; i++) {
        defaultHours.push({
          clinicId,
          dayOfWeek: i,
          isOpen: i !== 1, // Monday closed by default
          startTime: i === 0 ? "07:30" : i === 6 ? "13:00" : "15:30",
          endTime: i === 0 ? "14:00" : "19:00",
        });
      }

      await db.clinicOperatingHours.createMany({
        data: defaultHours,
        skipDuplicates: true,
      });

      hours = await db.clinicOperatingHours.findMany({
        where: { clinicId },
        orderBy: { dayOfWeek: "asc" },
      });
    }

    return NextResponse.json({ success: true, operatingHours: hours });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch operating hours";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

interface IncomingHour {
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clinicId = await getClinicId(req);
    const { operatingHours } = body;

    // We expect operatingHours to be an array of exactly 7 objects (0-6)
    if (!Array.isArray(operatingHours) || operatingHours.length !== 7) {
      return NextResponse.json({ success: false, error: "Invalid operating hours format" }, { status: 400 });
    }

    // Upsert each day
    const updated = await Promise.all(
      operatingHours.map((h: IncomingHour) =>
        db.clinicOperatingHours.upsert({
          where: {
            clinicId_dayOfWeek: {
              clinicId,
              dayOfWeek: h.dayOfWeek,
            },
          },
          update: {
            isOpen: h.isOpen,
            startTime: h.startTime,
            endTime: h.endTime,
          },
          create: {
            clinicId,
            dayOfWeek: h.dayOfWeek,
            isOpen: h.isOpen,
            startTime: h.startTime,
            endTime: h.endTime,
          },
        })
      )
    );

    // Recalculate overtime for all existing attendance logs that have a checkout
    let recalculatedCount = 0;
    try {
      const clinic = await db.clinic.findUnique({
        where: { id: clinicId },
        select: { otCalculationType: true, otGracePeriodMinutes: true },
      });

      const otType = clinic?.otCalculationType || "Strict";
      const otGrace = clinic?.otGracePeriodMinutes ?? 30;

      if (otType !== "Manual" && otType !== "Disabled") {
        const logs = await db.attendanceLog.findMany({
          where: {
            clinicId,
            checkOut: { not: null },
          },
        });

        for (const log of logs) {
          if (!log.checkOut || log.checkOut === "–" || log.checkOut.toLowerCase().includes("active")) continue;

          const logDate = new Date(log.date + "T00:00:00Z");
          const dayOfWeek = logDate.getUTCDay();
          const daySchedule = updated.find(h => h.dayOfWeek === dayOfWeek);

          const [outH, outM] = log.checkOut.split(":").map(Number);
          if (isNaN(outH) || isNaN(outM)) continue;
          const outMinutes = outH * 60 + outM;

          let newOt = 0;
          if (!daySchedule || !daySchedule.isOpen) {
            // Closed/off-day: all worked hours count as overtime
            if (log.checkIn && log.checkIn !== "–" && !log.checkIn.toLowerCase().includes("active")) {
              const [inH, inM] = log.checkIn.split(":").map(Number);
              if (!isNaN(inH) && !isNaN(inM)) {
                let workedMin = outMinutes - (inH * 60 + inM);
                if (workedMin < 0) workedMin += 24 * 60;
                newOt = Math.round((workedMin / 60) * 100) / 100;
              }
            }
          } else {
            // Open day: hours past shift closing
            const [endH, endM] = daySchedule.endTime.split(":").map(Number);
            if (!isNaN(endH) && !isNaN(endM)) {
              const shiftEndMin = endH * 60 + endM;
              if (otType === "Strict" && outMinutes > shiftEndMin) {
                newOt = Math.round(((outMinutes - shiftEndMin) / 60) * 100) / 100;
              } else if (otType === "Grace Period" && outMinutes > shiftEndMin + otGrace) {
                newOt = Math.round(((outMinutes - shiftEndMin) / 60) * 100) / 100;
              }
            }
          }

          if (log.overtimeHours !== newOt) {
            await db.attendanceLog.update({
              where: { id: log.id },
              data: { overtimeHours: newOt },
            });
            recalculatedCount++;
          }
        }
      }
    } catch (recalcErr) {
      console.error("[OPERATING_HOURS] Error recalculating log overtime:", recalcErr);
    }

    return NextResponse.json({
      success: true,
      operatingHours: updated,
      recalculatedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update operating hours";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
