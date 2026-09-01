import { NextRequest, NextResponse } from "next/server";
import { fetchHikvisionPersons, fetchHikvisionDeviceInfo } from "@/lib/hikvision";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ip = searchParams.get("ip") || "192.168.8.135";
    const port = parseInt(searchParams.get("port") || "80");
    const username = searchParams.get("username") || "admin";
    const password = searchParams.get("password") || "";

    let persons = await fetchHikvisionPersons(ip, port, username, password);
    const deviceInfo = await fetchHikvisionDeviceInfo(ip, port, username, password);

      const [dbEmployees, dbLogs] = await Promise.all([
        db.employee.findMany(),
        db.attendanceLog.findMany({ include: { employee: true } }),
      ]);

      const mergedMap = new Map();

      persons.forEach(p => mergedMap.set(String(p.employeeNo), p));

      dbEmployees.forEach(emp => {
        const bId = String(emp.biometricId);
        if (bId && !mergedMap.has(bId)) {
          mergedMap.set(bId, {
            employeeNo: bId,
            name: `${emp.firstName} ${emp.lastName}`.trim() || `User #${bId}`,
            userType: "normal",
            numOfFace: 1,
            numOfFingerprint: 1,
            numOfCard: 0,
          });
        }
      });

      dbLogs.forEach(log => {
        const bId = String(log.employee?.biometricId || log.employeeId);
        if (bId && !mergedMap.has(bId)) {
          mergedMap.set(bId, {
            employeeNo: bId,
            name: log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : `Staff #${bId}`,
            userType: "normal",
            numOfFace: log.authMethod === "Face" ? 1 : 0,
            numOfFingerprint: log.authMethod === "Fingerprint" ? 1 : 0,
            numOfCard: 0,
          });
        }
      });

      persons = Array.from(mergedMap.values()).sort((a, b) => Number(a.employeeNo) - Number(b.employeeNo));

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
