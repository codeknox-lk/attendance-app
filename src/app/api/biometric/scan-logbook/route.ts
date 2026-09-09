import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getClinicId } from "@/lib/clinic";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for vision analysis

interface EmployeeRef {
  id: string;
  name: string;
  role?: string;
  biometricId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg", month, employees = [], apiKey } = body;

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: "No logbook image provided" }, { status: 400 });
    }

    const effectiveApiKey = (apiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!effectiveApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Gemini API Key. Please provide a valid Google Gemini API key in the scanner modal or set GEMINI_API_KEY in your server environment.",
        },
        { status: 400 }
      );
    }

    const clinicId = await getClinicId(req);
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // Clean base64 data (strip data URL prefix if present)
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    // Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

    const staffListPrompt = (employees as EmployeeRef[])
      .map((e) => `- Name: ${e.name} (ID: ${e.id}, Role: ${e.role || "Staff"}, Biometric/Staff #: ${e.biometricId || "N/A"})`)
      .join("\n");

    const prompt = `
You are an expert Vision AI specialized in reading handwritten physical attendance sheets, timecards, and logbooks for dental and medical clinics.
Examine the handwritten table in the provided image carefully and transcribe every visible attendance entry.

Target Month: ${targetMonth} (Format: YYYY-MM)

Registered Clinic Staff Members to match against:
${staffListPrompt || "(No staff list provided, extract names directly as written)"}

Guidelines:
1. STAFF MATCHING: Match the handwritten staff name to one of the Registered Clinic Staff Members above.
   - If matched, set "matchedEmployeeId" to their corresponding ID, and "employeeName" to their registered full name.
   - If the name on paper does not match any registered staff member, set "employeeName" to the handwritten text as read, and "matchedEmployeeId" to null.
2. DATES: If the paper only has day numbers (e.g. "1", "02", "15", "30"), construct the full date as "${targetMonth}-DD" where DD is zero-padded (e.g. "${targetMonth}-01", "${targetMonth}-15").
3. TIMES: Read handwritten check-in and check-out times and convert to 24-hour "HH:mm" format (e.g. "07:30", "13:05", "15:30", "20:20").
   - If handwritten in 12-hour format (e.g. "1:15 pm", "7:40 am"), accurately convert to 24h ("13:15", "07:40").
   - If check-out is blank or missing, set "checkOut" to null.
4. REMARKS & NOTES: Note any special remarks written in the log (e.g. "Day off", "Leave", "Half day", "Sick", "Poya", "Holiday", "Closed").
5. STATUS: Estimate status as "On-Time", "Late", "Half-Day", or "On-Leave" based on the timestamps and notes.
6. Skip rows that are completely blank or marked as clinic closed days with no staff punch.

You must respond with strictly valid JSON adhering to this schema:
{
  "punches": [
    {
      "date": "YYYY-MM-DD",
      "employeeName": "string",
      "matchedEmployeeId": "string or null",
      "checkIn": "HH:mm",
      "checkOut": "HH:mm or null",
      "status": "On-Time",
      "note": "string"
    }
  ]
}
`;

    // Call Gemini Vision with model fallback
    const candidateModels = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash"];
    let rawText = "";
    let lastError: unknown = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType || "image/jpeg",
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        rawText = response.text || "";
        if (rawText) break;
      } catch (err) {
        lastError = err;
        console.warn(`[SCAN-LOGBOOK] Model ${model} failed, trying fallback...`, err);
      }
    }

    if (!rawText) {
      const errMsg = lastError instanceof Error ? lastError.message : "Failed to generate vision content from Gemini API";
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    // Parse JSON
    let parsed: { punches?: unknown[] } = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Fallback: extract JSON block if model included extra fences
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse structured JSON from Vision AI response");
      }
    }

    const punches = Array.isArray(parsed.punches) ? parsed.punches : [];

    return NextResponse.json({
      success: true,
      clinicId,
      month: targetMonth,
      detectedCount: punches.length,
      punches,
    });
  } catch (error: unknown) {
    console.error("[SCAN-LOGBOOK] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to scan logbook";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
