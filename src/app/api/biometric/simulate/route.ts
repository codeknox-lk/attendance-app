import { NextRequest, NextResponse } from "next/server";

/**
 * Hardware Simulator Route for Hikvision DS-K1T320EFWX
 * Allows triggering mock face/fingerprint scans to test cloud attendance sync.
 */
export async function POST(req: NextRequest) {
  try {
    const { biometricId, authMethod, timestamp } = await req.json();

    const targetBiometricId = biometricId || "101";
    const targetAuthMethod = authMethod || "Face";
    const eventTime = timestamp || new Date().toISOString();

    // Call the Hikvision cloud event endpoint internally
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const endpoint = `${protocol}://${host}/api/biometric/hikvision`;

    const payload = {
      AccessControllerEvent: {
        deviceName: "DS-K1T320EFWX (Cloud Wi-Fi Terminal)",
        serialNo: "DS-K1T320EFWX-SN987654",
        employeeNoString: String(targetBiometricId),
        currentVerifyMode: targetAuthMethod,
        verifyResult: "success",
        time: eventTime,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json({
      success: true,
      message: "Simulated Hikvision event pushed successfully",
      simulatedPayload: payload,
      receiverResponse: data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Simulation failed";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
