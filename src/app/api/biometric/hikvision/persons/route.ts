import { NextRequest, NextResponse } from "next/server";
import { fetchHikvisionPersons, fetchHikvisionDeviceInfo } from "@/lib/hikvision";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip") || "192.168.8.135";
    const port = parseInt(searchParams.get("port") || "80");
    const username = searchParams.get("username") || "admin";
    const password = searchParams.get("password") || "";

    const [persons, deviceInfo] = await Promise.all([
      fetchHikvisionPersons(ip, port, username, password),
      fetchHikvisionDeviceInfo(ip, port, username, password),
    ]);

    return NextResponse.json({
      success: true,
      deviceInfo,
      persons,
      count: persons.length,
      capacity: "500",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch machine persons";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
