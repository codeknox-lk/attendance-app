"use client";

import React, { useState, useRef } from "react";
import { Employee, AttendanceLog } from "@/app/context/AppContext";

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

interface LogbookScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  employees: Employee[];
  existingAttendanceLogs?: AttendanceLog[];
  defaultMonth?: string; // e.g. "2026-08" or "2026-09"
  onImportSuccess: (importedLogs: AttendanceLog[]) => void;
}

export const LogbookScannerModal: React.FC<LogbookScannerModalProps> = ({
  isOpen,
  onClose,
  isDark,
  employees,
  existingAttendanceLogs = [],
  defaultMonth,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [targetMonth, setTargetMonth] = useState<string>(() => {
    if (defaultMonth && /^\d{4}-\d{2}$/.test(defaultMonth)) return defaultMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Sync targetMonth when defaultMonth prop changes without an effect
  const [prevDefaultMonth, setPrevDefaultMonth] = useState(defaultMonth);
  if (defaultMonth !== prevDefaultMonth) {
    setPrevDefaultMonth(defaultMonth);
    if (defaultMonth && /^\d{4}-\d{2}$/.test(defaultMonth)) {
      setTargetMonth(defaultMonth);
    }
  }

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("medicflow_gemini_api_key") || "";
      } catch {}
    }
    return "";
  });
  const [showKeyField, setShowKeyField] = useState<boolean>(false);

  const handleKeyChange = (val: string) => {
    setGeminiApiKey(val);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("medicflow_gemini_api_key", val.trim());
      } catch {}
    }
  };

  // Analysis status
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState<string>("");
  const [punches, setPunches] = useState<ScannedPunch[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Conflict Resolution state
  const [globalConflictStrategy, setGlobalConflictStrategy] = useState<"merge" | "skip" | "overwrite">("merge");
  const [conflictFilter, setConflictFilter] = useState<"all" | "conflicts" | "new">("all");

  const getExistingRecord = (p: ScannedPunch) => {
    return existingAttendanceLogs.find(l => l.employeeId === p.employeeId && l.date === p.date);
  };

  const conflictCount = punches.filter(p => Boolean(getExistingRecord(p))).length;
  const newCount = punches.length - conflictCount;

  const filteredPunches = punches.filter(p => {
    if (conflictFilter === "conflicts") return Boolean(getExistingRecord(p));
    if (conflictFilter === "new") return !getExistingRecord(p);
    return true;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("File size exceeds 15MB limit. Please upload a smaller photo.");
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessNotice(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Run AI Vision Analysis
  const handleAnalyze = async () => {
    if (!previewUrl) {
      setErrorMessage("Please upload an image of the physical logbook first.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    setAnalyzeStep("Preprocessing image for Vision AI...");

    try {
      if (geminiApiKey.trim() && typeof window !== "undefined") {
        try {
          localStorage.setItem("medicflow_gemini_api_key", geminiApiKey.trim());
        } catch {}
      }

      setAnalyzeStep("Sending image to Gemini Vision OCR...");
      const timer = setTimeout(() => {
        setAnalyzeStep("Interpreting handwriting & matching staff columns...");
      }, 2500);

      const res = await fetch("/api/biometric/scan-logbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("medicflow_user_session")
            ? { "x-clinic-id": JSON.parse(localStorage.getItem("medicflow_user_session") || "{}").clinicId || "default-clinic-id" }
            : {}),
        },
        body: JSON.stringify({
          imageBase64: previewUrl,
          targetMonth,
          staffList: employees.map(e => ({
            id: e.id,
            biometricId: e.biometricId,
            fullName: `${e.firstName} ${e.lastName}`,
            role: e.role,
          })),
          geminiApiKey: geminiApiKey.trim() || undefined,
        }),
      });

      clearTimeout(timer);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to scan handwritten logbook.");
      }

      const rawPunches = data.punches || [];
      if (rawPunches.length === 0) {
        setErrorMessage("No legible attendance rows could be detected in this photo. Please ensure clear lighting and legible date/staff columns.");
        setIsAnalyzing(false);
        return;
      }

      // Map punches into editable table items
      const formatted: ScannedPunch[] = rawPunches.map((p: RawScannedPunch, idx: number) => {
        // Fallback matching if not matched by server
        let empId = p.matchedEmployeeId || "";
        if (!empId) {
          const match = employees.find(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes((p.employeeName || "").toLowerCase()) ||
            (p.employeeName || "").toLowerCase().includes(e.firstName.toLowerCase())
          );
          if (match) empId = match.id;
          else if (employees.length > 0) empId = employees[0].id;
        }

        return {
          id: `punch-${Date.now()}-${idx}`,
          date: p.date || `${targetMonth}-01`,
          employeeId: empId,
          detectedName: p.employeeName || "Unrecognized Staff",
          checkIn: p.checkIn || "08:30:00",
          checkOut: p.checkOut || "",
          status: p.status || "On-Time",
          note: p.note || (p.rawRow ? `OCR: ${p.rawRow}` : "Scanned via Physical Logbook AI"),
          confidence: p.confidence || 0.9,
        };
      });

      setPunches(formatted);
      setSuccessNotice(`Successfully extracted ${formatted.length} punches! Review and adjust below before importing.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during AI analysis.";
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("api key")) {
        setShowKeyField(true);
      }
    } finally {
      setIsAnalyzing(false);
      setAnalyzeStep("");
    }
  };

  // Update a punch row
  const updatePunch = (id: string, field: keyof ScannedPunch, value: string | number) => {
    setPunches(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Remove a punch row
  const removePunch = (id: string) => {
    setPunches(prev => prev.filter(p => p.id !== id));
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
    setPunches(prev => [newPunch, ...prev]);
  };

  // Save reviewed punches to database
  const handleConfirmImport = async () => {
    if (punches.length === 0) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Format payload for batch /api/attendance, filtering skipped records
      const payloadLogs = punches
        .filter(p => {
          const action = p.conflictAction || globalConflictStrategy;
          const existing = getExistingRecord(p);
          return !(existing && action === "skip");
        })
        .map(p => {
          const emp = employees.find(e => e.id === p.employeeId);
          return {
            employeeId: p.employeeId,
            biometricId: emp?.biometricId || p.employeeId,
            employeeFirstName: emp?.firstName || "Staff",
            employeeLastName: emp?.lastName || "",
            date: p.date,
            checkIn: p.checkIn || "08:30:00",
            checkOut: p.checkOut || null,
            status: p.status || "On-Time",
            authMethod: "Physical Logbook (AI OCR)",
            conflictAction: p.conflictAction || globalConflictStrategy,
          };
        });

      let clinicId = "default-clinic-id";
      if (typeof window !== "undefined") {
        try {
          const session = localStorage.getItem("medicflow_user_session");
          if (session) clinicId = JSON.parse(session).clinicId || "default-clinic-id";
        } catch {}
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-clinic-id": clinicId,
        },
        body: JSON.stringify({ logs: payloadLogs, defaultConflictStrategy: globalConflictStrategy }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save attendance records to database.");
      }

      const savedList: AttendanceLog[] = data.logs || [];
      onImportSuccess(savedList);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to finalize attendance import.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md transition-all duration-200 animate-in fade-in bg-slate-900/60 dark:bg-black/80">
      <div
        className={`relative w-full max-w-5xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] transition-all backdrop-blur-xl ${
          isDark ? "bg-zinc-900/95 border-zinc-800 text-white" : "bg-white/95 border-zinc-200 text-zinc-900"
        }`}
      >
        {/* Top Accent Gradient Bar */}
        <div className="h-1 bg-gradient-to-r from-teal-500 via-[#0ea5e9] to-indigo-500 shrink-0" />

        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              isDark ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" : "bg-teal-50 text-teal-600 border border-teal-200"
            }`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2m-10 0H5a2 2 0 01-2-2v-2M7 12h10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                  Scan Physical Attendance Logbook
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-teal-500 to-[#0ea5e9] text-white px-2 py-0.5 rounded-full shadow-sm">
                  AI Vision
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Upload handwritten clinic punch sheets to extract, match, and import records into MedSync.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
            }`}
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Clear In-UI Instructions Card */}
          <div className={`rounded-xl border p-4 transition-all ${
            isDark ? "bg-zinc-950/60 border-zinc-800/80" : "bg-teal-50/50 border-teal-100 text-zinc-800"
          }`}>
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setShowInstructions(p => !p)}>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth={3} strokeLinecap="round" />
                  </svg>
                </div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Best Practices for Maximum AI Recognition Accuracy
                </h4>
              </div>
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                <span>{showInstructions ? "Hide Instructions" : "Show Instructions"}</span>
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showInstructions ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>

            {showInstructions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/60 text-xs">
                <div className={`p-3 rounded-lg border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                  <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 mb-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <span>Flat &amp; Even Light</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Take a clear, top-down photo under bright lighting. Avoid tilted angles, finger shadows, or paper folds.
                  </p>
                </div>
                <div className={`p-3 rounded-lg border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
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
                    Set the target month selector below (e.g., August 2026) so row day numbers (1–31) map to exact calendar dates.
                  </p>
                </div>
                <div className={`p-3 rounded-lg border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                  <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 mb-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Staff Matching</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    The AI cross-checks handwritten names against your {employees.filter(e => e.active !== false).length} active clinic staff members automatically.
                  </p>
                </div>
                <div className={`p-3 rounded-lg border ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200/80"}`}>
                  <div className="flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 mb-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Editable Review</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Review every recognized punch in the interactive table before importing. Correct or delete rows anytime.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Photo Upload & Target Month Config */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dropzone (2 cols on md) */}
            <div className="md:col-span-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />

              {!previewUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDark
                      ? "border-zinc-700 hover:border-teal-500 bg-zinc-950/40 hover:bg-zinc-950/70"
                      : "border-zinc-300 hover:border-teal-500 bg-zinc-50/60 hover:bg-zinc-50"
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-500 dark:text-teal-400 mb-3 shadow-inner">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                    Click to browse or drag & drop handwritten logbook photo
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Supports JPG, PNG, WEBP up to 15MB
                  </p>
                </div>
              ) : (
                <div className={`relative rounded-2xl border overflow-hidden p-3 flex items-center gap-4 ${
                  isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                }`}>
                  <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-zinc-700/50 shrink-0 bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Logbook Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">
                        {selectedFile?.name || "Logbook Image"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20 shrink-0">
                        Ready to Scan
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Image Loaded"}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                          isDark ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm"
                        }`}
                      >
                        Replace Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); setPunches([]); }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls (1 col on md) */}
            <div className={`rounded-2xl border p-4 space-y-4 flex flex-col justify-between ${
              isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
            }`}>
              <div className="space-y-3">
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
                          !geminiApiKey.trim()
                            ? "border-amber-400/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            : ""
                        } ${
                          isDark ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-zinc-300 text-zinc-800"
                        }`}
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
              </div>

              {/* Start Scan Button */}
              <button
                type="button"
                disabled={!previewUrl || isAnalyzing}
                onClick={handleAnalyze}
                className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 ${
                  !previewUrl || isAnalyzing
                    ? "opacity-50 cursor-not-allowed bg-zinc-600 text-white"
                    : "bg-gradient-to-r from-teal-500 to-[#0ea5e9] text-white hover:brightness-110 active:scale-[0.99]"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Analyzing Handwriting...</span>
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

          {/* Analyzing Progress indicator */}
          {isAnalyzing && (
            <div className={`p-4 rounded-xl border animate-pulse ${
              isDark ? "bg-zinc-950 border-teal-500/30 text-teal-400" : "bg-teal-50 border-teal-200 text-teal-700"
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
                <span className="text-xs font-bold">{analyzeStep}</span>
              </div>
              <div className="w-full bg-zinc-700/20 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-500 to-[#0ea5e9] h-full rounded-full animate-[shimmer_2s_infinite]" style={{ width: "70%" }} />
              </div>
            </div>
          )}

          {/* Feedback Notices */}
          {errorMessage && (
            <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
              isDark ? "bg-rose-950/40 border-rose-800 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              isDark ? "bg-emerald-950/40 border-emerald-800 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successNotice}</span>
              </div>
              <button
                type="button"
                onClick={addManualPunch}
                className="text-[11px] underline font-bold hover:text-emerald-400 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Manual Row</span>
              </button>
            </div>
          )}

          {/* 3. Interactive Preview & Verification Table */}
          {punches.length > 0 && (
            <div className="space-y-4">
              {/* Conflict Notification Banner */}
              {conflictCount > 0 && (
                <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isDark ? "bg-amber-950/20 border-amber-800/40 text-amber-200" : "bg-amber-50/80 border-amber-200 text-amber-900 shadow-xs"
                }`}>
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Overwrite All</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Table Toolbar: Filter pills and Add Row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Punches:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setConflictFilter("all")}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        conflictFilter === "all"
                          ? isDark ? "bg-zinc-800 text-white border border-zinc-700" : "bg-zinc-900 text-white"
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
                          ? isDark ? "bg-emerald-950/60 border border-emerald-700 text-emerald-300" : "bg-emerald-100 border border-emerald-300 text-emerald-800"
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
                            ? isDark ? "bg-amber-950/60 border border-amber-700 text-amber-300" : "bg-amber-100 border border-amber-300 text-amber-800"
                            : "text-amber-500/80 hover:text-amber-500"
                        }`}
                      >
                        <svg className="w-3 h-3 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Conflicts ({conflictCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 font-bold">
                    Target: {targetMonth}
                  </span>
                  <button
                    type="button"
                    onClick={addManualPunch}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition ${
                      isDark ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>+</span>
                    <span>Add Row</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className={`rounded-xl border overflow-hidden ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={`text-[10px] uppercase tracking-wider text-zinc-400 border-b sticky top-0 z-10 ${
                        isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                      }`}>
                        <th className="text-left py-2.5 px-3">Date</th>
                        <th className="text-left py-2.5 px-3">Assign Clinic Staff</th>
                        <th className="text-left py-2.5 px-3">In Time</th>
                        <th className="text-left py-2.5 px-3">Out Time</th>
                        <th className="text-left py-2.5 px-3">Status</th>
                        <th className="text-left py-2.5 px-3">Existing System Record</th>
                        <th className="text-left py-2.5 px-3">Import Action</th>
                        <th className="text-center py-2.5 px-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-zinc-800/60" : "divide-zinc-100"}`}>
                      {filteredPunches.map((p) => {
                        const existing = getExistingRecord(p);
                        const rowAction = p.conflictAction || globalConflictStrategy;

                        return (
                          <tr key={p.id} className={isDark ? "hover:bg-zinc-800/30" : "hover:bg-zinc-50"}>
                            {/* Date Input */}
                            <td className="py-2 px-3">
                              <input
                                type="date"
                                value={p.date}
                                onChange={(e) => updatePunch(p.id, "date", e.target.value)}
                                className={`text-xs font-mono px-2 py-1 rounded-md border w-32 ${
                                  isDark ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white border-zinc-300 text-zinc-800"
                                }`}
                              />
                            </td>

                            {/* Employee Selector & Detected Name */}
                            <td className="py-2 px-3">
                              <div className="flex flex-col gap-1">
                                <select
                                  value={p.employeeId}
                                  onChange={(e) => updatePunch(p.id, "employeeId", e.target.value)}
                                  className={`text-xs font-semibold px-2 py-1 rounded-md border w-44 ${
                                    isDark ? "bg-zinc-900 border-zinc-700 text-zinc-100" : "bg-white border-zinc-300 text-zinc-800"
                                  }`}
                                >
                                  {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.firstName} {emp.lastName} ({emp.role})
                                    </option>
                                  ))}
                                </select>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  OCR: {p.detectedName}
                                </span>
                              </div>
                            </td>

                            {/* Check-In */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="08:30:00"
                                value={p.checkIn}
                                onChange={(e) => updatePunch(p.id, "checkIn", e.target.value)}
                                className={`text-xs font-mono px-2 py-1 rounded-md border w-24 ${
                                  isDark ? "bg-zinc-900 border-zinc-700 text-emerald-400" : "bg-white border-zinc-300 text-emerald-700"
                                }`}
                              />
                            </td>

                            {/* Check-Out */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="17:00:00"
                                value={p.checkOut}
                                onChange={(e) => updatePunch(p.id, "checkOut", e.target.value)}
                                className={`text-xs font-mono px-2 py-1 rounded-md border w-24 ${
                                  isDark ? "bg-zinc-900 border-zinc-700 text-blue-400" : "bg-white border-zinc-300 text-blue-700"
                                }`}
                              />
                            </td>

                            {/* Status */}
                            <td className="py-2 px-3">
                              <select
                                value={p.status}
                                onChange={(e) => updatePunch(p.id, "status", e.target.value)}
                                className={`text-xs font-bold px-2 py-1 rounded-md border ${
                                  isDark ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-white border-zinc-300 text-zinc-800"
                                }`}
                              >
                                <option value="On-Time">On-Time</option>
                                <option value="Late">Late</option>
                                <option value="Half-Day">Half-Day</option>
                                <option value="On-Leave">On-Leave</option>
                                <option value="Absent">Absent</option>
                              </select>
                            </td>

                            {/* Existing System Record Match */}
                            <td className="py-2 px-3">
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
                            <td className="py-2 px-3">
                              {existing ? (
                                <select
                                  value={rowAction}
                                  onChange={(e) => updatePunch(p.id, "conflictAction", e.target.value as "merge" | "skip" | "overwrite")}
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
                                <span className="text-[11px] text-zinc-400 font-medium">
                                  Insert Clean
                                </span>
                              )}
                            </td>

                            {/* Delete */}
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removePunch(p.id)}
                                className="p-1 rounded-md text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                                title="Delete Row"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-between px-6 py-4 border-t shrink-0 ${
          isDark ? "border-zinc-800" : "border-zinc-200"
        }`}>
          <div className="text-xs text-zinc-400">
            {punches.length > 0 ? (
              <span>
                {punches.filter(p => !(getExistingRecord(p) && (p.conflictAction || globalConflictStrategy) === "skip")).length} of {punches.length} punches ready to import
                {conflictCount > 0 ? ` (${conflictCount} existing merged/resolved)` : ""}
              </span>
            ) : (
              <span>Select logbook photo and click Analyze to begin</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm"
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={punches.length === 0 || isSaving}
              onClick={handleConfirmImport}
              className={`px-5 py-2 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 ${
                punches.length === 0 || isSaving
                  ? "opacity-50 cursor-not-allowed bg-zinc-600 text-white"
                  : "bg-[#0F85B0] hover:bg-[#0c6c8f] text-white active:scale-[0.99]"
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving Records...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    Confirm &amp; Import {punches.filter(p => !(getExistingRecord(p) && (p.conflictAction || globalConflictStrategy) === "skip")).length} Punches
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
