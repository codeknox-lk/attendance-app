import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyAndCheckRehash } from "@/lib/auth-crypto";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, loginType, biometricId, clinicCode } = body;

    const trimmedCode = (clinicCode || "").trim();
    if (!trimmedCode) {
      return NextResponse.json({ 
        success: false, 
        error: "Clinic Code is required. Please enter your dental clinic's registration code." 
      }, { status: 400 });
    }

    const normalizedClinicCode = trimmedCode.toUpperCase();

    // Find clinic strictly by clinicCode (case-insensitive)
    const clinic = await db.clinic.findFirst({
      where: {
        clinicCode: { equals: normalizedClinicCode, mode: "insensitive" },
      },
    });

    if (!clinic) {
      try {
        await db.auditLog.create({
          data: {
            clinicId: "default-clinic-id",
            action: "LOGIN_FAILED",
            entity: "Auth",
            entityId: String(biometricId || username || "UNKNOWN"),
            details: `Login failed: Clinic code '${trimmedCode}' not found`,
          },
        });
      } catch {}

      return NextResponse.json({ 
        success: false, 
        error: `Clinic Code '${trimmedCode}' was not found. Please check with your clinic administrator.` 
      }, { status: 404 });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const targetIdentifier = String(biometricId || username || "anonymous").trim();
    const rateKey = `login:${clientIp}:${clinic.clinicCode}:${targetIdentifier}`;

    const limitStatus = checkRateLimit(rateKey, 5, 10 * 60 * 1000);
    if (limitStatus.isLimited) {
      return NextResponse.json({
        success: false,
        error: `Too many failed sign-in attempts. For your security, this account is temporarily locked. Please retry in ${limitStatus.retryAfterSec} seconds.`,
      }, { status: 429 });
    }

    // 1. Staff / Employee Self-Service Login
    if (loginType === "staff" || biometricId) {
      const bioId = String(biometricId || username).trim();
      const staffPin = String(password || body.pin || body.portalPin || "").trim();

      if (!staffPin) {
        return NextResponse.json({ 
          success: false, 
          error: "Staff Access PIN is required to log into the staff self-service portal." 
        }, { status: 400 });
      }

      // Check for exact biometric ID match within the identified clinic
      let emp = await db.employee.findFirst({
        where: {
          clinicId: clinic.id,
          biometricId: bioId,
          active: true,
        },
      });

      // Fallback: Case-insensitive biometric ID
      if (!emp) {
        emp = await db.employee.findFirst({
          where: {
            clinicId: clinic.id,
            biometricId: { equals: bioId, mode: "insensitive" },
            active: true,
          },
        });
      }

      // Fallback: Numeric matching (e.g. 101 matching SH101 or 0101)
      if (!emp && /^\d+$/.test(bioId)) {
        const allClinicEmps = await db.employee.findMany({
          where: { clinicId: clinic.id, active: true },
        });
        emp = allClinicEmps.find(e => {
          const numOnly = e.biometricId.replace(/\D/g, "");
          return numOnly === bioId || parseInt(numOnly, 10) === parseInt(bioId, 10);
        }) || null;
      }

      if (!emp) {
        recordFailedAttempt(rateKey);
        try {
          await db.auditLog.create({
            data: {
              clinicId: clinic.id,
              action: "LOGIN_FAILED",
              entity: "Auth",
              entityId: bioId,
              details: `Staff login failed: Biometric ID #${bioId} not enrolled at clinic '${clinic.name}'`,
            },
          });
        } catch {}

        return NextResponse.json({ 
          success: false, 
          error: `Staff ID '${bioId}' is not enrolled in ${clinic.name}. Please confirm your assigned biometric ID.` 
        }, { status: 401 });
      }

      // Check PIN: verify against employee's portalPin (default is 1234)
      const empWithPin = emp as (typeof emp & { portalPin?: string | null }) | null;
      const expectedPin = empWithPin?.portalPin || "1234";

      const pinCheck = await verifyAndCheckRehash(staffPin, expectedPin);
      if (!pinCheck.valid) {
        recordFailedAttempt(rateKey);
        try {
          await db.auditLog.create({
            data: {
              clinicId: clinic.id,
              action: "LOGIN_FAILED",
              entity: "Auth",
              entityId: emp.id,
              details: `Staff login failed: Incorrect Access PIN entered for ${emp.firstName} ${emp.lastName}`,
            },
          });
        } catch {}

        return NextResponse.json({ 
          success: false, 
          error: `Incorrect Access PIN for ${emp.firstName} ${emp.lastName}. Default initial PIN is 1234.` 
        }, { status: 401 });
      }

      resetRateLimit(rateKey);

      // Auto-rehash if stored as plaintext
      if (pinCheck.needsRehash) {
        try {
          const hashedPin = await hashPassword(staffPin);
          await db.employee.update({
            where: { id: emp.id },
            data: { portalPin: hashedPin } as unknown as Parameters<typeof db.employee.update>[0]["data"],
          });
        } catch {}
      }

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

    // 2. Admin User Credentials Login (Strictly isolated to clinic.id)
    const admin = await db.adminUser.findFirst({
      where: {
        clinicId: clinic.id,
        OR: [
          { username: { equals: username?.trim(), mode: "insensitive" } },
          ...(username?.trim() === "admin" ? [{ username: "devadmin" }] : []),
        ],
      },
    });

    if (!admin) {
      recordFailedAttempt(rateKey);
      return NextResponse.json({ 
        success: false, 
        error: `No administrator found with username '${username}' at ${clinic.name}.` 
      }, { status: 401 });
    }

    const passCheck = await verifyAndCheckRehash(password, admin.password);

    if (passCheck.valid) {
      resetRateLimit(rateKey);

      // Auto-rehash if stored as legacy plaintext
      if (passCheck.needsRehash) {
        try {
          const hashedPass = await hashPassword(password);
          await db.adminUser.update({
            where: { id: admin.id },
            data: { password: hashedPass },
          });
        } catch {}
      }

      try {
        await db.auditLog.create({
          data: {
            clinicId: clinic.id,
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
          clinicId: clinic.id,
          clinicName: clinic.name,
          clinicCode: clinic.clinicCode,
          loginType: "admin",
        },
      });
    }

    recordFailedAttempt(rateKey);
    const updatedLimit = checkRateLimit(rateKey, 5, 10 * 60 * 1000);

    try {
      await db.auditLog.create({
        data: {
          clinicId: clinic.id,
          action: "LOGIN_FAILED",
          entity: "Auth",
          entityId: admin.id,
          details: `Administrator login failed: Invalid password for user '${admin.username}'`,
        },
      });
    } catch {}

    const remainingMsg = updatedLimit.remainingAttempts > 0 
      ? ` (${updatedLimit.remainingAttempts} attempt${updatedLimit.remainingAttempts === 1 ? "" : "s"} remaining)`
      : "";

    return NextResponse.json({ 
      success: false, 
      error: `Invalid credentials for clinic '${clinic.name}'. Please check your password${remainingMsg}.` 
    }, { status: 401 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
