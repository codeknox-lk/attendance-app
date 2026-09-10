import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clinicName,
      clinicCode,
      adminName,
      username,
      password,
      email,
      phone,
      address,
    } = body;

    // 1. Validation
    if (!clinicName || !clinicName.trim()) {
      return NextResponse.json({ success: false, error: "Clinic name is required." }, { status: 400 });
    }

    if (!clinicCode || !clinicCode.trim()) {
      return NextResponse.json({ success: false, error: "Clinic code is required." }, { status: 400 });
    }

    const normalizedCode = clinicCode.trim().toUpperCase();
    if (normalizedCode.length < 2 || normalizedCode.length > 20 || !/^[A-Z0-9_-]+$/.test(normalizedCode)) {
      return NextResponse.json({
        success: false,
        error: "Clinic code must be 2 to 20 characters (letters, numbers, underscores, and hyphens only).",
      }, { status: 400 });
    }

    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, error: "Admin username is required." }, { status: 400 });
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return NextResponse.json({ success: false, error: "Username must be at least 3 characters long." }, { status: 400 });
    }

    if (!password || password.length < 4) {
      return NextResponse.json({ success: false, error: "Password must be at least 4 characters long." }, { status: 400 });
    }

    // 2. Check if Clinic Code is already taken
    const existingClinic = await db.clinic.findFirst({
      where: {
        clinicCode: { equals: normalizedCode, mode: "insensitive" },
      },
    });

    if (existingClinic) {
      return NextResponse.json({
        success: false,
        error: `Clinic code '${normalizedCode}' is already in use. Please choose a unique code for your clinic (e.g. ${normalizedCode}2 or ${normalizedCode}_HQ).`,
      }, { status: 409 });
    }

    // 3. Check if Admin Username is already taken
    const existingAdmin = await db.adminUser.findFirst({
      where: {
        username: { equals: cleanUsername, mode: "insensitive" },
      },
    });

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        error: `Username '${cleanUsername}' is already taken. Try '${cleanUsername}_${normalizedCode.toLowerCase()}' or a different username.`,
      }, { status: 409 });
    }

    // 4. Create Clinic with default schedule & initial Admin User
    const standardDays = [
      { dayOfWeek: 0, isOpen: false, startTime: "08:30", endTime: "17:00" }, // Sunday (closed by default)
      { dayOfWeek: 1, isOpen: true, startTime: "08:30", endTime: "17:00" },  // Monday
      { dayOfWeek: 2, isOpen: true, startTime: "08:30", endTime: "17:00" },  // Tuesday
      { dayOfWeek: 3, isOpen: true, startTime: "08:30", endTime: "17:00" },  // Wednesday
      { dayOfWeek: 4, isOpen: true, startTime: "08:30", endTime: "17:00" },  // Thursday
      { dayOfWeek: 5, isOpen: true, startTime: "08:30", endTime: "17:00" },  // Friday
      { dayOfWeek: 6, isOpen: true, startTime: "08:30", endTime: "14:00" },  // Saturday
    ];

    const newClinic = await db.clinic.create({
      data: {
        name: clinicName.trim(),
        clinicCode: normalizedCode,
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        operatingHours: {
          create: standardDays,
        },
        adminUsers: {
          create: {
            username: cleanUsername,
            password: await hashPassword(password),
            name: adminName ? adminName.trim() : "Clinic Administrator",
            role: "Admin",
          },
        },
      },
      include: {
        adminUsers: true,
      },
    });

    const createdAdmin = newClinic.adminUsers[0];

    // Log audit
    try {
      await db.auditLog.create({
        data: {
          clinicId: newClinic.id,
          action: "REGISTER_CLINIC",
          entity: "Clinic",
          entityId: newClinic.id,
          details: `New clinic '${newClinic.name}' registered with code '${newClinic.clinicCode}' by admin '${createdAdmin.username}'`,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Clinic '${newClinic.name}' registered successfully!`,
      clinic: {
        id: newClinic.id,
        name: newClinic.name,
        clinicCode: newClinic.clinicCode,
      },
      user: {
        id: createdAdmin.id,
        username: createdAdmin.username,
        name: createdAdmin.name,
        role: "Admin",
        clinicId: newClinic.id,
        clinicName: newClinic.name,
        clinicCode: newClinic.clinicCode,
        loginType: "admin",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to register clinic";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
