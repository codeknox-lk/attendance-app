import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicId } from "@/lib/clinic";
import { hashPassword, verifyAndCheckRehash } from "@/lib/auth-crypto";

export async function PUT(req: NextRequest) {
  try {
    const clinicId = await getClinicId(req);
    const body = await req.json();
    const { currentPassword, newUsername, newPassword, confirmPassword } = body;

    // 1. Locate the admin user for this clinic
    const admin = await db.adminUser.findFirst({
      where: { clinicId },
    });

    if (!admin) {
      return NextResponse.json({
        success: false,
        error: "Administrator account not found for this clinic.",
      }, { status: 404 });
    }

    // 2. Verify current password
    const currPassTrimmed = (currentPassword || "").trim();
    const passCheck = await verifyAndCheckRehash(currPassTrimmed, admin.password);

    if (!passCheck.valid) {
      return NextResponse.json({
        success: false,
        error: "Current password is incorrect. Please verify your current administrator password.",
      }, { status: 401 });
    }

    // 3. Validate new username
    const trimmedUsername = (newUsername || "").trim();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      return NextResponse.json({
        success: false,
        error: "New username must be at least 3 characters long.",
      }, { status: 400 });
    }

    if (!/^[A-Za-z0-9_.-]+$/.test(trimmedUsername)) {
      return NextResponse.json({
        success: false,
        error: "Username can only contain letters, numbers, underscores, dashes, and periods.",
      }, { status: 400 });
    }

    // Check if username taken by another admin user
    const existing = await db.adminUser.findFirst({
      where: {
        username: { equals: trimmedUsername, mode: "insensitive" },
        id: { not: admin.id },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Username '${trimmedUsername}' is already taken. Please choose another username.`,
      }, { status: 400 });
    }

    // 4. Validate and hash new password
    const trimmedPassword = (newPassword || "").trim();
    let finalHashedPassword = admin.password;

    if (trimmedPassword) {
      if (trimmedPassword.length < 4) {
        return NextResponse.json({
          success: false,
          error: "New password must be at least 4 characters long.",
        }, { status: 400 });
      }

      if (confirmPassword !== undefined && trimmedPassword !== (confirmPassword || "").trim()) {
        return NextResponse.json({
          success: false,
          error: "New password and confirmation password do not match.",
        }, { status: 400 });
      }

      finalHashedPassword = await hashPassword(trimmedPassword);
    } else if (passCheck.needsRehash) {
      // Rehash legacy plaintext current password
      finalHashedPassword = await hashPassword(currPassTrimmed);
    }

    // 5. Update admin credentials in database
    const updatedAdmin = await db.adminUser.update({
      where: { id: admin.id },
      data: {
        username: trimmedUsername,
        password: finalHashedPassword,
      },
    });

    // 6. Record in Audit Trail
    try {
      await db.auditLog.create({
        data: {
          clinicId,
          action: "UPDATE",
          entity: "AdminCredentials",
          entityId: admin.id,
          details: `Updated admin login username from '${admin.username}' to '${trimmedUsername}' and updated password`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Admin login credentials updated successfully.",
      user: {
        id: updatedAdmin.id,
        username: updatedAdmin.username,
        name: updatedAdmin.name,
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update admin credentials";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
