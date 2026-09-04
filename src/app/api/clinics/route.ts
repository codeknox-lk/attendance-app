import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) return NextResponse.json({ success: false, error: "Clinic not found" }, { status: 404 });

    return NextResponse.json({ success: true, clinic });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch clinic settings";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const body = await req.json();

    const clinic = await db.clinic.update({
      where: { id: clinicId },
      data: {
        name: body.name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        logoUrl: body.logoUrl !== undefined ? body.logoUrl : undefined,
        epfRegNo: body.epfRegNo,
        etfRegNo: body.etfRegNo,
        epfEmployeeRate: body.epfEmployeeRate !== undefined ? Number(body.epfEmployeeRate) : undefined,
        epfEmployerRate: body.epfEmployerRate !== undefined ? Number(body.epfEmployerRate) : undefined,
        etfRate: body.etfRate !== undefined ? Number(body.etfRate) : undefined,
        workingDaysPerMonth: body.workingDaysPerMonth !== undefined ? Number(body.workingDaysPerMonth) : undefined,
        globalWorkedDayBonus: body.globalWorkedDayBonus !== undefined ? Number(body.globalWorkedDayBonus) : undefined,
        globalPunctualBonus: body.globalPunctualBonus !== undefined ? Number(body.globalPunctualBonus) : undefined,
        globalIncomeBonusPct: body.globalIncomeBonusPct !== undefined ? Number(body.globalIncomeBonusPct) : undefined,
        otCalculationType: body.otCalculationType !== undefined ? body.otCalculationType : undefined,
        otGracePeriodMinutes: body.otGracePeriodMinutes !== undefined ? Number(body.otGracePeriodMinutes) : undefined,
        otRateBasis: body.otRateBasis !== undefined ? body.otRateBasis : undefined,
        otMultiplier: body.otMultiplier !== undefined ? Number(body.otMultiplier) : undefined,
        punctualGraceType: body.punctualGraceType !== undefined ? body.punctualGraceType : undefined,
        punctualGraceMinutes: body.punctualGraceMinutes !== undefined ? Number(body.punctualGraceMinutes) : undefined,
      },
    });

    return NextResponse.json({ success: true, clinic });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update clinic settings";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
