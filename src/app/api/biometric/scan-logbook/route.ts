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
    const { imageBase64, mimeType = "image/jpeg", month, employees = [], apiKey, holidays = [], closedDays = [] } = body;

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

    const holidaysListPrompt = Array.isArray(holidays) && holidays.length > 0
      ? (holidays as { date?: string; name?: string }[])
          .map((h) => `- ${h.date}: ${h.name}`)
          .join("\n")
      : "(No custom public holidays configured)";

    const closedDaysPrompt = Array.isArray(closedDays) && closedDays.length > 0
      ? closedDays.join(", ")
      : "(Clinic is open according to standard clinic schedule)";

    const prompt = `
You are an expert Vision AI specialized in reading handwritten physical attendance sheets, timecards, and logbooks for dental and medical clinics.
Examine the handwritten table in the provided image carefully and transcribe every visible attendance entry.

Target Month: ${targetMonth} (Format: YYYY-MM)

Registered Clinic Staff Members to match against:
${staffListPrompt || "(No staff list provided, extract names directly as written)"}

Known Public / Clinic Holidays:
${holidaysListPrompt}

Scheduled Clinic Closed Days:
${closedDaysPrompt}

Guidelines:
1. STAFF MATCHING: Match the handwritten staff name to one of the Registered Clinic Staff Members above.
   - If matched, set "matchedEmployeeId" to their corresponding ID, and "employeeName" to their registered full name.
   - If the name on paper does not match any registered staff member, set "employeeName" to the handwritten text as read, and "matchedEmployeeId" to null.
2. DATES: If the paper only has day numbers (e.g. "1", "02", "15", "30"), construct the full date as "${targetMonth}-DD" where DD is zero-padded (e.g. "${targetMonth}-01", "${targetMonth}-15").
3. NON-WORKING DAYS, HOLIDAYS & LEAVE DETECTION (CRITICAL):
   - When a row indicates staff did NOT work, determine the exact classification:
     a) "Holiday": If the text explicitly notes "Holiday", "HOLIDAY MONDAY", "Poya", "Mercantile Holiday", "Public Holiday", or if the date matches a known public holiday.
        - Set "status" to "Holiday"
        - Set "checkIn" to null
        - Set "checkOut" to null
        - Set "note" to the holiday name or "Public Holiday"
     b) "Clinic Closed": If the text notes "Closed", "Clinic Closed", "Off day - Clinic", or if it's a scheduled clinic closed day with no staff working.
        - Set "status" to "Clinic Closed"
        - Set "checkIn" to null
        - Set "checkOut" to null
        - Set "note" to "Clinic Closed"
     c) "On-Leave": If an individual staff member took leave ("Leave", "On Leave", "L", "SL", "Sick", "CL", "Casual", "AL", "Annual Leave", "Off", "Day Off", "D/O").
        - Set "status" to "On-Leave"
        - Set "checkIn" to null
        - Set "checkOut" to null
        - Set "note" to the leave reason (e.g. "Sick Leave (SL)", "Casual Leave (CL)", "Annual Leave")
     d) "Absent": If staff was absent without approval ("Absent", "AB", "No show").
        - Set "status" to "Absent"
        - Set "checkIn" to null
        - Set "checkOut" to null
        - Set "note" to "Absent without leave"
4. WORKING PUNCH TIMES:
   - When a staff member was present and worked, read handwritten check-in and check-out times and convert to 24-hour "HH:mm" format (e.g. "07:30", "08:30", "13:05", "17:00", "20:20").
   - If handwritten in 12-hour format (e.g. "1:15 pm", "7:40 am"), accurately convert to 24h ("13:15", "07:40").
   - If check-out is blank or missing, set "checkOut" to null.
   - CRITICAL RULE: If a staff member has recorded working check-in/out times, their status MUST be "On-Time", "Late", or "Half-Day". They CANNOT be marked "On-Leave", "Holiday", or "Clinic Closed" if they were present and working!
5. STATUS DEFINITIONS:
   - "On-Time": Present staff who arrived on or before expected shift start (~08:30).
   - "Late": Present staff who arrived past expected shift start.
   - "Half-Day": Present staff who worked a partial shift or left early.
   - "Holiday": Public holiday or declared clinic holiday (checkIn must be null).
   - "Clinic Closed": Scheduled or emergency clinic closure (checkIn must be null).
   - "On-Leave": Individual staff member taking approved leave or sick day (checkIn must be null).
   - "Absent": Staff member absent without approval (checkIn must be null).

You must respond with strictly valid JSON adhering to this schema:
{
  "punches": [
    {
      "date": "YYYY-MM-DD",
      "employeeName": "string",
      "matchedEmployeeId": "string or null",
      "checkIn": "HH:mm or null",
      "checkOut": "HH:mm or null",
      "status": "On-Time or Late or Half-Day or Holiday or Clinic Closed or On-Leave or Absent",
      "note": "string"
    }
  ]
}
`;

    // Call Gemini Vision with model fallback
    const candidateModels = [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3-flash-preview",
      "gemini-flash-latest",
      "gemini-3.8-flash",
      "gemini-3.7-flash",
    ];
    let rawText = "";
    let lastError: unknown = null;

    for (const model of candidateModels) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
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
        } catch (err: unknown) {
          lastError = err;
          console.warn(`[SCAN-LOGBOOK] Model ${model} attempt ${attempts} failed:`, err instanceof Error ? err.message : err);
          // If error is transient, wait briefly before retrying or switching
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
      if (rawText) break;
    }

    if (!rawText) {
      let friendlyMsg = "Failed to generate vision content from Gemini API.";
      if (lastError instanceof Error) {
        try {
          const parsedErr = JSON.parse(lastError.message);
          if (parsedErr?.error?.message) {
            friendlyMsg = parsedErr.error.message;
          } else {
            friendlyMsg = lastError.message;
          }
        } catch {
          friendlyMsg = lastError.message;
        }
      } else if (typeof lastError === "string") {
        try {
          const parsedErr = JSON.parse(lastError);
          if (parsedErr?.error?.message) friendlyMsg = parsedErr.error.message;
          else friendlyMsg = lastError;
        } catch {
          friendlyMsg = lastError;
        }
      }
      return NextResponse.json({ success: false, error: friendlyMsg }, { status: 500 });
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

    interface RawVisionPunch {
      date?: string;
      employeeName?: string;
      matchedEmployeeId?: string | null;
      checkIn?: string | null;
      checkOut?: string | null;
      status?: string;
      note?: string;
    }

    const rawPunches = Array.isArray(parsed.punches) ? (parsed.punches as RawVisionPunch[]) : [];

    // Sanitize and normalize punches
    const punches = rawPunches.map((p) => {
      const hasWorkingTimes = Boolean(p.checkIn && p.checkIn.toString().trim() !== "" && p.checkIn.toString().trim() !== "--");
      const noteLower = (p.note || "").toLowerCase();
      const isExplicitLeaveNote =
        noteLower.includes("leave") ||
        noteLower.includes("sick") ||
        noteLower.includes("casual") ||
        noteLower.includes("off") ||
        noteLower.includes("absent");

      let finalStatus = p.status || (hasWorkingTimes ? "On-Time" : "On-Leave");

      if (isExplicitLeaveNote || (!hasWorkingTimes && (finalStatus === "On-Leave" || finalStatus === "Absent"))) {
        // Staff was on leave or absent: NEVER return fake working times
        finalStatus = finalStatus === "Absent" || noteLower.includes("absent") ? "Absent" : "On-Leave";
        return {
          ...p,
          checkIn: null,
          checkOut: null,
          status: finalStatus,
          note: p.note || (finalStatus === "On-Leave" ? "On Leave / Day Off" : "Absent"),
        };
      }

      // If they had working check-in/out times recorded, they cannot be on leave!
      if (hasWorkingTimes && (finalStatus === "On-Leave" || finalStatus === "Absent")) {
        finalStatus = "On-Time";
      }

      return {
        ...p,
        status: finalStatus,
      };
    });

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
