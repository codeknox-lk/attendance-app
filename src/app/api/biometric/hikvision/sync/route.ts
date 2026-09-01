import { NextRequest, NextResponse } from "next/server";
import { syncHikvisionDeviceMemory } from "@/lib/hikvisionSync";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = body.ip || "192.168.8.135";
    const port = parseInt(body.port || "80");
    const username = body.username || "admin";
    const password = body.password || "";

    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const syncResult = await syncHikvisionDeviceMemory(ip, port, username, password, clinicId);

    const logs = await db.attendanceLog.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { employee: true },
    });

    return NextResponse.json({
      success: true,
      message: `Machine at ${ip} memory synchronized successfully`,
      syncResult,
      logsCount: logs.length,
      logs,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Memory sync failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip") || "192.168.8.135";
    const port = parseInt(searchParams.get("port") || "80");

    const clinicId = req.headers.get("x-clinic-id");
    if (!clinicId) return NextResponse.json({ success: false, error: "Missing x-clinic-id header" }, { status: 400 });

    const syncResult = await syncHikvisionDeviceMemory(ip, port, "admin", "", clinicId);

    const logs = await db.attendanceLog.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { employee: true },
    });

    return NextResponse.json({
      success: true,
      syncResult,
      logsCount: logs.length,
      logs,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
