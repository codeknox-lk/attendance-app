"use client";

import React, { useState, useRef } from "react";
import { Employee, AttendanceLog, PublicHoliday, ClinicOperatingHours } from "@/app/context/AppContext";

interface RawScannedPunch {
  date?: string;
  employeeName?: string;
  matchedEmployeeId?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
  note?: string;
  rawRow?: string;
  confidence?: number;
}

interface ScannedPunch {
  id: string;
  date: string;
  employeeId: string;
  detectedName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  note: string;
  confidence?: number;
  conflictAction?: "merge" | "skip" | "overwrite";
}

interface LogbookScannerViewProps {
  isDark: boolean;
  employees: Employee[];
  existingAttendanceLogs?: AttendanceLog[];
  publicHolidays?: PublicHoliday[];
  operatingHours?: ClinicOperatingHours[];
  defaultMonth?: string;
  onBack: () => void;
  onImportSuccess: (importedLogs: AttendanceLog[]) => void;
}

export const LogbookScannerView: React.FC<LogbookScannerViewProps> = ({
  isDark,
  employees,
  existingAttendanceLogs = [],
  publicHolidays = [],
  operatingHours = [],
  defaultMonth,
  onBack,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    if (defaultMonth && /^\d{4}-\d{2}$/.test(defaultMonth)) return defaultMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("medsync_gemini_api_key") || "";
    }
    return "";
  });
  const [showKeyField, setShowKeyField] = useState(false);

  const handleKeyChange = (val: string) => {
    setGeminiApiKey(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("medsync_gemini_api_key", val.trim());
    }
  };

  // Analysis status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<string>("");
  const [analyzeProgress, setAnalyzeProgress] = useState<number>(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [punches, setPunches] = useState<ScannedPunch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Conflict Resolution state
  const [globalConflictStrategy, setGlobalConflictStrategy] = useState<"merge" | "skip" | "overwrite">("merge");
  const [conflictFilter, setConflictFilter] = useState<"all" | "conflicts" | "new" | "holiday" | "closed" | "leave" | "absent">("all");

  const getExistingRecord = (p: ScannedPunch) => {
    return existingAttendanceLogs.find((l) => l.employeeId === p.employeeId && l.date === p.date);
  };

  const conflictCount = punches.filter((p) => Boolean(getExistingRecord(p))).length;
  const newCount = punches.length - conflictCount;
  const holidayCount = punches.filter((p) => p.status === "Holiday").length;
  const closedCount = punches.filter((p) => p.status === "Clinic Closed").length;
  const leaveCount = punches.filter((p) => p.status === "On-Leave").length;
  const absentCount = punches.filter((p) => p.status === "Absent").length;

  const filteredPunches = punches.filter((p) => {
    if (conflictFilter === "conflicts") return Boolean(getExistingRecord(p));
    if (conflictFilter === "new") return !getExistingRecord(p);
    if (conflictFilter === "holiday") return p.status === "Holiday";
    if (conflictFilter === "closed") return p.status === "Clinic Closed";
    if (conflictFilter === "leave") return p.status === "On-Leave";
    if (conflictFilter === "absent") return p.status === "Absent";
    return true;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessNotice(null);
    setZoomLevel(1);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Trigger Gemini Vision AI analysis
  const handleAnalyzePhoto = async () => {
    if (!previewUrl) {
      setErrorMessage("Please choose or capture a logbook photo first.");
      return;
    }

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }

    setIsAnalyzing(true);
    setAnalyzeProgress(12);
    setErrorMessage(null);
    setSuccessNotice(null);
    setAnalyzeStep("Uploading image and preparing Gemini Vision analysis...");

    // Smooth dynamic percentage progression
    let currentPct = 12;
    progressTimerRef.current = setInterval(() => {
      if (currentPct < 35) {
        currentPct += Math.floor(Math.random() * 5) + 3;
        setAnalyzeStep("Transcribing handwritten dates, staff names & punch times...");
      } else if (currentPct < 70) {
        currentPct += Math.floor(Math.random() * 4) + 2;
        setAnalyzeStep("Transcribing handwritten dates, staff names & punch times...");
      } else if (currentPct < 88) {
        currentPct += Math.floor(Math.random() * 3) + 1;
        setAnalyzeStep("Cross-referencing staff roster & validating timestamps...");
      } else if (currentPct < 94) {
        currentPct += 1;
        setAnalyzeStep("Structuring attendance records & detecting leaves...");
      }
      setAnalyzeProgress(Math.min(95, currentPct));
    }, 380);

    try {
      const activeRoster = employees
        .filter((e) => e.active !== false)
        .map((e) => ({
          id: e.id,
          name: `${e.firstName} ${e.lastName}`.trim(),
          role: e.role,
          biometricId: e.biometricId,
        }));

      const monthHolidays = (publicHolidays || [])
        .filter((h) => h.date.startsWith(targetMonth))
        .map((h) => ({ date: h.date, name: h.name }));

      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const closedDayNames = (operatingHours || [])
        .filter((o) => !o.isOpen)
        .map((o) => dayNames[o.dayOfWeek] || `Day ${o.dayOfWeek}`);

      const res = await fetch("/api/biometric/scan-logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: previewUrl,
          month: targetMonth,
          apiKey: geminiApiKey.trim() || undefined,
          employees: activeRoster,
          holidays: monthHolidays,
          closedDays: closedDayNames,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to scan handwritten logbook.");
      }

      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setAnalyzeProgress(98);
      setAnalyzeStep("Finalizing extracted punch records...");

      const rawPunches = data.punches || [];
      if (rawPunches.length === 0) {
        setErrorMessage(
          "No legible attendance rows could be detected in this photo. Please ensure clear lighting and legible date/staff columns."
        );
        setIsAnalyzing(false);
        setAnalyzeProgress(0);
        return;
      }

      // Map punches into editable table items
      const formatted: ScannedPunch[] = rawPunches.map((p: RawScannedPunch, idx: number) => {
        let empId = p.matchedEmployeeId || "";
        if (!empId) {
          const match = employees.find(
            (e) =>
              `${e.firstName} ${e.lastName}`.toLowerCase().includes((p.employeeName || "").toLowerCase()) ||
              (p.employeeName || "").toLowerCase().includes(e.firstName.toLowerCase())
          );
          if (match) empId = match.id;
          else if (employees.length > 0) empId = employees[0].id;
        }

        const pDate = p.date || `${targetMonth}-01`;
        const matchedHoliday = (publicHolidays || []).find((h) => h.date === pDate);

        let dayOfWeek = -1;
        try {
          const parsedD = new Date(`${pDate}T00:00:00`);
          if (!isNaN(parsedD.getTime())) {
            dayOfWeek = parsedD.getDay();
          }
        } catch {}
        const isScheduledClosed = dayOfWeek >= 0 && (operatingHours || []).some((o) => o.dayOfWeek === dayOfWeek && !o.isOpen);

        // Check text clues for non-working status
        const combinedText = `${p.status || ""} ${p.note || ""} ${p.employeeName || ""} ${p.rawRow || ""}`.toLowerCase();
        const mentionsHoliday = combinedText.includes("holiday") || combinedText.includes("poya") || Boolean(matchedHoliday);
        const mentionsClosed = combinedText.includes("closed") || (isScheduledClosed && !p.checkIn && !p.checkOut);
        const mentionsLeave = combinedText.includes("leave") || combinedText.includes("sick") || combinedText.includes("sl") || combinedText.includes("cl") || combinedText.includes("casual") || combinedText.includes("annual");
        const mentionsAbsent = combinedText.includes("absent") || combinedText.includes("no show");

        let resolvedStatus = p.status || "On-Time";
        let defaultNote = p.note || "";

        // If no working punch was detected, accurately categorize the reason
        if (!p.checkIn && !p.checkOut) {
          if (mentionsHoliday || resolvedStatus === "Holiday") {
            resolvedStatus = "Holiday";
            defaultNote = p.note || (matchedHoliday ? matchedHoliday.name : "Public Holiday");
          } else if (mentionsClosed || resolvedStatus === "Clinic Closed") {
            resolvedStatus = "Clinic Closed";
            defaultNote = p.note || "Clinic Closed";
          } else if (mentionsAbsent || resolvedStatus === "Absent") {
            resolvedStatus = "Absent";
            defaultNote = p.note || "Absent";
          } else if (mentionsLeave || resolvedStatus === "On-Leave") {
            resolvedStatus = "On-Leave";
            defaultNote = p.note || "Staff Leave";
          } else if (resolvedStatus !== "On-Time" && resolvedStatus !== "Late" && resolvedStatus !== "Half-Day") {
            resolvedStatus = "On-Leave";
          }
        }

        const isNonWorking = resolvedStatus === "Holiday" || resolvedStatus === "Clinic Closed" || resolvedStatus === "On-Leave" || resolvedStatus === "Absent";
        const cleanCheckIn = isNonWorking ? "" : p.checkIn || "";
        const cleanCheckOut = isNonWorking ? "" : p.checkOut || "";

        return {
          id: `punch-${Date.now()}-${idx}`,
          date: pDate,
          employeeId: empId,
          detectedName: p.employeeName || "Unrecognized Staff",
          checkIn: cleanCheckIn,
          checkOut: cleanCheckOut,
          status: resolvedStatus,
          note:
            defaultNote ||
            (isNonWorking
              ? (resolvedStatus === "Holiday"
                ? "Public Holiday"
                : resolvedStatus === "Clinic Closed"
                ? "Clinic Closed"
                : "Staff Leave")
              : p.rawRow
              ? `OCR: ${p.rawRow}`
              : "Scanned via Physical Logbook AI"),
          confidence: p.confidence || 0.9,
        };
      });

      setAnalyzeProgress(100);
      setAnalyzeStep("Extraction completed!");
      setPunches(formatted);
      setSuccessNotice(`Successfully extracted ${formatted.length} records! Review and adjust below before importing.`);
    } catch (err: unknown) {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during AI analysis.";
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("api key")) {
        setShowKeyField(true);
      }
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalyzeProgress(0);
        setAnalyzeStep("");
      }, 500);
    }
  };

  // Update a punch row
  const updatePunch = (id: string, field: keyof ScannedPunch, value: string | number) => {
    setPunches((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const updated = { ...p, [field]: value };

        // If user sets status to non-working, clear working punch times
        const isNonWorking = value === "Holiday" || value === "Clinic Closed" || value === "On-Leave" || value === "Absent";
        if (field === "status" && isNonWorking) {
          updated.checkIn = "";
          updated.checkOut = "";
        }

        // If user sets status to On-Time / Late / Half-Day and checkIn is empty, provide default start
        if (field === "status" && (value === "On-Time" || value === "Late" || value === "Half-Day") && !updated.checkIn) {
          updated.checkIn = "08:30:00";
        }

        // If user types a check-in time on a non-working row, switch status to On-Time
        const currentIsNonWorking = p.status === "Holiday" || p.status === "Clinic Closed" || p.status === "On-Leave" || p.status === "Absent";
        if (
          field === "checkIn" &&
          typeof value === "string" &&
          value.trim() !== "" &&
          currentIsNonWorking
        ) {
          updated.status = "On-Time";
        }

        return updated;
      })
    );
  };

  // Remove a punch row
  const removePunch = (id: string) => {
    setPunches((prev) => prev.filter((p) => p.id !== id));
  };

  // Add a manual punch row
  const addManualPunch = () => {
    const newPunch: ScannedPunch = {
      id: `punch-manual-${Date.now()}`,
      date: `${targetMonth}-01`,
      employeeId: employees[0]?.id || "1",
      detectedName: "Manual Entry",
      checkIn: "08:30:00",
      checkOut: "17:00:00",
      status: "On-Time",
      note: "Manually added during scan review",
      confidence: 1.0,
    };
    setPunches((prev) => [newPunch, ...prev]);
  };

  // Commit punches to attendance backend
  const handleConfirmImport = async () => {
    if (punches.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payloadLogs = punches.map((p) => {
        const existing = getExistingRecord(p);
        const action = p.conflictAction || globalConflictStrategy;

        let formattedCheckIn = p.checkIn ? p.checkIn.trim() : "";
        if (formattedCheckIn && formattedCheckIn.length === 5) formattedCheckIn += ":00";

        let formattedCheckOut = p.checkOut ? p.checkOut.trim() : "";
        if (formattedCheckOut && formattedCheckOut.length === 5) formattedCheckOut += ":00";

        return {
          employeeId: p.employeeId,
          date: p.date,
          checkIn: formattedCheckIn,
          checkOut: formattedCheckOut || null,
          status: p.status,
          conflictAction: action,
          hasExistingMatch: Boolean(existing),
          authMethod: "Physical Logbook (AI Scan)",
        };
      });

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs: payloadLogs,
          defaultConflictStrategy: globalConflictStrategy,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to commit attendance records.");
      }

      onImportSuccess(data.logs || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save attendance logs.";
      setErrorMessage(msg);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-workspace-enter">
      {/* 1. Header & Navigation Bar */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isDark ? "bg-white/5 border-white/10 shadow-xl" : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className={`p-2 rounded-xl border transition flex items-center justify-center shrink-0 ${
              isDark
                ? "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-2xs"
            }`}
            title="Return to Attendance List"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-400">Attendance</span>
              <span className="text-xs text-zinc-400">/</span>
              <h2 className={`text-base font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                AI Logbook Scanner
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-teal-500 to-[#0ea5e9] text-white px-2 py-0.5 rounded-full shadow-2xs">
                AI Vision
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 font-bold">
                Target: {targetMonth}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Upload handwritten physical clinic attendance punch sheets to transcribe, verify side-by-side, and import.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowInstructions((p) => !p)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition ${
              showInstructions
                ? isDark
                  ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                  : "bg-teal-50 border-teal-200 text-teal-700"
                : isDark
                ? "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={3} strokeLinecap="round" />
            </svg>
            <span>{showInstructions ? "Hide Best Practices" : "Best Practices Guide"}</span>
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${showInstructions ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={addManualPunch}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition ${
              isDark
                ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-2xs"
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Row</span>
          </button>

          <button
            type="button"
            disabled={punches.length === 0 || isSaving}
            onClick={handleConfirmImport}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 ${
              punches.length === 0 || isSaving
                ? "opacity-50 cursor-not-allowed bg-zinc-600 text-white"
                : "bg-gradient-to-r from-teal-500 to-[#0ea5e9] hover:brightness-110 text-white active:scale-[0.98]"
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Confirm &amp; Import ({punches.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Optional Best Practices In-UI Guide */}
      {showInstructions && (
        <div
          className={`rounded-2xl border p-4 transition-all animate-in fade-in duration-200 ${
            isDark ? "bg-zinc-950/60 border-zinc-800/80" : "bg-teal-50/50 border-teal-100 text-zinc-800"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
              <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 mb-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span>Flat &amp; Even Light</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                Take a clear, top-down photo under bright lighting. Avoid tilted angles, finger shadows, or paper folds.
              </p>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
              <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 mb-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                  <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Target Month</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                Set target month to {targetMonth} so row day numbers (1–31) map directly to exact calendar dates.
              </p>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
              <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 mb-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>Staff Matching</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                Handwritten names are cross-checked against your {employees.filter((e) => e.active !== false).length} active clinic staff members.
              </p>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
              <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 mb-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>Side-by-Side Review</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                Review the handwritten paper on the left while editing recognized punches on the right before saving.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace: Side-by-Side Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Pinned Document & Controls (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 animate-panel-left">
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition backdrop-blur-xl space-y-4 ${
              isDark ? "bg-white/5 border-white/10 shadow-xl" : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Physical Logbook Document</span>
              </div>

              {previewUrl && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                    className={`p-1.5 rounded-lg border text-xs transition ${
                      isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                    title="Zoom Out"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-[10px] font-mono px-1.5 text-zinc-400 font-bold">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                    className={`p-1.5 rounded-lg border text-xs transition ${
                      isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                    title="Zoom In"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="text-[10px] text-teal-500 font-bold hover:underline px-1"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Upload Area / Image Viewer */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />

            {!previewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? "border-teal-500 bg-teal-500/10 scale-[1.01]"
                    : isDark
                    ? "border-zinc-700 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-800/40"
                    : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-white"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Click to select photo or drag and drop here
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Supports JPG, PNG, WEBP of handwritten logbooks
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className={`rounded-xl border overflow-auto max-h-[380px] flex items-center justify-center relative bg-zinc-950/40 ${
                    isDark ? "border-zinc-800" : "border-zinc-200"
                  }`}
                >
                  {/* High-tech Vision AI Scanning Sweep */}
                  {isAnalyzing && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_3px_rgba(45,212,191,0.8)] animate-laser-sweep pointer-events-none z-10" />
                  )}
                  <div
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top left",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Physical logbook preview"
                      className="max-w-none rounded-lg object-contain select-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] font-mono text-zinc-400 truncate max-w-[150px]">
                      {selectedFile?.name || "Uploaded Photo"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-teal-500 hover:underline"
                    >
                      Replace
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setPunches([]);
                      }}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Target Month & Settings */}
            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Target Month
                </label>
                <input
                  type="month"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                    isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-800"
                  }`}
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Sheet days (1–31) will map to {targetMonth}.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold text-[#0ea5e9] hover:underline flex items-center gap-1"
                  >
                    <span>Get Free Key</span>
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {showKeyField ? (
                  <div className="space-y-1">
                    <input
                      type="password"
                      placeholder="AIzaSy... (saved in browser)"
                      value={geminiApiKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      className={`w-full text-xs px-3 py-2 rounded-xl border font-mono transition ${
                        !geminiApiKey.trim() ? "border-amber-400/80 focus:border-amber-500" : ""
                      } ${isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-800"}`}
                    />
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                      {geminiApiKey.trim() ? (
                        <>
                          <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Key saved in browser</span>
                        </>
                      ) : (
                        <span>Enter your Google Gemini API key to enable AI OCR</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <div className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      <span>Key Configured</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKeyField(true)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* Action: Extract via AI */}
              <button
                type="button"
                disabled={!previewUrl || isAnalyzing}
                onClick={handleAnalyzePhoto}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 ${
                  !previewUrl || isAnalyzing
                    ? "opacity-50 cursor-not-allowed bg-zinc-600 text-white"
                    : "bg-gradient-to-r from-teal-500 to-[#0ea5e9] text-white hover:brightness-110 active:scale-[0.99]"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Analyzing ({analyzeProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Extract Punches via AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Verification & Conflict Table (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4 animate-panel-right">
          {/* Progress Banner with Percentage Loading */}
          {isAnalyzing && (
            <div
              className={`p-4 rounded-2xl border transition-all shadow-md backdrop-blur-xl ${
                isDark
                  ? "bg-zinc-950/90 border-teal-500/30 text-teal-300 shadow-teal-950/20"
                  : "bg-teal-50/90 border-teal-200 text-teal-800 shadow-teal-900/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping shrink-0" />
                  <span className="text-xs font-bold truncate">{analyzeStep}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg border bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400 shadow-xs">
                    {analyzeProgress}%
                  </span>
                </div>
              </div>

              {/* Dynamic Percentage Progress Bar */}
              <div className={`w-full rounded-full h-2 mt-3 overflow-hidden ${isDark ? "bg-zinc-800/80" : "bg-teal-100/70"}`}>
                <div
                  className="bg-gradient-to-r from-teal-500 via-[#0ea5e9] to-[#38bdf8] h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(20,184,166,0.6)]"
                  style={{ width: `${Math.min(100, Math.max(6, analyzeProgress))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 mt-2 font-medium">
                <span>Gemini 2.5 Flash Vision OCR</span>
                <span>{analyzeProgress < 100 ? "Processing document..." : "Extraction Ready!"}</span>
              </div>
            </div>
          )}

          {/* Feedback Notices */}
          {errorMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                isDark ? "bg-rose-950/40 border-rose-800 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                isDark ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successNotice}</span>
              </div>
            </div>
          )}

          {/* Conflict Notification Banner */}
          {conflictCount > 0 && (
            <div
              className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isDark ? "bg-amber-950/20 border-amber-800/40 text-amber-200" : "bg-amber-50/80 border-amber-200 text-amber-900 shadow-2xs"
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Existing Record Conflict Detected</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                    {conflictCount} of {punches.length} dates already exist in system
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Staff already have biometric (fingerprint/face) or manual records on these dates. Select how to resolve matches:
                </p>
              </div>

              {/* Resolution Strategy Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setGlobalConflictStrategy("merge")}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 ${
                    globalConflictStrategy === "merge"
                      ? "bg-teal-500 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  title="Preserve accurate biometric hardware check-in, fill missing check-out from paper sheet"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span>Merge &amp; Fill Missing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalConflictStrategy("skip")}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 ${
                    globalConflictStrategy === "skip"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  title="Keep existing system records untouched, only import dates with zero logs"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  <span>Skip Existing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGlobalConflictStrategy("overwrite")}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5 ${
                    globalConflictStrategy === "overwrite"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                  title="Replace existing times with logbook handwriting"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Overwrite All</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Toolbar: Filter pills */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Punches:</span>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setConflictFilter("all")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    conflictFilter === "all"
                      ? isDark
                        ? "bg-zinc-800 text-white border border-zinc-700"
                        : "bg-zinc-900 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All ({punches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setConflictFilter("new")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    conflictFilter === "new"
                      ? isDark
                        ? "bg-emerald-950/60 border border-emerald-700 text-emerald-300"
                        : "bg-emerald-100 border border-emerald-300 text-emerald-800"
                      : "text-emerald-500/80 hover:text-emerald-500"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>New Only ({newCount})</span>
                </button>
                {conflictCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConflictFilter("conflicts")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      conflictFilter === "conflicts"
                        ? isDark
                          ? "bg-amber-950/60 border border-amber-700 text-amber-300"
                          : "bg-amber-100 border border-amber-300 text-amber-800"
                        : "text-amber-500/80 hover:text-amber-500"
                    }`}
                  >
                    <svg className="w-3 h-3 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Conflicts ({conflictCount})</span>
                  </button>
                )}
                {holidayCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConflictFilter("holiday")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      conflictFilter === "holiday"
                        ? isDark
                          ? "bg-amber-950/60 border border-amber-600 text-amber-300"
                          : "bg-amber-100 border border-amber-300 text-amber-800"
                        : "text-amber-500/80 hover:text-amber-500"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Holidays ({holidayCount})</span>
                  </button>
                )}
                {closedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConflictFilter("closed")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      conflictFilter === "closed"
                        ? isDark
                          ? "bg-slate-800 border border-slate-600 text-slate-200"
                          : "bg-slate-200 border border-slate-300 text-slate-800"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Clinic Closed ({closedCount})</span>
                  </button>
                )}
                {leaveCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConflictFilter("leave")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      conflictFilter === "leave"
                        ? isDark
                          ? "bg-purple-950/60 border border-purple-700 text-purple-300"
                          : "bg-purple-100 border border-purple-300 text-purple-800"
                        : "text-purple-500/80 hover:text-purple-500"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                    <span>On-Leave ({leaveCount})</span>
                  </button>
                )}
                {absentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setConflictFilter("absent")}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      conflictFilter === "absent"
                        ? isDark
                          ? "bg-rose-950/60 border border-rose-700 text-rose-300"
                          : "bg-rose-100 border border-rose-300 text-rose-800"
                        : "text-rose-500/80 hover:text-rose-500"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>Absent ({absentCount})</span>
                  </button>
                )}
              </div>
            </div>

            <span className="text-xs text-zinc-400 font-medium">
              Showing {filteredPunches.length} of {punches.length} records
            </span>
          </div>

          {/* Data Table */}
          {punches.length === 0 ? (
            <div
              className={`p-12 text-center rounded-2xl border flex flex-col items-center justify-center gap-3 ${
                isDark ? "bg-white/5 border-white/10 text-slate-400" : "bg-white/80 border-black/5 text-slate-500 shadow-2xs"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                  No Logbook Data Extracted Yet
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Upload a photo of your handwritten paper logbook on the left and click &quot;Extract Punches via AI&quot; to begin.
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl border overflow-hidden shadow-sm backdrop-blur-xl ${
                isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
              }`}
            >
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead
                    className={`sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider border-b ${
                      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                    }`}
                  >
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Matched Employee</th>
                      <th className="py-2.5 px-3">Check-In</th>
                      <th className="py-2.5 px-3">Check-Out</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">System Match</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-850">
                    {filteredPunches.map((p) => {
                      const existing = getExistingRecord(p);
                      const rowAction = p.conflictAction || globalConflictStrategy;
                      const isNonWorking = p.status === "Holiday" || p.status === "Clinic Closed" || p.status === "On-Leave" || p.status === "Absent";

                      return (
                        <tr
                          key={p.id}
                          className={`transition ${
                            p.status === "Holiday"
                              ? isDark
                                ? "bg-amber-950/15 hover:bg-amber-950/25"
                                : "bg-amber-50/40 hover:bg-amber-50/70"
                              : p.status === "Clinic Closed"
                              ? isDark
                                ? "bg-slate-900/30 hover:bg-slate-900/45"
                                : "bg-slate-100/50 hover:bg-slate-100/80"
                              : p.status === "On-Leave"
                              ? isDark
                                ? "bg-purple-950/15 hover:bg-purple-950/25"
                                : "bg-purple-50/35 hover:bg-purple-50/65"
                              : p.status === "Absent"
                              ? isDark
                                ? "bg-rose-950/15 hover:bg-rose-950/25"
                                : "bg-rose-50/35 hover:bg-rose-50/65"
                              : existing
                              ? isDark
                                ? "bg-amber-950/10 hover:bg-amber-950/20"
                                : "bg-amber-50/40 hover:bg-amber-50/70"
                              : isDark
                              ? "hover:bg-zinc-800/30"
                              : "hover:bg-zinc-50/60"
                          }`}
                        >
                          {/* Date */}
                          <td className="py-2.5 px-3">
                            <input
                              type="date"
                              value={p.date}
                              onChange={(e) => updatePunch(p.id, "date", e.target.value)}
                              className={`text-xs font-mono px-2 py-1 rounded-md border ${
                                isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-800"
                              }`}
                            />
                          </td>

                          {/* Employee select */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5">
                              <select
                                value={p.employeeId}
                                onChange={(e) => updatePunch(p.id, "employeeId", e.target.value)}
                                className={`text-xs font-semibold px-2 py-1 rounded-md border truncate max-w-[200px] ${
                                  isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-800"
                                }`}
                              >
                                {employees.map((emp) => (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.firstName} {emp.lastName} ({emp.role})
                                  </option>
                                ))}
                              </select>
                              <span className="text-[10px] font-mono text-zinc-400">OCR: {p.detectedName}</span>
                            </div>
                          </td>

                          {/* Check-In */}
                          <td className="py-2.5 px-3">
                            {isNonWorking ? (
                              <div className="flex items-center">
                                <span
                                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border italic flex items-center gap-1.5 ${
                                    p.status === "Holiday"
                                      ? "text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/25"
                                      : p.status === "Clinic Closed"
                                      ? "text-slate-500 dark:text-slate-400 bg-slate-500/10 border-slate-500/25"
                                      : p.status === "On-Leave"
                                      ? "text-purple-500 dark:text-purple-400 bg-purple-500/10 border-purple-500/25"
                                      : "text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/25"
                                  }`}
                                >
                                  <span>
                                    {p.status === "Holiday"
                                      ? `— Holiday ${p.note ? `(${p.note})` : ""}`
                                      : p.status === "Clinic Closed"
                                      ? "— Clinic Closed"
                                      : p.status === "On-Leave"
                                      ? `— Staff Leave ${p.note ? `(${p.note})` : ""}`
                                      : "— Absent"}
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="08:30:00"
                                value={p.checkIn}
                                onChange={(e) => updatePunch(p.id, "checkIn", e.target.value)}
                                className={`text-xs font-mono px-2 py-1 rounded-md border w-24 ${
                                  isDark ? "bg-zinc-900 border-zinc-700 text-emerald-400" : "bg-white border-zinc-300 text-emerald-700"
                                }`}
                              />
                            )}
                          </td>

                          {/* Check-Out */}
                          <td className="py-2.5 px-3">
                            {isNonWorking ? (
                              <span className="text-zinc-500 text-xs px-2">—</span>
                            ) : (
                              <input
                                type="text"
                                placeholder="17:00:00"
                                value={p.checkOut}
                                onChange={(e) => updatePunch(p.id, "checkOut", e.target.value)}
                                className={`text-xs font-mono px-2 py-1 rounded-md border w-24 ${
                                  isDark ? "bg-zinc-900 border-zinc-700 text-blue-400" : "bg-white border-zinc-300 text-blue-700"
                                }`}
                              />
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3">
                            <select
                              value={p.status}
                              onChange={(e) => updatePunch(p.id, "status", e.target.value)}
                              className={`text-xs font-bold px-2 py-1 rounded-md border transition ${
                                p.status === "Holiday"
                                  ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                                  : p.status === "Clinic Closed"
                                  ? "text-slate-500 border-slate-500/30 bg-slate-500/10"
                                  : p.status === "On-Leave"
                                  ? "text-purple-500 border-purple-500/30 bg-purple-500/10"
                                  : p.status === "Absent"
                                  ? "text-rose-500 border-rose-500/30 bg-rose-500/10"
                                  : p.status === "Late"
                                  ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                                  : p.status === "Half-Day"
                                  ? "text-blue-500 border-blue-500/30 bg-blue-500/10"
                                  : "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"
                              }`}
                            >
                              <option value="On-Time">On-Time</option>
                              <option value="Late">Late</option>
                              <option value="Half-Day">Half-Day</option>
                              <option value="Holiday">Holiday</option>
                              <option value="Clinic Closed">Clinic Closed</option>
                              <option value="On-Leave">On-Leave</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </td>

                          {/* Existing System Record Match */}
                          <td className="py-2.5 px-3">
                            {existing ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 w-fit">
                                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  <span>Exists ({existing.authMethod || "Biometric"})</span>
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  In: {existing.checkIn || "--"} | Out: {existing.checkOut || "Active"}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>New Date</span>
                              </span>
                            )}
                          </td>

                          {/* Conflict Action Selector */}
                          <td className="py-2.5 px-3">
                            {existing ? (
                              <select
                                value={rowAction}
                                onChange={(e) =>
                                  updatePunch(p.id, "conflictAction", e.target.value as "merge" | "skip" | "overwrite")
                                }
                                className={`text-[11px] font-bold px-2 py-1 rounded-md border ${
                                  rowAction === "merge"
                                    ? "text-teal-500 border-teal-500/30 bg-teal-500/10"
                                    : rowAction === "skip"
                                    ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                                    : "text-rose-500 border-rose-500/30 bg-rose-500/10"
                                }`}
                              >
                                <option value="merge">Merge (Keep Biometric)</option>
                                <option value="skip">Skip Existing</option>
                                <option value="overwrite">Overwrite Record</option>
                              </select>
                            ) : (
                              <span className="text-[11px] text-zinc-400 font-medium">Insert Clean</span>
                            )}
                          </td>

                          {/* Delete */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removePunch(p.id)}
                              className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                              title="Delete Row"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bottom Confirmation Bar */}
          {punches.length > 0 && (
            <div
              className={`p-4 rounded-2xl border transition backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? "bg-white/5 border-white/10 shadow-xl" : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              }`}
            >
              <div className="text-xs text-zinc-400">
                <span className="font-bold text-zinc-700 dark:text-zinc-200">{punches.length}</span> records ready to import
                {conflictCount > 0 && <span> ({conflictCount} existing matches will be resolved via selected strategy)</span>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  disabled={isSaving}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                    isDark
                      ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                      : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                  }`}
                >
                  Cancel / Return
                </button>

                <button
                  type="button"
                  disabled={punches.length === 0 || isSaving}
                  onClick={handleConfirmImport}
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 ${
                    punches.length === 0 || isSaving
                      ? "opacity-50 cursor-not-allowed bg-zinc-600 text-white"
                      : "bg-gradient-to-r from-teal-500 to-[#0ea5e9] text-white hover:brightness-110 active:scale-[0.98]"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Saving Records...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Confirm &amp; Import {punches.length} Punches</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
