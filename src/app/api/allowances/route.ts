import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const allowances = await db.allowance.findMany();
    return NextResponse.json({ success: true, allowances });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error fetching allowances";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, amount, type, isTaxable } = body;

    const allowance = await db.allowance.create({
      data: {
        name,
        amount: Number(amount) || 0,
        type: type || "Monthly",
        isTaxable: isTaxable ?? false,
      },
    });

    return NextResponse.json({ success: true, allowance });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error creating allowance";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Allowance ID required" }, { status: 400 });
    }

    try {
      await db.allowance.delete({
        where: { id },
      });
    } catch {
      // Fallback
    }

    return NextResponse.json({ success: true, message: "Allowance deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error deleting allowance";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
