import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, loginType, biometricId, clinicCode } = body;

    const normalizedClinicCode = (clinicCode || "MEDICFLOW").trim().toUpperCase();

    // 1. Staff / Employee Self-Service Login
    if (loginType === "staff" || biometricId) {
      if (!clinicCode) {
        return NextResponse.json({ 
          success: false, 
          error: "Clinic Code is required. Please enter your dental clinic's registration code (e.g. MEDICFLOW)." 
        }, { status: 400 });
      }

      // Find clinic by code (case-insensitive) or fallback for 'DEFAULT' to default clinic
      const clinic = await db.clinic.findFirst({
        where: {
          OR: [
            { clinicCode: { equals: normalizedClinicCode, mode: "insensitive" } },
            ...(normalizedClinicCode === "DEFAULT" ? [{ id: "default-clinic-id" }] : []),
          ],
        },
      });

      if (!clinic) {
        // Log failed attempt
        try {
          await db.auditLog.create({
            data: {
              clinicId: "default-clinic-id",
              action: "LOGIN_FAILED",
              entity: "Auth",
              entityId: String(biometricId || username || "UNKNOWN"),
              details: `Staff login failed: Clinic code '${clinicCode}' not registered`,
            },
          });
        } catch {}

        return NextResponse.json({ 
          success: false, 
          error: `Clinic Code '${clinicCode}' was not found. Contact your clinic administrator.` 
        }, { status: 404 });
      }

      const bioId = String(biometricId || username).trim();
      
      const emp = await db.employee.findFirst({
        where: {
          clinicId: clinic.id,
          OR: [
            { biometricId: { equals: bioId, mode: "insensitive" } },
            { id: bioId },
            { firstName: { equals: bioId, mode: "insensitive" } },
          ],
        },
      });

      if (emp) {
        // Log successful login
        try {
          await db.auditLog.create({
            data: {
              clinicId: clinic.id,
              action: "LOGIN_SUCCESS",
              entity: "Auth",
              entityId: emp.id,
              details: `Staff member ${emp.firstName} ${emp.lastName} (Bio #${emp.biometricId}) signed into staff portal`,
            },
          });
        } catch {}

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
            clinicName: clinic.name,
            clinicCode: clinic.clinicCode,
            loginType: "staff",
          },
        });
      }

      // Log failed staff lookup
      try {
        await db.auditLog.create({
          data: {
            clinicId: clinic.id,
            action: "LOGIN_FAILED",
            entity: "Auth",
            entityId: bioId,
            details: `Staff login failed: Biometric ID / Staff #${bioId} not enrolled at clinic '${clinic.name}'`,
          },
        });
      } catch {}

      return NextResponse.json({ 
        success: false, 
        error: `Staff ID '${bioId}' is not enrolled in ${clinic.name}. Please confirm your assigned fingerprint/biometric number.` 
      }, { status: 401 });
    }

    // 2. Admin User Credentials Login
    let admin = null;
    let clinic = null;

    if (clinicCode) {
      clinic = await db.clinic.findFirst({
        where: {
          OR: [
            { clinicCode: { equals: normalizedClinicCode, mode: "insensitive" } },
            ...(normalizedClinicCode === "DEFAULT" ? [{ id: "default-clinic-id" }] : []),
          ],
        },
      });

      if (clinic) {
        admin = await db.adminUser.findFirst({
          where: {
            clinicId: clinic.id,
            username: username?.trim(),
          },
        });
      }
    }

    // Fallback: lookup admin across default clinic or primary username
    if (!admin) {
      admin = await db.adminUser.findFirst({
        where: {
          username: username?.trim(),
        },
        include: {
          clinic: true,
        },
      });
      if (admin) {
        clinic = admin.clinic;
      }
    }

    if (admin && admin.password === password) {
      const activeClinicId = admin.clinicId || clinic?.id || "default-clinic-id";
      
      // Log successful admin login
      try {
        await db.auditLog.create({
          data: {
            clinicId: activeClinicId,
            action: "LOGIN_SUCCESS",
            entity: "Auth",
            entityId: admin.id,
            details: `Administrator ${admin.name} (${admin.username}) signed into Clinic Admin OS`,
          },
        });
      } catch {}

      return NextResponse.json({
        success: true,
        user: { 
          id: admin.id, 
          username: admin.username, 
          name: admin.name, 
          role: "Admin", 
          clinicId: activeClinicId,
          clinicName: clinic?.name || "MedSync Primary Clinic",
          clinicCode: clinic?.clinicCode || "MEDSYNC",
          loginType: "admin",
        },
      });
    }

    // Log failed admin login
    try {
      await db.auditLog.create({
        data: {
          clinicId: clinic?.id || "default-clinic-id",
          action: "LOGIN_FAILED",
          entity: "Auth",
          entityId: String(username || "UNKNOWN"),
          details: `Admin login failed: Invalid credentials for user '${username}'`,
        },
      });
    } catch {}

    return NextResponse.json({ 
      success: false, 
      error: "Invalid username or password. Please verify your administrator credentials." 
    }, { status: 401 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
