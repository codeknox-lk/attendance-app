import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, pin, loginType, biometricId } = body;

    // 1. PIN-based Quick Lock/Unlock (If implementing local pins securely later)
    // For now we assume PIN auth is disabled or strictly verified.
    if (pin) {
      // Optionally verify a database stored PIN if added to schema
    }

    // 1. Staff / Employee Self-Service Login
    if (loginType === "staff" || biometricId) {
      const bioId = String(biometricId || username).trim();
      
      const emp = await db.employee.findFirst({
        where: {
          OR: [
            { biometricId: bioId },
            { id: bioId },
            { firstName: bioId },
          ],
        },
      });

      if (emp) {
        return NextResponse.json({
          success: true,
          user: {
            id: emp.id,
            username: emp.biometricId,
            name: `${emp.firstName} ${emp.lastName}`,
            role: emp.role,
            biometricId: emp.biometricId,
            employeeId: emp.id,
            clinicId: emp.clinicId,
          },
        });
      }

      return NextResponse.json({ success: false, error: "Staff Biometric ID not found in database" }, { status: 401 });
    }

    // 2. Admin User Credentials Login
    const admin = await db.adminUser.findFirst({
      where: {
        username: username,
      },
    });

    if (admin && admin.password === password) {
      return NextResponse.json({
        success: true,
        user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role, clinicId: admin.clinicId },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
