
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  useApp, Employee, AttendanceLog, Allowance, LeaveRequest, PublicHoliday, BiometricSettings, CompanyProfile, EpfSettings
} from "./context/AppContext";
import { LoginView } from "@/components/auth/LoginView";

// ─── Navigation ──────────────────────────────────────────────────────────────

const NAV_TABS = [
  { id: "dashboard", label: "Dashboard", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" },
  { id: "attendance", label: "Attendance", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "leave", label: "Leave Manager", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { id: "payroll", label: "Payroll Engine", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { id: "reports", label: "Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "selfservice", label: "Self-Service", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
] as const;

type TabId = typeof NAV_TABS[number]["id"];

const SETTINGS_TABS = [
  { id: "biometric", label: "Biometric Hardware" },
  { id: "company", label: "Clinic Profile" },
  { id: "security", label: "Security & PIN" },
  { id: "epf", label: "Salary & Dynamic Bonuses" },
  { id: "staff", label: "Staff Directory" },
  { id: "operating-hours", label: "Operating Hours" },
  { id: "holidays", label: "Holidays" },
] as const;

type SettingsTabId = typeof SETTINGS_TABS[number]["id"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColor = (status: string, dark: boolean): string => {
  const map: Record<string, [string, string]> = {
    "On-Time":  ["text-emerald-600 bg-emerald-50 border-emerald-200",  "text-emerald-400 bg-emerald-950/40 border-emerald-900"],
    Late:       ["text-amber-600 bg-amber-50 border-amber-200",         "text-amber-400 bg-amber-950/40 border-amber-900"],
    "Half-Day": ["text-blue-600 bg-blue-50 border-blue-200",            "text-blue-400 bg-blue-950/40 border-blue-900"],
    "On-Leave": ["text-purple-600 bg-purple-50 border-purple-200",      "text-purple-400 bg-purple-950/40 border-purple-900"],
    Absent:     ["text-rose-600 bg-rose-50 border-rose-200",            "text-rose-400 bg-rose-950/40 border-rose-900"],
    Pending:    ["text-amber-600 bg-amber-50 border-amber-200",         "text-amber-400 bg-amber-950/40 border-amber-900"],
    Approved:   ["text-emerald-600 bg-emerald-50 border-emerald-200",   "text-emerald-400 bg-emerald-950/40 border-emerald-900"],
    Rejected:   ["text-rose-600 bg-rose-50 border-rose-200",            "text-rose-400 bg-rose-950/40 border-rose-900"],
    Connected:  ["text-emerald-600 bg-emerald-50 border-emerald-200",   "text-emerald-400 bg-emerald-950/40 border-emerald-900"],
    Disconnected:["text-rose-600 bg-rose-50 border-rose-200",           "text-rose-400 bg-rose-950/40 border-rose-900"],
    Finalized:  ["text-[#0F85B0] bg-[#f0f9ff] border-[#bae6fd]",      "text-[#38bdf8] bg-[#042633]/40 border-[#06394d]"],
    Draft:      ["text-zinc-600 bg-zinc-50 border-zinc-200",            "text-zinc-400 bg-zinc-900 border-zinc-800"],
  };
  const pair = map[status] ?? ["text-zinc-600 bg-zinc-50 border-zinc-200", "text-zinc-400 bg-zinc-900 border-zinc-800"];
  return pair[dark ? 1 : 0];
};

const inputCls = (dark: boolean) => `w-full border rounded-md px-3 py-2 text-xs focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 ${dark ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-800"}`;
const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5";
const cardCls = (dark: boolean) => `rounded-2xl border p-5 backdrop-blur-xl transition-all ${dark ? "bg-white/5 border-white/10 shadow-xl" : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"}`;

const daySuffix = (d: number) => d===1||d===21||d===31?"st":d===2||d===22?"nd":d===3||d===23?"rd":"th";

const formatHoursAndMins = (decimalHours: number, options?: { showZero?: boolean; short?: boolean }): string => {
  if (!decimalHours || isNaN(decimalHours) || decimalHours <= 0) {
    return options?.showZero ? (options?.short ? "0m" : "0 min") : (options?.short ? "0h" : "0 h");
  }
  const totalMinutes = Math.round(decimalHours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (options?.short) {
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  if (h > 0 && m > 0) {
    return `${h} h & ${m} min`;
  }
  if (h > 0) {
    return `${h} h`;
  }
  return `${m} min`;
};

const calculateWorkedHours = (checkIn?: string | null, checkOut?: string | null): number => {
  if (!checkIn || !checkOut || checkOut === "–" || checkOut.toLowerCase().includes("active")) return 0;
  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return 0;
  
  const inMinutes = inH * 60 + inM;
  let outMinutes = outH * 60 + outM;
  if (outMinutes < inMinutes) {
    outMinutes += 24 * 60;
  }
  return Math.max(0, (outMinutes - inMinutes) / 60);
};

const calculateOvertimeHours = (
  checkOut: string | null | undefined,
  date: string,
  operatingHours: { dayOfWeek: number; isOpen: boolean; startTime: string; endTime: string }[],
  otCalculationType: string = "Strict",
  graceMinutes: number = 30
): number => {
  if (otCalculationType === "Manual" || otCalculationType === "Disabled") return 0;
  if (!checkOut || checkOut === "–" || checkOut.toLowerCase().includes("active")) return 0;
  
  const logDate = new Date(date + "T00:00:00Z");
  const dayOfWeek = logDate.getUTCDay();
  const opHour = operatingHours.find(h => h.dayOfWeek === dayOfWeek);
  if (!opHour || !opHour.isOpen) return 0;

  const [endH, endM] = opHour.endTime.split(":").map(Number);
  const shiftEndMinutes = endH * 60 + endM;

  const [outH, outM] = checkOut.split(":").map(Number);
  const checkOutMinutes = outH * 60 + outM;

  if (otCalculationType === "Strict") {
    if (checkOutMinutes > shiftEndMinutes) {
      return (checkOutMinutes - shiftEndMinutes) / 60;
    }
  } else if (otCalculationType === "Grace Period") {
    if (checkOutMinutes > shiftEndMinutes + graceMinutes) {
      return (checkOutMinutes - shiftEndMinutes) / 60;
    }
  }
  return 0;
};

const calculateIsPunctual = (
  checkIn: string | null | undefined,
  date: string,
  operatingHours: { dayOfWeek: number; isOpen: boolean; startTime: string; endTime: string }[],
  punctualGraceType: string = "Strict",
  punctualGraceMinutes: number = 15
): boolean => {
  if (!checkIn || checkIn === "–" || checkIn.toLowerCase().includes("active")) return false;
  
  const logDate = new Date(date + "T00:00:00Z");
  const dayOfWeek = logDate.getUTCDay();
  const opHour = operatingHours.find(h => h.dayOfWeek === dayOfWeek);
  if (!opHour || !opHour.isOpen) return true;

  const [startH, startM] = opHour.startTime.split(":").map(Number);
  const shiftStartMinutes = startH * 60 + startM;

  const [inH, inM] = checkIn.split(":").map(Number);
  const checkInMinutes = inH * 60 + inM;

  const allowedLateMinutes = punctualGraceType === "Strict" ? 0 : punctualGraceMinutes;
  return checkInMinutes <= (shiftStartMinutes + allowedLateMinutes);
};

const Icons = {
  Users: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  CheckCircle: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Clock: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Sun: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  AlertTriangle: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Camera: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Clipboard: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M8 5a2 2 0 002 2h4a2 2 0 002-2M8 5a2 2 0 012-2h4a2 2 0 012 2" />
    </svg>
  ),
  Bolt: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  LockClosed: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  LockOpen: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  ),
  Printer: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H8a2 2 0 00-2 2v4h12z" />
    </svg>
  ),
  Refresh: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Download: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Shield: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  User: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  FileText: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Check: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Moon: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Edit: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Pencil: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Trash: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Search: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  TrendingUp: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  Calendar: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  ChevronLeft: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  Plus: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Star: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  ),
  HeartPulse: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  Coffee: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
    </svg>
  ),
  Plane: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  Home: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Briefcase: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Wallet: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
};

// ─── Salary Trend Chart (needs own state for hover tooltips) ────────────────

type PayrollPeriodSummary = { id: string; label: string; grossSalaryPool: number; netRemittances: number; };

function ClinicActivityChart({ logs, isDark }: { logs: AttendanceLog[]; isDark: boolean }) {
  const { operatingHours, publicHolidays } = useApp();

  const daysData = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayLogs = logs.filter(l => l.date === dateStr);
      const presentCount = dayLogs.filter(l => ["On-Time", "Late", "Half-Day"].includes(l.status)).length;
      
      // Calculate worked hours for the day
      let hours = 0;
      dayLogs.forEach(l => {
        if (l.checkIn && l.checkOut) {
          const [h1, m1] = l.checkIn.split(":").map(Number);
          const [h2, m2] = l.checkOut.split(":").map(Number);
          const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (diffMin > 0) hours += Math.round((diffMin / 60) * 10) / 10;
        } else if (l.checkIn) {
          hours += 1;
        }
      });

      const dayOfWeek = d.getDay();
      const opHour = operatingHours.find(h => h.dayOfWeek === dayOfWeek);
      const isPublicHoliday = publicHolidays.some(h => h.date === dateStr);
      const isClosed = (opHour && !opHour.isOpen) || isPublicHoliday;
      
      result.push({ date: dateStr, day: dayName, present: presentCount, hours: Math.min(12, hours), isClosed });
    }
    return result;
  }, [logs, operatingHours, publicHolidays]);

  const totalWeeklyHours = daysData.reduce((acc, d) => acc + d.hours, 0);

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">7-Day Clinic Attendance &amp; Shift Activity</h3>
          <p className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Live worked hours calculated from biometric scans</p>
        </div>
        <span className="text-[10px] font-mono font-bold text-[#38bdf8] bg-[#0ea5e9]/10 border border-[#0ea5e9]/20 px-2.5 py-1 rounded-lg">
          {formatHoursAndMins(totalWeeklyHours)} Logged
        </span>
      </div>

      <div className={`grid grid-cols-7 gap-3 items-end pt-2 pb-3.5 px-3 border-b ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
        {daysData.map((d, idx) => {
          const heightPct = d.hours > 0 ? Math.max(18, (d.hours / 10) * 100) : 6;
          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 group">
              <span className={`text-[10px] font-mono font-bold ${d.hours > 0 ? "text-[#38bdf8]" : d.isClosed ? "text-amber-500" : "text-slate-400"}`}>
                {d.hours > 0 ? formatHoursAndMins(d.hours, { short: true }) : d.isClosed ? "CLOSED" : "0h"}
              </span>
              <div className={`w-full max-w-[32px] rounded-t-xl overflow-hidden h-24 flex items-end p-0.5 border ${isDark ? "bg-slate-800/50 border-slate-700/40" : "bg-slate-100 border-slate-200"}`}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    d.hours > 0
                      ? "bg-gradient-to-t from-[#0F85B0] via-[#0ea5e9] to-teal-400 shadow-md shadow-[#0F85B0]/20"
                      : d.isClosed
                        ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(245,158,11,0.2)_4px,rgba(245,158,11,0.2)_8px)] border border-amber-500/30"
                        : isDark ? "bg-slate-800/20" : "bg-slate-200/50"
                  }`}
                  style={{ height: d.isClosed && d.hours === 0 ? "100%" : `${heightPct}%` }}
                />
              </div>
              <span className={`text-[11px] font-extrabold leading-tight mt-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>{d.day}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0F85B0] animate-pulse"/>Weekly Attendance Overview</span>
        <span className="font-mono font-bold text-[#38bdf8]">
          {operatingHours.find(h => h.dayOfWeek === new Date().getDay())?.isOpen 
            ? `Today's Clinic Hours: ${operatingHours.find(h => h.dayOfWeek === new Date().getDay())?.startTime} → ${operatingHours.find(h => h.dayOfWeek === new Date().getDay())?.endTime}`
            : "Today: CLOSED"}
        </span>
      </div>
    </div>
  );
}

function SalaryTrendChart({ history, logs, isDark }: { history: PayrollPeriodSummary[]; logs: AttendanceLog[]; isDark: boolean }) {
  const [hovered, setHovered] = useState<{ i: number; type: "gross" | "net" } | null>(null);

  const data = [...history].reverse().slice(-6);
  if (data.length < 2) return <ClinicActivityChart logs={logs} isDark={isDark} />;

  const W = 600; const H = 180; const padL = 62; const padB = 32; const padT = 16; const padR = 20;
  const chartW = W - padL - padR; const chartH = H - padB - padT;
  const allVals = data.flatMap(d => [d.grossSalaryPool, d.netRemittances]);
  const maxV = Math.max(...allVals); const minV = Math.min(...allVals);
  const rawRange = maxV - minV;
  const padding = rawRange * 0.15 || maxV * 0.1 || 1;
  const domMin = Math.max(0, minV - padding);
  const domMax = maxV + padding;
  const range = domMax - domMin;
  const xOf = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const yOf = (v: number) => padT + chartH - ((v - domMin) / range) * chartH;
  const fmtLKR = (v: number) => v >= 1_000_000 ? `LKR ${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `LKR ${Math.round(v/1000)}K` : `LKR ${Math.round(v)}`;
  const fmtK = (v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v/1000)}K` : String(Math.round(v));

  const cubicPath = (pts: [number, number][]) => pts.reduce((acc, [x, y], i, a) => {
    if (i === 0) return `M${x.toFixed(2)},${y.toFixed(2)}`;
    const [px, py] = a[i - 1];
    const cpx = ((px + x) / 2).toFixed(2);
    return `${acc} C${cpx},${py.toFixed(2)} ${cpx},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
  }, "");

  const grossPts: [number, number][] = data.map((d, i) => [xOf(i), yOf(d.grossSalaryPool)]);
  const netPts: [number, number][] = data.map((d, i) => [xOf(i), yOf(d.netRemittances)]);
  const grossPath = cubicPath(grossPts);
  const netPath = cubicPath(netPts);
  const grossArea = `${grossPath} L${xOf(data.length - 1).toFixed(2)},${(padT + chartH).toFixed(2)} L${padL},${(padT + chartH).toFixed(2)} Z`;
  const netArea = `${netPath} L${xOf(data.length - 1).toFixed(2)},${(padT + chartH).toFixed(2)} L${padL},${(padT + chartH).toFixed(2)} Z`;
  const gridCount = 4;

  const hData = hovered ? data[hovered.i] : null;
  const hGx = hovered ? grossPts[hovered.i][0] : 0;
  const hGy = hovered ? grossPts[hovered.i][1] : 0;
  const hNx = hovered ? netPts[hovered.i][0] : 0;
  const hNy = hovered ? netPts[hovered.i][1] : 0;
  const hX = hovered ? (hovered.type === "gross" ? hGx : hNx) : 0;
  const hY = hovered ? (hovered.type === "gross" ? hGy : hNy) : 0;
  // Tooltip box dimensions
  const TW = 148; const TH = 80;
  // Keep tooltip inside SVG
  const tipX = Math.min(Math.max(hX - TW / 2, padL), W - padR - TW);
  const tipY = hY - TH - 12 < padT ? hY + 14 : hY - TH - 12;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: "200px" }}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="tgGross" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? "#818cf8" : "#6366f1"} stopOpacity="0.4" />
          <stop offset="100%" stopColor={isDark ? "#818cf8" : "#6366f1"} stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="tgNet" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity="0.01" />
        </linearGradient>
        <filter id="tcGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="tipShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={isDark ? "#000" : "#94a3b8"} floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Grid */}
      {Array.from({ length: gridCount + 1 }, (_, i) => {
        const v = domMin + (range / gridCount) * i;
        const y = yOf(v);
        return (
          <g key={`grid-${i}`}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke={isDark ? "#27272a" : "#e4e4e7"} strokeWidth="0.8" strokeDasharray="4,3" />
            <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize="9"
              fill={isDark ? "#52525b" : "#a1a1aa"} fontFamily="monospace">{fmtK(v)}</text>
          </g>
        );
      })}

      {/* Crosshair when hovered */}
      {hovered && (
        <line
          x1={hX} y1={padT} x2={hX} y2={padT + chartH}
          stroke={isDark ? "#52525b" : "#cbd5e1"}
          strokeWidth="1" strokeDasharray="3,3"
        />
      )}

      {/* Area fills */}
      <path d={grossArea} fill="url(#tgGross)" />
      <path d={netArea} fill="url(#tgNet)" />

      {/* Lines */}
      <path d={grossPath} fill="none"
        stroke={isDark ? "#818cf8" : "#6366f1"} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#tcGlow)" />
      <path d={netPath} fill="none"
        stroke={isDark ? "#34d399" : "#10b981"} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" filter="url(#tcGlow)" />

      {/* Data points with hover targets */}
      {data.map((d, i) => {
        const gx = grossPts[i][0]; const gy = grossPts[i][1];
        const nx = netPts[i][0]; const ny = netPts[i][1];
        const label = d.label.split(" ")[0].slice(0, 3);
        const gActive = hovered?.i === i && hovered.type === "gross";
        const nActive = hovered?.i === i && hovered.type === "net";
        return (
          <g key={`point-${d.id}`}>
            {/* X label */}
            <text x={xOf(i)} y={H - 8} textAnchor="middle" fontSize="9"
              fill={hovered?.i === i ? (isDark ? "#e4e4e7" : "#3f3f46") : (isDark ? "#52525b" : "#a1a1aa")}
              fontWeight={hovered?.i === i ? "bold" : "normal"}>{label}</text>

            {/* Gross dot — pulse ring when active */}
            {gActive && <circle cx={gx} cy={gy} r="9" fill="none"
              stroke={isDark ? "#818cf8" : "#6366f1"} strokeWidth="1.5" strokeOpacity="0.4" />}
            <circle cx={gx} cy={gy} r={gActive ? 6 : 4}
              fill={isDark ? "#818cf8" : "#6366f1"}
              stroke={isDark ? "#18181b" : "white"} strokeWidth="2"
              style={{ cursor: "pointer", transition: "r 0.15s" }}
              onMouseEnter={() => setHovered({ i, type: "gross" })} />

            {/* Net dot — pulse ring when active */}
            {nActive && <circle cx={nx} cy={ny} r="9" fill="none"
              stroke={isDark ? "#34d399" : "#10b981"} strokeWidth="1.5" strokeOpacity="0.4" />}
            <circle cx={nx} cy={ny} r={nActive ? 6 : 4}
              fill={isDark ? "#34d399" : "#10b981"}
              stroke={isDark ? "#18181b" : "white"} strokeWidth="2"
              style={{ cursor: "pointer", transition: "r 0.15s" }}
              onMouseEnter={() => setHovered({ i, type: "net" })} />

            {/* Connector line */}
            <line x1={gx} y1={gy} x2={nx} y2={ny}
              stroke={isDark ? "#3f3f46" : "#e4e4e7"} strokeWidth="0.8" strokeDasharray="2,2" />
          </g>
        );
      })}

      {/* Baseline */}
      <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH}
        stroke={isDark ? "#3f3f46" : "#d4d4d8"} strokeWidth="1" />

      {/* ── Tooltip ── */}
      {hovered && hData && (
        <g filter="url(#tipShadow)">
          {/* Card background */}
          <rect x={tipX} y={tipY} width={TW} height={TH} rx="6" ry="6"
            fill={isDark ? "#18181b" : "#ffffff"}
            stroke={isDark ? "#3f3f46" : "#e4e4e7"} strokeWidth="1" />

          {/* Month header */}
          <text x={tipX + TW / 2} y={tipY + 14} textAnchor="middle" fontSize="9.5"
            fontWeight="bold" fill={isDark ? "#e4e4e7" : "#18181b"} fontFamily="system-ui">
            {hData.label}
          </text>

          {/* Divider */}
          <line x1={tipX + 10} y1={tipY + 20} x2={tipX + TW - 10} y2={tipY + 20}
            stroke={isDark ? "#27272a" : "#f4f4f5"} strokeWidth="0.8" />

          {/* Gross row */}
          <circle cx={tipX + 16} cy={tipY + 32} r="3.5" fill={isDark ? "#818cf8" : "#6366f1"} />
          <text x={tipX + 24} y={tipY + 36} fontSize="8.5" fill={isDark ? "#a1a1aa" : "#71717a"} fontFamily="system-ui">Gross</text>
          <text x={tipX + TW - 8} y={tipY + 36} textAnchor="end" fontSize="9" fontWeight="bold"
            fill={isDark ? "#818cf8" : "#6366f1"} fontFamily="monospace">
            {fmtLKR(hData.grossSalaryPool)}
          </text>

          {/* Net row */}
          <circle cx={tipX + 16} cy={tipY + 50} r="3.5" fill={isDark ? "#34d399" : "#10b981"} />
          <text x={tipX + 24} y={tipY + 54} fontSize="8.5" fill={isDark ? "#a1a1aa" : "#71717a"} fontFamily="system-ui">Net</text>
          <text x={tipX + TW - 8} y={tipY + 54} textAnchor="end" fontSize="9" fontWeight="bold"
            fill={isDark ? "#34d399" : "#10b981"} fontFamily="monospace">
            {fmtLKR(hData.netRemittances)}
          </text>

          {/* Spread row */}
          <line x1={tipX + 10} y1={tipY + 62} x2={tipX + TW - 10} y2={tipY + 62}
            stroke={isDark ? "#27272a" : "#f4f4f5"} strokeWidth="0.8" />
          <text x={tipX + 10} y={tipY + 74} fontSize="8" fill={isDark ? "#52525b" : "#a1a1aa"} fontFamily="system-ui">
            Deductions
          </text>
          <text x={tipX + TW - 8} y={tipY + 74} textAnchor="end" fontSize="8" fontWeight="bold"
            fill={isDark ? "#f87171" : "#ef4444"} fontFamily="monospace">
            -{fmtLKR(hData.grossSalaryPool - hData.netRemittances)}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Home() {
  const {
    currentUser, loginUser, logoutUser,
    employees, attendanceLogs, allowances, employeeAllowances, operatingHours, leaveRequests,
    payrollHistory, auditLogs, publicHolidays, apitSlabs,
    biometricSettings, epfSettings, payrollCycleStartDay, adminPin, companyProfile, manualAdjustments,
    addEmployee, updateEmployee, deleteEmployee,
    updateAttendanceLog, deleteAttendanceLog,
    addAllowance, updateAllowance, deleteAllowance,
    updateOperatingHours,
    addLeaveRequest, approveLeave, rejectLeave,
    finalizePayroll,
    addHoliday, deleteHoliday, toggleHolidayDoubleOT,
    updateBiometricSettings, updateEpfSettings, updatePayrollCycleStartDay,
    triggerSync, simulateHikvisionScan,
    isAdminAuthenticated, verifyAdminPin, updateAdminPin, logoutAdmin,
    updateCompanyProfile, updatePayslipAdjustment,
    machinePersons, fetchMachinePersons, isFetchingPersons,
    monthlyExcessIncome, updateMonthlyExcessIncome,
    salarySettings, updateSalarySettings,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medsync_theme");
        if (saved !== null) return saved === "dark";
      } catch {}
    }
    return true;
  });
  const [hasMounted, setHasMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const h = requestAnimationFrame(() => setHasMounted(true));
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medsync_theme");
        if (saved !== null) {
          if (saved === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      } catch {}
    }
    return () => cancelAnimationFrame(h);
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("medsync_theme", next ? "dark" : "light");
          if (next) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        } catch {}
      }
      return next;
    });
  };


  // ── Admin Security state ──
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [targetProtectedTab, setTargetProtectedTab] = useState<TabId | null>(null);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // ── Filters ──
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("All");
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(10);
  const [selectedCalMonth, setSelectedCalMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<string>("All Years");
  const [selectedHistoryPeriodId, setSelectedHistoryPeriodId] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("All");
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(null);

  // ── Settings state ──
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("biometric");
  const [simulatingScan, setSimulatingScan] = useState(false);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [selectedSimEmpId, setSelectedSimEmpId] = useState<string>("101");
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string>("");

  // ── Payroll lock state (tracked via payrollHistory) ──

  // ── Modal/Drawer states ──
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string|null>(null);
  const [newEmp, setNewEmp] = useState<Omit<Employee,"id"|"active">>({
    firstName:"", lastName:"", role:"Nurse", payType:"Fixed Monthly",
    basicSalary:50000, hourlyRate:300, sessionRate:0, commissionRate:0,
    biometricId:"", epfEligible:true, taxable:false,  branchId:null,
    allowanceIds:[], leaveBalances:{annual:14,sick:7,casual:3}, attendanceBonusRate:0, punctualBonusRate:0, incomeBonusPercentage:0,
  });

  const [drawerLogId, setDrawerLogId] = useState<string|null>(null);
  const [punchEdit, setPunchEdit] = useState({ checkIn:"", checkOut:"", status:"On-Time" as AttendanceLog["status"], overtimeHours:0, noPayHours:0 });

  const [selectedPaySlip, setSelectedPaySlip] = useState<string|null>(null);

  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState<Omit<LeaveRequest,"id"|"appliedAt">>({ employeeId:"", type:"Annual", startDate:"", endDate:"", status:"Pending", note:"" });
  const [leaveSearchQuery, setLeaveSearchQuery] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<"All" | "Annual" | "Sick" | "Casual" | "Unpaid">("All");
  const [leaveDurationMode, setLeaveDurationMode] = useState<"single" | "range">("single");




  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Omit<PublicHoliday,"id">>({ date:"", name:"", isDoubleOT:false });

  const [selfServicePin, setSelfServicePin] = useState("");
  const [selfServiceEmp, setSelfServiceEmp] = useState<Employee|null>(null);
  const [selfServiceError, setSelfServiceError] = useState("");

  const [newAllowance, setNewAllowance] = useState<Omit<Allowance,"id">>({ name:"", amount:10000, epfApplicable:false, taxDeductible:true, type:"Fixed" });
  const [editingAllowanceId, setEditingAllowanceId] = useState<string | null>(null);
  const [editingAllowanceForm, setEditingAllowanceForm] = useState<Omit<Allowance, "id">>({ name: "", amount: 10000, epfApplicable: false, taxDeductible: true, type: "Fixed" });

  // ── Manual Payslip Adjustment Modal state ──
  const [adjustingPayslipEmpId, setAdjustingPayslipEmpId] = useState<string | null>(null);
  const [manualBonusInput, setManualBonusInput] = useState<number>(0);
  const [manualDeductionInput, setManualDeductionInput] = useState<number>(0);
  const [manualExceedIncomeInput, setManualExceedIncomeInput] = useState<number>(0);
  const [payslipNoteInput, setPayslipNoteInput] = useState<string>("");

  // ── Admin PIN Security & Company Settings state ──
  const [newPinInput, setNewPinInput] = useState("");
  const [pinChangeMsg, setPinChangeMsg] = useState("");

  // ── Settings Local Form States ──
  const [profileForm, setProfileForm] = useState<CompanyProfile>(companyProfile);
  const [epfForm, setEpfForm] = useState<EpfSettings>(epfSettings);
  const [bioForm, setBioForm] = useState<BiometricSettings>(biometricSettings);
  const [cycleStartDayForm, setCycleStartDayForm] = useState<number>(payrollCycleStartDay);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setProfileForm(companyProfile); }, [companyProfile]);
  useEffect(() => { setEpfForm(epfSettings); }, [epfSettings]);
  useEffect(() => { setBioForm(biometricSettings); }, [biometricSettings]);
  useEffect(() => { setCycleStartDayForm(payrollCycleStartDay); }, [payrollCycleStartDay]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Computed ──
  const activeEmployees = useMemo(() => employees.filter(e => e.active), [employees]);

  const dateRange = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr); const monthIndex = parseInt(monthStr)-1;
    if (payrollCycleStartDay === 1) {
      const lastDay = new Date(year, monthIndex+1, 0).getDate();
      return { startDate: `${yearStr}-${monthStr}-01`, endDate: `${yearStr}-${monthStr}-${String(lastDay).padStart(2,"0")}` };
    }
    const prev = new Date(year, monthIndex-1, 1);
    const pY = String(prev.getFullYear()); const pM = String(prev.getMonth()+1).padStart(2,"0");
    return { startDate:`${pY}-${pM}-${String(payrollCycleStartDay).padStart(2,"0")}`, endDate:`${yearStr}-${monthStr}-${String(payrollCycleStartDay-1).padStart(2,"0")}` };
  }, [selectedMonth, payrollCycleStartDay]);

  const dashboardMetrics = useMemo(() => {
    const today = hasMounted ? (() => {
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const parts = formatter.formatToParts(new Date());
      const dateParts: Record<string, string> = {};
      parts.forEach(p => { dateParts[p.type] = p.value; });
      return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    })() : (() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    })();
    const todayLogs = attendanceLogs.filter(l => l.date === today);
    const present = todayLogs.filter(l => ["On-Time","Late","Half-Day"].includes(l.status)).length;
    return { totalStaff: activeEmployees.length, present, late: todayLogs.filter(l=>l.status==="Late").length, onLeave: todayLogs.filter(l=>l.status==="On-Leave").length, absent: todayLogs.filter(l=>l.status==="Absent").length, presentPercent: activeEmployees.length>0 ? Math.round((present/activeEmployees.length)*100):0, todayLogs };
  }, [activeEmployees, attendanceLogs, hasMounted]);

  const searchedLogs = useMemo(() => attendanceLogs.filter(l => {
    if (l.date < dateRange.startDate || l.date > dateRange.endDate) return false;
    const emp = employees.find(e => e.id === l.employeeId || e.biometricId === l.employeeId || (l.employee && e.biometricId === String(l.employee.biometricId)));
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : `Staff #${l.employeeId}`);
    return empName.toLowerCase().includes(attendanceSearch.toLowerCase());
  }), [attendanceLogs, employees, attendanceSearch, dateRange]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { All: 0, "On-Time": 0, Late: 0, "Half-Day": 0, "On-Leave": 0, Absent: 0 };
    searchedLogs.forEach(l => {
      c.All++;
      const emp = employees.find(e => e.id === l.employeeId || e.biometricId === l.employeeId);
      const effectiveHours = emp?.customOperatingHours?.length ? emp.customOperatingHours : operatingHours;
      const isPunctual = ["On-Time", "Late"].includes(l.status)
        ? calculateIsPunctual(l.checkIn, l.date, effectiveHours, salarySettings.punctualGraceType, salarySettings.punctualGraceMinutes)
        : (l.status === "On-Time");
      const effectiveStatus = (l.status === "On-Time" || l.status === "Late")
        ? (isPunctual ? "On-Time" : "Late")
        : l.status;
      if (c[effectiveStatus] !== undefined) c[effectiveStatus]++;
    });
    return c;
  }, [searchedLogs, employees, operatingHours, salarySettings]);

  const filteredLogs = useMemo(() => {
    return (attendanceStatusFilter === "All"
      ? searchedLogs
      : searchedLogs.filter(l => {
          const emp = employees.find(e => e.id === l.employeeId || e.biometricId === l.employeeId);
          const effectiveHours = emp?.customOperatingHours?.length ? emp.customOperatingHours : operatingHours;
          const isPunctual = ["On-Time", "Late"].includes(l.status)
            ? calculateIsPunctual(l.checkIn, l.date, effectiveHours, salarySettings.punctualGraceType, salarySettings.punctualGraceMinutes)
            : (l.status === "On-Time");
          const effectiveStatus = (l.status === "On-Time" || l.status === "Late")
            ? (isPunctual ? "On-Time" : "Late")
            : l.status;
          return effectiveStatus === attendanceStatusFilter;
        })
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [searchedLogs, attendanceStatusFilter, employees, operatingHours, salarySettings]);

  const totalAttendancePages = Math.max(1, Math.ceil(filteredLogs.length / attendancePageSize));
  const currentPage = Math.min(attendancePage, totalAttendancePages);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * attendancePageSize;
    return filteredLogs.slice(start, start + attendancePageSize);
  }, [filteredLogs, currentPage, attendancePageSize]);

  // APIT calculation
  const calcApit = useCallback((annualIncome: number): number => {
    let tax = 0; let remaining = annualIncome;
    for (const slab of apitSlabs) {
      if (remaining <= 0) break;
      const slabMax = slab.maxIncome ?? Infinity;
      const taxable = Math.min(remaining, slabMax - slab.minIncome);
      if (taxable > 0) tax += taxable * (slab.rate / 100);
      remaining -= taxable;
    }
    return Math.max(0, tax / 12); // monthly
  }, [apitSlabs]);

  // Payroll calculations with per-employee allowances, auto no-pay, auto APIT
  const payrollCalcs = useMemo(() => {
    return activeEmployees.map(emp => {
      const empLogs = attendanceLogs.filter(l => l.employeeId===emp.id && l.date>=dateRange.startDate && l.date<=dateRange.endDate);
      const sessionCount = empLogs.filter(l => ["On-Time","Late","Half-Day"].includes(l.status)).length;
      const effectiveHours = (emp.customOperatingHours && emp.customOperatingHours.length > 0)
        ? emp.customOperatingHours
        : operatingHours;
      const punctualCount = empLogs.filter(l => {
        if (l.status === "Absent" || l.status === "On-Leave") return false;
        return calculateIsPunctual(
          l.checkIn,
          l.date,
          effectiveHours,
          salarySettings.punctualGraceType,
          salarySettings.punctualGraceMinutes
        );
      }).length;
      const absentCount = empLogs.filter(l => l.status==="Absent").length;
      const totalOtHours = empLogs.reduce((s,l) => {
        const ot = l.overtimeHours > 0
          ? l.overtimeHours
          : calculateOvertimeHours(l.checkOut, l.date, effectiveHours, salarySettings.otCalculationType, salarySettings.otGracePeriodMinutes);
        return s + ot;
      }, 0);
      const totalWorkHours = empLogs.reduce((s, l) => {
        if (!l.checkIn || !l.checkOut) return s;
        const [hIn, mIn] = l.checkIn.split(':').map(Number);
        const [hOut, mOut] = l.checkOut.split(':').map(Number);
        const duration = (hOut + mOut/60) - (hIn + mIn/60);
        return s + (duration > 0 ? duration : 0);
      }, 0);

      // Per-employee allowances
      const empAllowanceIds = employeeAllowances.filter(ea => ea.employeeId===emp.id).map(ea => ea.allowanceId);
      let totalAllowancesVal = 0; let epfBase = 0;
      empAllowanceIds.forEach(aid => {
        const allDef = allowances.find(a => a.id===aid);
        const override = employeeAllowances.find(ea => ea.employeeId===emp.id && ea.allowanceId===aid)?.overrideAmount;
        const amount = override ?? allDef?.amount ?? 0;
        totalAllowancesVal += amount;
        if (allDef?.epfApplicable) epfBase += amount;
      });

      let basicEarnings = 0; let otPay = 0; let sessionPay = 0;
      // Auto no-pay from absent days
      const noPayDeduction = emp.payType==="Fixed Monthly" ? (emp.basicSalary / (salarySettings.workingDaysPerMonth || 20)) * absentCount : 0;

      if (emp.payType==="Fixed Monthly") {
        basicEarnings = emp.basicSalary;
        const otRate = emp.hourlyRate || (emp.basicSalary / ((salarySettings.workingDaysPerMonth || 20) * 9));
        otPay = totalOtHours * otRate * 1.5;
        epfBase += basicEarnings;
      } else if (emp.payType==="Session-based") {
        sessionPay = sessionCount * emp.sessionRate;
        basicEarnings = sessionPay;
        if (emp.epfEligible) epfBase += basicEarnings;
      } else {
        basicEarnings = sessionCount * 8 * emp.hourlyRate;
        otPay = totalOtHours * emp.hourlyRate;
        if (emp.epfEligible) epfBase += basicEarnings;
      }

      const adjKey = `${selectedMonth}_${emp.id}`;
      const adj = manualAdjustments[adjKey] || { bonusAmount: 0, deductionAmount: 0, note: "" };
      const manualBonus = adj.bonusAmount || 0;
      const manualDeduction = adj.deductionAmount || 0;

      // Dynamic Bonuses
      const attBonusRate = emp.attendanceBonusRate || salarySettings.globalWorkedDayBonus || 0;
      const puncBonusRate = emp.punctualBonusRate || salarySettings.globalPunctualBonus || 0;
      const incBonusPct = emp.incomeBonusPercentage || salarySettings.globalIncomeBonusPct || 0;

      const workedDaysBonus = sessionCount * attBonusRate;
      const punctualDaysBonus = punctualCount * puncBonusRate;
      const personBonusKey = `${selectedMonth}_${emp.id}`;
      const exceedIncomeBonus = monthlyExcessIncome[personBonusKey] !== undefined
        ? (monthlyExcessIncome[personBonusKey] || 0)
        : ((monthlyExcessIncome[selectedMonth] || 0) * (incBonusPct / 100));

      const employeeEpf = emp.epfEligible ? epfBase * (epfSettings.employeeRate/100) : 0;
      const employerEpf = emp.epfEligible ? epfBase * (epfSettings.employerRate/100) : 0;
      const employerEtf = emp.epfEligible ? epfBase * (epfSettings.etfRate/100) : 0;
      
      const grossEarnings = basicEarnings + otPay + totalAllowancesVal + manualBonus + workedDaysBonus + punctualDaysBonus + exceedIncomeBonus;
      const preNetSalary = grossEarnings - employeeEpf - noPayDeduction - manualDeduction;
      const apitMonthly = emp.taxable ? calcApit(Math.max(0, preNetSalary * 12)) : 0;
      const netSalary = Math.max(0, preNetSalary - apitMonthly);

      return { 
        employee:emp, sessionCount, punctualCount, absentCount, totalOtHours, totalWorkHours,
        basicEarnings, otPay, sessionPay, totalAllowances:totalAllowancesVal, 
        noPayDeduction, manualBonus, manualDeduction, payslipNote: adj.note, 
        employeeEpf, employerEpf, employerEtf, grossEarnings, apitMonthly, netSalary,
        workedDaysBonus, punctualDaysBonus, exceedIncomeBonus,
        attBonusRate, puncBonusRate, incBonusPct
      };
    });
  }, [activeEmployees, attendanceLogs, allowances, employeeAllowances, epfSettings, dateRange, calcApit, manualAdjustments, selectedMonth, monthlyExcessIncome, salarySettings, operatingHours]);

  const payrollTotals = useMemo(() => payrollCalcs.reduce((t,c) => ({ gross:t.gross+c.grossEarnings, net:t.net+c.netSalary, epfEmp:t.epfEmp+c.employeeEpf, epfEmr:t.epfEmr+c.employerEpf, etf:t.etf+c.employerEtf, apit:t.apit+c.apitMonthly }), {gross:0,net:0,epfEmp:0,epfEmr:0,etf:0,apit:0}), [payrollCalcs]);

  const isCurrentMonthFinalized = useMemo(() => payrollHistory.some(p => p.month===selectedMonth && p.status==="Finalized"), [payrollHistory, selectedMonth]);

  // ── Handlers ──

  const openEditEmp = (emp: Employee) => { setEditingEmpId(emp.id); setNewEmp({ firstName:emp.firstName, lastName:emp.lastName, role:emp.role, payType:emp.payType, basicSalary:emp.basicSalary, hourlyRate:emp.hourlyRate, sessionRate:emp.sessionRate, commissionRate:emp.commissionRate, biometricId:emp.biometricId, epfEligible:emp.epfEligible, taxable:emp.taxable,  branchId:emp.branchId, allowanceIds:emp.allowanceIds, leaveBalances:emp.leaveBalances, attendanceBonusRate:emp.attendanceBonusRate, punctualBonusRate:emp.punctualBonusRate, incomeBonusPercentage:emp.incomeBonusPercentage, customOperatingHours: emp.customOperatingHours || [] }); setShowAddEmpModal(true); };

  const handleAddEmployee = (e: React.FormEvent) => { e.preventDefault(); if(editingEmpId){updateEmployee(editingEmpId,newEmp);setEditingEmpId(null);}else{addEmployee(newEmp);} setShowAddEmpModal(false); setNewEmp({firstName:"",lastName:"",role:"Nurse",payType:"Fixed Monthly",basicSalary:50000,hourlyRate:300,sessionRate:0,commissionRate:0,biometricId:"",epfEligible:true,taxable:false,branchId:null,allowanceIds:[],leaveBalances:{annual:14,sick:7,casual:3},attendanceBonusRate:0,punctualBonusRate:0,incomeBonusPercentage:0,customOperatingHours:[]}); };

  const openDrawer = (log: AttendanceLog) => {
    const effectiveOt = log.overtimeHours > 0
      ? log.overtimeHours
      : calculateOvertimeHours(log.checkOut, log.date, operatingHours, salarySettings.otCalculationType, salarySettings.otGracePeriodMinutes);

    setPunchEdit({
      checkIn: log.checkIn,
      checkOut: log.checkOut || "",
      status: log.status,
      overtimeHours: Math.round(effectiveOt * 100) / 100,
      noPayHours: log.noPayHours || 0
    });
    setDrawerLogId(log.id);
  };

  const handleFinalizePayroll = () => {
    if (isCurrentMonthFinalized) return;
    const [y,m] = selectedMonth.split("-");
    const monthLabel = new Date(parseInt(y), parseInt(m)-1, 1).toLocaleString("default",{month:"long",year:"numeric"});
    finalizePayroll({ month:selectedMonth, label:monthLabel, grossSalaryPool:payrollTotals.gross, netRemittances:payrollTotals.net, totalEpf:payrollTotals.epfEmp+payrollTotals.epfEmr, totalEtf:payrollTotals.etf, totalApit:payrollTotals.apit, employeeCount:activeEmployees.length });
  };


  const downloadAttendanceCSV = () => {
    const rows = [["Date","Employee","Status","Check In","Check Out","Worked Duration","OT Hours","No-Pay Hours"]];
    filteredLogs.forEach(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const worked = formatHoursAndMins(calculateWorkedHours(l.checkIn, l.checkOut));
      rows.push([l.date, emp ? `${emp.firstName} ${emp.lastName}` : "Unknown", l.status, l.checkIn, l.checkOut || "--", worked, String(l.overtimeHours), String(l.noPayHours)]);
    });
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`attendance_${selectedMonth}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadPayrollCSV = () => {
    const rows = [["Employee","Role","Pay Type","Basic","OT","Allowances","No-Pay Deduction","EPF(8%)","APIT","Net Salary"]];
    payrollCalcs.forEach(c => rows.push([`${c.employee.firstName} ${c.employee.lastName}`,c.employee.role,c.employee.payType,String(c.basicEarnings),String(c.otPay),String(c.totalAllowances),String(Math.round(c.noPayDeduction)),String(Math.round(c.employeeEpf)),String(Math.round(c.apitMonthly)),String(Math.round(c.netSalary))]));
    const csv=rows.map(r=>r.join(",")).join("\n"); const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`payroll_${selectedMonth}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadEpfFormC = () => {
    let content = "CENTRAL BANK OF SRI LANKA — EPF FORM C3\n";
    content += `PERIOD: ${selectedMonth} | EMPLOYEE EPF: ${epfSettings.employeeRate}% | EMPLOYER EPF: ${epfSettings.employerRate}%\n`;
    content += "=========================================================================\n";
    content += "Member ID | Employee Name            | Basic Salary | Member Share | Employer Share\n";
    content += "-------------------------------------------------------------------------\n";
    payrollCalcs.forEach(c => {
      if (!c.employee.epfEligible) return;
      const name = `${c.employee.firstName} ${c.employee.lastName}`.padEnd(24);
      const epfId = c.employee.biometricId.padStart(9, "0");
      const basic = c.basicEarnings.toFixed(2).padStart(12);
      const empShare = Math.round(c.employeeEpf).toString().padStart(12);
      const emrShare = Math.round(c.employerEpf).toString().padStart(14);
      content += `${epfId} | ${name} | ${basic} | ${empShare} | ${emrShare}\n`;
    });
    content += "=========================================================================\n";
    content += `Total Employee Contribution : LKR ${Math.round(payrollTotals.epfEmp).toLocaleString()}\n`;
    content += `Total Employer Contribution : LKR ${Math.round(payrollTotals.epfEmr).toLocaleString()}\n`;
    content += `Total ETF Contribution (3%) : LKR ${Math.round(payrollTotals.etf).toLocaleString()}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `EPF_Form_C3_${selectedMonth}.txt`; a.click();
    URL.revokeObjectURL(url);
  };


  const handleSelfServicePin = () => {
    setSelfServiceError("");
    const trimmed = selfServicePin.trim().toLowerCase();
    if (!trimmed) {
      setSelfServiceError("Please enter your Biometric ID or select your profile.");
      return;
    }
    const emp = activeEmployees.find(e => 
      e.biometricId?.toLowerCase() === trimmed ||
      e.id?.toLowerCase() === trimmed ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(trimmed)
    );
    if (emp) {
      setSelfServiceEmp(emp);
    } else {
      setSelfServiceError("Staff profile not found. Please verify your Biometric ID or select from the directory.");
    }
  };

  // ── Shared UI pieces ──
  const monthSelector = (value: string, onChange: (v:string)=>void) => {
    const months = [];
    const current = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    if (value && !months.includes(value)) {
      months.push(value);
      months.sort((a, b) => b.localeCompare(a));
    }

    return (
      <select value={value} onChange={e=>onChange(e.target.value)} className={`border rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none transition-smooth shadow-2xs cursor-pointer ${isDark?"bg-zinc-850 border-zinc-750 text-white hover:border-zinc-600":"bg-white border-zinc-200 text-zinc-800 hover:border-zinc-300"}`}>
        {months.map(m => {
          const [y,mo]=m.split("-"); const label=new Date(parseInt(y),parseInt(mo)-1,1).toLocaleString("default",{month:"long",year:"numeric"});
          return <option key={m} value={m}>{label}</option>;
        })}
      </select>
    );
  };

  if (!hasMounted) return <div className="flex flex-1 min-h-screen items-center justify-center bg-zinc-950 text-zinc-500 text-xs font-bold">Initializing MedSync…</div>;

  // ─── LOGIN PORTAL (UNAUTHENTICATED) ───────────────────────────────────────────
  if (!currentUser) {
    return <LoginView isDark={isDark} onToggleDark={toggleTheme} loginUser={loginUser} />;
  }

  // ─── MAIN APPLICATION RENDER ──────────────────────────────────────────────────
  return (
    <div className={`flex flex-1 min-h-screen print:min-h-0 print:block print:bg-white ${isDark ? "dark bg-[#090d16] text-slate-100" : "bg-slate-50 text-slate-800"}`} style={isDark ? { colorScheme: "dark" } : {}}>
      {/* ── Mobile/Tablet Backdrop Drawer Overlay ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden print:hidden ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* ── Mobile/Tablet Slide-out Drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r flex flex-col justify-between transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${isDark ? "bg-slate-900 border-slate-800 shadow-2xl" : "bg-white border-slate-200 shadow-2xl"}`}
      >
        <div className="p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-7 px-1">
            <div className="flex items-center gap-2.5">
              <div className={`h-9 w-9 rounded-xl p-1.5 flex items-center justify-center shadow-md shrink-0 ${isDark ? "bg-slate-800/90 border border-slate-700/60" : "bg-white border border-slate-200"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="MedSync" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className={`font-extrabold text-sm tracking-tight bg-gradient-to-r ${isDark ? "from-white via-slate-200 to-[#7dd3fc]" : "from-slate-900 via-indigo-950 to-[#0F85B0]"} bg-clip-text text-transparent`}>MedSync</h1>
                <p className={`text-[10px] ${isDark ? "text-[#38bdf8]" : "text-[#0F85B0]"} font-semibold tracking-wider uppercase leading-none mt-0.5`}>Clinic OS</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className={`p-1.5 rounded-lg transition ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="space-y-1">
            {NAV_TABS.map(tab => {
              const isProtected = tab.id === "payroll" || tab.id === "settings";
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (isProtected && !isAdminAuthenticated) {
                      setTargetProtectedTab(tab.id);
                      setPinError("");
                      setAdminPinInput("");
                      setShowAdminPinModal(true);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg transition-smooth ${
                    isActive
                      ? isDark
                        ? "bg-gradient-to-r from-indigo-950/60 to-slate-900 text-white border-l-2 border-[#0ea5e9] shadow-sm"
                        : "bg-gradient-to-r from-[#f0f9ff] to-white text-[#06394d] border-l-2 border-[#0F85B0] shadow-sm font-bold"
                      : isDark
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <svg className={`w-4 h-4 shrink-0 transition-smooth ${isActive ? (isDark ? "text-[#38bdf8]" : "text-[#0F85B0]") : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon}/>
                    </svg>
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {isProtected && !isAdminAuthenticated && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">PIN</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className={`p-4 border-t space-y-2 ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
          <button
            onClick={() => {
              if (isAdminAuthenticated) {
                logoutAdmin();
              } else {
                setTargetProtectedTab(null);
                setPinError("");
                setAdminPinInput("");
                setShowAdminPinModal(true);
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg border transition-smooth ${
              isAdminAuthenticated
                ? isDark
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-400 glow-emerald"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                : isDark
                  ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isAdminAuthenticated ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}/>
              {isAdminAuthenticated ? "Session Active" : "Admin Locked"}
            </span>
            <span className="text-[10px] opacity-75">{isAdminAuthenticated ? "Lock" : "Unlock"}</span>
          </button>
          <button onClick={toggleTheme} className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-md transition ${isDark?"text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800":"text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}>
            <span className="flex items-center gap-2">
              {isDark ? <Icons.Sun className="w-3.5 h-3.5 text-amber-400" /> : <Icons.Moon className="w-3.5 h-3.5 text-[#0ea5e9]" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ── Desktop Pinned Sidebar ── */}
      <aside className={`hidden lg:flex w-56 border-r flex-col justify-between shrink-0 transition-all ${isDark ? "bg-slate-900/80 border-slate-800/80 backdrop-blur-xl" : "bg-white/90 border-slate-200 backdrop-blur-xl shadow-sm"}`}>
        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-7 px-1">
            <div className={`h-9 w-9 rounded-xl p-1.5 flex items-center justify-center shadow-md transition-all shrink-0 ${isDark ? "bg-slate-800/90 border border-slate-700/60 shadow-black/40" : "bg-white border border-slate-200 shadow-slate-200"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="MedSync" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className={`font-extrabold text-sm tracking-tight bg-gradient-to-r ${isDark ? "from-white via-slate-200 to-[#7dd3fc]" : "from-slate-900 via-indigo-950 to-[#0F85B0]"} bg-clip-text text-transparent`}>MedSync</h1>
              <p className={`text-[10px] ${isDark ? "text-[#38bdf8]" : "text-[#0F85B0]"} font-semibold tracking-wider uppercase leading-none mt-0.5`}>Clinic OS</p>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV_TABS.map(tab => {
              const isProtected = tab.id === "payroll" || tab.id === "settings";
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isProtected && !isAdminAuthenticated) {
                      setTargetProtectedTab(tab.id);
                      setPinError("");
                      setAdminPinInput("");
                      setShowAdminPinModal(true);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-lg transition-smooth ${
                    isActive
                      ? isDark
                        ? "bg-gradient-to-r from-indigo-950/60 to-slate-900 text-white border-l-2 border-[#0ea5e9] shadow-sm"
                        : "bg-gradient-to-r from-[#f0f9ff] to-white text-[#06394d] border-l-2 border-[#0F85B0] shadow-sm font-bold"
                      : isDark
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <svg className={`w-4 h-4 shrink-0 transition-smooth ${isActive ? (isDark ? "text-[#38bdf8]" : "text-[#0F85B0]") : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon}/>
                    </svg>
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {isProtected && !isAdminAuthenticated && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">PIN</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className={`p-4 border-t space-y-2 ${isDark ? "border-slate-800/80" : "border-slate-200"}`}>
          <button
            onClick={() => {
              if (isAdminAuthenticated) {
                logoutAdmin();
              } else {
                setTargetProtectedTab(null);
                setPinError("");
                setAdminPinInput("");
                setShowAdminPinModal(true);
              }
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold rounded-lg border transition-smooth ${
              isAdminAuthenticated
                ? isDark
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-400 glow-emerald"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                : isDark
                  ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isAdminAuthenticated ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}/>
              {isAdminAuthenticated ? "Session Active" : "Admin Locked"}
            </span>
            <span className="text-[10px] opacity-75">{isAdminAuthenticated ? "Lock" : "Unlock"}</span>
          </button>
          <button onClick={toggleTheme} className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-md transition ${isDark?"text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800":"text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}>
            <span className="flex items-center gap-2">
              {isDark ? <Icons.Sun className="w-3.5 h-3.5 text-amber-400" /> : <Icons.Moon className="w-3.5 h-3.5 text-[#0ea5e9]" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`h-14 border-b flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 backdrop-blur-xl transition-all ${isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white/80 border-slate-200 shadow-sm"}`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger Button on small screens */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-2 rounded-lg lg:hidden transition ${isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
              title="Open Navigation"
              aria-label="Open Navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("settings");
                setSettingsTab("biometric");
              }}
              title="Click to view Biometric Terminal Settings & Hardware Diagnostics"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:opacity-90 active:scale-95 ${
                biometricSettings.status === "Connected"
                  ? isDark ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-400 glow-emerald" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : biometricSettings.status === "Syncing"
                  ? isDark ? "bg-amber-950/40 border-amber-800/50 text-amber-400 glow-amber" : "bg-amber-50 border-amber-200 text-amber-700"
                  : isDark ? "bg-rose-950/40 border-rose-800/50 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
              }`}
            >
              <span className={`w-2 h-2 shrink-0 rounded-full ${biometricSettings.status === "Connected" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"}`}/>
              <span className="hidden xl:inline">Hikvision DS-K1T320MFWX (HTTP Real-time Push - Connected)</span>
              <span className="hidden sm:inline xl:hidden">DS-K1T320MFWX · Connected</span>
              <span className="inline sm:hidden">Online</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={triggerSync}
              disabled={biometricSettings.status === "Syncing"}
              className={`px-2.5 sm:px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-smooth flex items-center gap-1.5 sm:gap-2 ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
              }`}
            >
              <Icons.Refresh className={`w-3.5 h-3.5 ${biometricSettings.status === "Syncing" ? "animate-spin text-amber-400" : "text-[#38bdf8]"}`} />
              <span className="hidden md:inline">{biometricSettings.status === "Syncing" ? "Syncing Logs..." : "Refresh Cloud Logs"}</span>
              <span className="inline md:hidden">{biometricSettings.status === "Syncing" ? "..." : "Sync"}</span>
            </button>

            <div className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold ${isDark ? "bg-slate-900/90 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800 shadow-sm"}`}>
              <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] border border-[#0F85B0]/30 font-extrabold flex items-center justify-center text-xs shadow-xs">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-bold text-xs leading-none max-w-[120px] truncate">{currentUser?.name || "Clinic Administrator"}</span>
                <span className="text-[9px] text-[#38bdf8] font-semibold uppercase tracking-wider leading-none mt-0.5">{currentUser?.role || "Admin"}</span>
              </div>
              <button
                onClick={logoutUser}
                className="ml-1 px-1.5 sm:px-2 py-1 text-[10px] font-bold rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1">

          {/* ═══════════════ DASHBOARD ═══════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">

              {/* Stat cards with gradient borders & modern counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                {[
                  { label: "Total Staff", value: dashboardMetrics.totalStaff, color: "from-[#0ea5e9] to-[#0F85B0]", badge: "Active", icon: <Icons.Users className="w-4 h-4 text-[#38bdf8]" /> },
                  { label: "Present Today", value: dashboardMetrics.present, color: "from-emerald-500 to-teal-600", badge: "On Time", icon: <Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> },
                  { label: "Late Arrivals", value: dashboardMetrics.late, color: "from-amber-500 to-orange-600", badge: "Grace 15m", icon: <Icons.Clock className="w-4 h-4 text-amber-400" /> },
                  { label: "On Leave", value: dashboardMetrics.onLeave, color: "from-[#0ea5e9] to-[#0F85B0]", badge: "Approved", icon: <Icons.Sun className="w-4 h-4 text-purple-400" /> },
                  { label: "Absent", value: dashboardMetrics.absent, color: "from-rose-500 to-red-600", badge: "Action Req", icon: <Icons.AlertTriangle className="w-4 h-4 text-rose-400" /> },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-smooth relative overflow-hidden group backdrop-blur-xl ${
                      isDark
                        ? "bg-white/5 border-white/10 hover:border-white/20 shadow-xl"
                        : "bg-white/80 border-black/5 hover:border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.label}</span>
                      <span className="text-base">{item.icon}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{item.value}</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${isDark ? "bg-slate-800/40 text-slate-300 border border-slate-700/50" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                        {item.badge}
                      </span>
                    </div>
                    <div className={`h-1 w-full bg-gradient-to-r ${item.color} rounded-full mt-3 opacity-80 group-hover:opacity-100 transition-smooth`} />
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* ── Premium Area Chart with hover tooltips ── */}
                <div className={`${cardCls(isDark)} col-span-1 lg:col-span-2`}>
                  {payrollHistory.length >= 2 && (
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">6-Month Salary Trend</h3>
                        <p className={`text-[10px] mt-0.5 ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Gross vs Net · hover dots for details</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px]">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#0ea5e9] inline-block opacity-80"/>Gross</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block opacity-80"/>Net</span>
                      </div>
                    </div>
                  )}
                  <SalaryTrendChart history={payrollHistory} logs={attendanceLogs} isDark={isDark} />
                </div>

                {/* ── Stacked Attendance Breakdown Chart ── */}
                <div className={cardCls(isDark)}>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Attendance Breakdown</h3>
                  <p className={`text-[10px] mb-4 ${isDark?"text-zinc-600":"text-zinc-400"}`}>This period · by status</p>
                  <div className="space-y-3">
                    {activeEmployees.map(emp => {
                      const empLogs = attendanceLogs.filter(l => l.employeeId===emp.id && l.date>=dateRange.startDate && l.date<=dateRange.endDate);
                      const total = empLogs.length || 1;
                      const onTime = empLogs.filter(l=>l.status==="On-Time").length;
                      const late = empLogs.filter(l=>l.status==="Late").length;
                      const leave = empLogs.filter(l=>l.status==="On-Leave").length;
                      const absent = empLogs.filter(l=>l.status==="Absent").length;
                      const pctOT = Math.round((onTime/total)*100);
                      const pctLate = Math.round((late/total)*100);
                      const pctLeave = Math.round((leave/total)*100);
                      const pctAbs = Math.round((absent/total)*100);
                      return (
                        <div key={emp.id}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className={`text-[10px] font-semibold ${isDark?"text-zinc-300":"text-zinc-700"}`}>{emp.firstName}</span>
                            <span className="text-[9px] text-zinc-500 font-mono">{total} days</span>
                          </div>
                          {/* Stacked bar */}
                          <div className={`flex h-3.5 w-full rounded-full overflow-hidden gap-px ${isDark?"bg-zinc-800":"bg-zinc-100"}`}>
                            {pctOT>0&&<div className="h-full bg-emerald-500 transition-all duration-700" style={{width:`${pctOT}%`}} title={`On-Time: ${pctOT}%`}/>}
                            {pctLate>0&&<div className="h-full bg-amber-400 transition-all duration-700" style={{width:`${pctLate}%`}} title={`Late: ${pctLate}%`}/>}
                            {pctLeave>0&&<div className="h-full bg-purple-500 transition-all duration-700" style={{width:`${pctLeave}%`}} title={`Leave: ${pctLeave}%`}/>}
                            {pctAbs>0&&<div className="h-full bg-rose-500 transition-all duration-700" style={{width:`${pctAbs}%`}} title={`Absent: ${pctAbs}%`}/>}
                          </div>
                          <div className="flex gap-2.5 mt-1">
                            {pctOT>0&&<span className="text-[8px] text-emerald-500 font-bold">{pctOT}%</span>}
                            {pctLate>0&&<span className="text-[8px] text-amber-400 font-bold">{pctLate}%</span>}
                            {pctLeave>0&&<span className="text-[8px] text-purple-400 font-bold">{pctLeave}%</span>}
                            {pctAbs>0&&<span className="text-[8px] text-rose-400 font-bold">{pctAbs}%</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className={`flex flex-wrap gap-3 mt-4 pt-3 border-t text-[9px] ${isDark?"border-white/10":"border-black/5"}`}>
                    {[["bg-emerald-500","On-Time"],["bg-amber-400","Late"],["bg-purple-500","Leave"],["bg-rose-500","Absent"]].map(([cls,lbl])=>(
                      <span key={lbl} className="flex items-center gap-1 text-zinc-500">
                        <span className={`w-2 h-2 rounded-sm ${cls} inline-block`}/>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              </div>


              {/* Today's punches - Live Terminal Feed */}
              <div className={cardCls(isDark)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Icons.Clock className="w-4 h-4 text-emerald-400" />
                    <h3 className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-700"}`}>Live Biometric Terminal Feed</h3>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md border transition ${
                    isDark
                      ? "bg-[#042633]/40 border-[#09526e]/50 text-[#7dd3fc]"
                      : "bg-[#f0f9ff] border-[#bae6fd] text-[#0c6c8f]"
                  }`}>
                    {dashboardMetrics.todayLogs.length} {dashboardMetrics.todayLogs.length === 1 ? "Scan" : "Scans"} Recorded Today
                  </span>
                </div>
                <div className="space-y-2.5">
                  {dashboardMetrics.todayLogs.length === 0 && (
                    <div className={`p-8 mt-2 text-center text-xs rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${isDark ? "bg-white/5 border border-white/10 text-slate-400 shadow-inner" : "bg-slate-50/50 border border-black/5 text-slate-500 shadow-inner"}`}>
                      <div className="w-12 h-12 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center animate-pulse-slow">
                        <Icons.Clock className="w-6 h-6 text-[#0ea5e9]" />
                      </div>
                      <span>No punches recorded today yet. Place your finger on the Hikvision terminal to test live sync!</span>
                    </div>
                  )}
                  {dashboardMetrics.todayLogs.map(log => {
                    const emp = employees.find(e => e.id === log.employeeId || e.biometricId === log.employeeId || (log.employee && e.biometricId === String(log.employee.biometricId)));
                    const empName = emp ? `${emp.firstName} ${emp.lastName}` : (log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : `Staff #${log.employeeId}`);
                    const empRole = emp?.role || "Staff";
                    const initial = empName.charAt(0).toUpperCase();

                    return (
                      <div key={log.id} className={`flex items-center justify-between p-3.5 rounded-xl border text-xs transition-all ${isDark ? "bg-slate-900/60 border-slate-800/80 hover:border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-extrabold text-sm flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>{empName}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${isDark ? "bg-[#042633]/60 border border-[#09526e]/50 text-[#7dd3fc]" : "bg-[#f0f9ff] border border-[#bae6fd] text-[#0c6c8f]"}`}>
                                {empRole}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Verified via <strong className="text-slate-300">{log.authMethod || "Fingerprint"}</strong></span>
                              <span>•</span>
                              <span>Terminal: <code className="text-[#38bdf8] font-mono">DS-K1T320MFWX</code></span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                              In: {log.checkIn}
                            </span>
                            <span className="text-slate-600">→</span>
                            <span className={`px-2.5 py-1 rounded-lg border font-bold ${log.checkOut ? "bg-[#0ea5e9]/10 border-[#0ea5e9]/20 text-[#38bdf8]" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                              Out: {log.checkOut || "Active Shift"}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${statusColor(log.status, isDark)}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ ATTENDANCE ═══════════════ */}
          {activeTab==="attendance" && (
            <div className="space-y-6">
              {/* Top Quick Stat Cards - Matching Dashboard style */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Total Logs", value: statusCounts.All, color: "from-[#0ea5e9] to-[#0F85B0]", badge: selectedMonth, icon: <Icons.Clock className="w-4 h-4 text-[#38bdf8]" /> },
                  { label: "On-Time Rate", value: `${Math.min(100, Math.round(((statusCounts["On-Time"] || 0) / (statusCounts.All || 1)) * 100))}%`, color: "from-emerald-500 to-teal-600", badge: `${statusCounts["On-Time"] || 0} Punches`, icon: <Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> },
                  { label: "Late Arrivals", value: statusCounts["Late"] || 0, color: "from-amber-500 to-orange-600", badge: "Grace Check", icon: <Icons.Clock className="w-4 h-4 text-amber-400" /> },
                  { label: "Overtime Logged", value: formatHoursAndMins(filteredLogs.reduce((s, l) => s + (l.overtimeHours > 0 ? l.overtimeHours : calculateOvertimeHours(l.checkOut, l.date, operatingHours, salarySettings.otCalculationType, salarySettings.otGracePeriodMinutes)), 0)), color: "from-indigo-500 to-purple-600", badge: "Approved OT", icon: <Icons.TrendingUp className="w-4 h-4 text-indigo-400" /> },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-smooth relative overflow-hidden group backdrop-blur-xl ${
                      isDark
                        ? "bg-white/5 border-white/10 hover:border-white/20 shadow-xl"
                        : "bg-white/80 border-black/5 hover:border-black/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.label}</span>
                      <span className="text-base">{item.icon}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-2xl font-extrabold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>{item.value}</span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${isDark ? "bg-slate-800/40 text-slate-300 border border-slate-700/50" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                        {item.badge}
                      </span>
                    </div>
                    <div className={`h-1 w-full bg-gradient-to-r ${item.color} rounded-full mt-3 opacity-80 group-hover:opacity-100 transition-smooth`} />
                  </div>
                ))}
              </div>

              {/* Toolbar Card */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-smooth backdrop-blur-xl ${
                isDark
                  ? "bg-white/5 border-white/10 shadow-xl"
                  : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Staff Selector & Month Picker */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <select
                      value={attendanceSearch}
                      onChange={e => { setAttendanceSearch(e.target.value); setAttendancePage(1); }}
                      className={`${inputCls(isDark)} min-w-[200px] font-semibold rounded-xl`}
                    >
                      <option value="">All Staff Members</option>
                      {activeEmployees.map(emp => (
                        <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                          {emp.firstName} {emp.lastName} ({emp.role} #{emp.biometricId})
                        </option>
                      ))}
                    </select>
                    {monthSelector(selectedMonth, m => { setSelectedMonth(m); setAttendancePage(1); })}
                    <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border ${
                      isDark ? "bg-slate-800/40 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}>
                      {dateRange.startDate} → {dateRange.endDate}
                    </span>
                  </div>

                  {/* Right: Export button */}
                  <button
                    onClick={downloadAttendanceCSV}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-smooth flex items-center gap-2 shrink-0 ${
                      isDark
                        ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 shadow-md"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                    }`}
                  >
                    <Icons.Download className="w-3.5 h-3.5 text-[#38bdf8]" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Status Pills */}
                <div className={`flex items-center gap-2 mt-4 pt-3.5 border-t overflow-x-auto ${isDark ? "border-slate-800/60" : "border-slate-200/80"}`}>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 shrink-0">Filter:</span>
                  {Object.entries(statusCounts).map(([status, count]) => {
                    const isActive = attendanceStatusFilter === status;
                    return (
                      <button
                        key={status}
                        onClick={() => { setAttendanceStatusFilter(status); setAttendancePage(1); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-smooth flex items-center gap-1.5 shrink-0 ${
                          isActive
                            ? isDark
                              ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-white shadow-sm"
                              : "bg-[#0F85B0] border-[#0F85B0] text-white shadow-sm"
                            : isDark
                              ? "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                              : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-slate-200/60"
                        }`}
                      >
                        <span>{status}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                          isActive ? "bg-white/20 text-white" : isDark ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-700"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Table Card */}
              <div className={`rounded-2xl border overflow-hidden transition-smooth backdrop-blur-xl ${
                isDark
                  ? "bg-white/5 border-white/10 shadow-xl"
                  : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className={`border-b ${isDark ? "bg-slate-900/50 border-slate-800/80" : "bg-slate-50/80 border-slate-200/80"}`}>
                      <tr>
                        {["Date", "Staff Member", "Status", "Check In", "Check Out", "Worked", "Overtime", "No-Pay", "Actions"].map((h, i) => (
                          <th key={h} className={`px-3 py-3 font-extrabold text-[10px] uppercase tracking-wider text-slate-400 whitespace-nowrap ${
                            i === 6 || i === 7 ? "text-center" : i === 8 ? "text-right" : "text-left"
                          }`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-slate-800/60" : "divide-slate-100"}`}>
                      {paginatedLogs.map(log => {
                        const emp = employees.find(e => e.id === log.employeeId || e.biometricId === log.employeeId || (log.employee && e.biometricId === String(log.employee.biometricId)));
                        const empName = emp ? `${emp.firstName} ${emp.lastName}` : (log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : `Staff #${log.employeeId}`);
                        const empRole = emp?.role || "Staff";
                        const initial = empName.charAt(0).toUpperCase();
                        const effectiveHours = emp?.customOperatingHours?.length ? emp.customOperatingHours : operatingHours;
                        const workedHours = calculateWorkedHours(log.checkIn, log.checkOut);
                        const otHours = log.overtimeHours > 0
                          ? log.overtimeHours
                          : calculateOvertimeHours(log.checkOut, log.date, effectiveHours, salarySettings.otCalculationType, salarySettings.otGracePeriodMinutes);

                        const isPunctual = ["On-Time", "Late"].includes(log.status)
                          ? calculateIsPunctual(log.checkIn, log.date, effectiveHours, salarySettings.punctualGraceType, salarySettings.punctualGraceMinutes)
                          : (log.status === "On-Time");
                        const displayStatus = (log.status === "On-Time" || log.status === "Late")
                          ? (isPunctual ? "On-Time" : "Late")
                          : log.status;

                        return (
                          <tr key={log.id} className={`transition ${isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/80"}`}>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`font-mono font-semibold px-2 py-0.5 rounded-md text-[11px] ${isDark ? "bg-slate-800/60 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                                {log.date}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-extrabold text-xs flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                                  {initial}
                                </div>
                                <div>
                                  <p className="font-bold text-xs leading-tight">{empName}</p>
                                  <p className="text-[10px] text-slate-400 leading-tight">{empRole}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${statusColor(displayStatus, isDark)}`}>
                                {displayStatus}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-lg inline-flex items-center ${isDark ? "bg-emerald-950/30 text-emerald-400 border border-emerald-800/40" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1.5" />
                                {log.checkIn}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-lg inline-flex items-center ${log.checkOut ? (isDark ? "bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/20" : "bg-[#f0f9ff] text-[#0c6c8f] border border-[#bae6fd]") : (isDark ? "bg-amber-950/30 text-amber-400 border border-amber-800/40" : "bg-amber-50 text-amber-700 border border-amber-200")}`}>
                                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${log.checkOut ? "bg-[#38bdf8]" : "bg-amber-400"}`} />
                                {log.checkOut || "Active Shift"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {log.checkOut && log.checkOut !== "–" && !log.checkOut.toLowerCase().includes("active") ? (
                                <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-lg inline-flex items-center ${
                                  isDark ? "bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/20" : "bg-[#f0f9ff] text-[#0c6c8f] border border-[#bae6fd]"
                                }`}>
                                  {formatHoursAndMins(workedHours)}
                                </span>
                              ) : (
                                <span className="text-amber-500 font-semibold italic text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                                  Active Shift
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold whitespace-nowrap">
                              {otHours > 0 ? (
                                <span className="text-emerald-500 font-bold">+{formatHoursAndMins(otHours)}</span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 font-normal select-none">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono whitespace-nowrap">
                              {log.noPayHours > 0 ? (
                                <span className="text-rose-400 font-bold">-{formatHoursAndMins(log.noPayHours)}</span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700 font-normal select-none">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openDrawer(log)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-smooth ${
                                    isDark
                                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
                                  }`}
                                >
                                  Adjust
                                </button>
                                <button
                                  onClick={() => deleteAttendanceLog(log.id)}
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-5 py-12 text-center">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                isDark
                                  ? "bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/20"
                                  : "bg-[#f0f9ff] text-[#0F85B0] border border-[#bae6fd] shadow-sm"
                              }`}>
                                <Icons.Clock className="w-6 h-6" />
                              </div>
                              <p className={`text-xs font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>No attendance records found</p>
                              <p className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Try changing the date filter or staff selection above.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredLogs.length > 0 && (
                  <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t text-xs ${
                    isDark ? "border-slate-800/80 bg-slate-900/30" : "border-slate-200/80 bg-slate-50/50"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">
                        Showing <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{(currentPage - 1) * attendancePageSize + 1}</strong> to <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{Math.min(currentPage * attendancePageSize, filteredLogs.length)}</strong> of <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{filteredLogs.length}</strong> records
                      </span>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
                        <select
                          value={attendancePageSize}
                          onChange={e => { setAttendancePageSize(Number(e.target.value)); setAttendancePage(1); }}
                          className={`text-xs py-0.5 px-2 rounded-lg border font-semibold ${
                            isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700 shadow-sm"
                          }`}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={30}>30</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPage <= 1}
                        onClick={() => setAttendancePage(p => Math.max(1, p - 1))}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-smooth text-[11px] ${
                          currentPage <= 1
                            ? "opacity-30 cursor-not-allowed border-transparent text-slate-500"
                            : isDark ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                        }`}
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalAttendancePages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalAttendancePages || Math.abs(p - currentPage) <= 1)
                        .reduce<(number | string)[]>((acc, p, idx, arr) => {
                          if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                            acc.push("...");
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, idx) => {
                          if (p === "...") {
                            return <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none">…</span>;
                          }
                          const isCurrent = currentPage === p;
                          return (
                            <button
                              key={p}
                              onClick={() => setAttendancePage(Number(p))}
                              className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-smooth ${
                                isCurrent
                                  ? isDark
                                    ? "bg-[#0ea5e9] text-white shadow-md shadow-sky-500/20"
                                    : "bg-[#0F85B0] text-white shadow-sm"
                                  : isDark
                                    ? "border border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800"
                                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 shadow-sm"
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      <button
                        disabled={currentPage >= totalAttendancePages}
                        onClick={() => setAttendancePage(p => Math.min(totalAttendancePages, p + 1))}
                        className={`px-2.5 py-1 rounded-lg font-bold border transition-smooth text-[11px] ${
                          currentPage >= totalAttendancePages
                            ? "opacity-30 cursor-not-allowed border-transparent text-slate-500"
                            : isDark ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ LEAVE MANAGER ═══════════════ */}
          {activeTab==="leave" && (() => {
            // Metrics computations
            const approvedLeavesThisMonth = leaveRequests.filter(r => {
              if (r.status !== "Approved") return false;
              return r.startDate.startsWith(selectedCalMonth) || r.endDate.startsWith(selectedCalMonth);
            }).length;

            const pendingLeaveCount = leaveRequests.filter(r => r.status === "Pending").length;

            const totalAvailableQuota = activeEmployees.reduce((sum, e) => 
              sum + (e.leaveBalances?.annual || 0) + (e.leaveBalances?.sick || 0) + (e.leaveBalances?.casual || 0), 0);
            const totalMaxQuota = activeEmployees.length * (14 + 7 + 3);
            const quotaPct = totalMaxQuota > 0 ? Math.round((totalAvailableQuota / totalMaxQuota) * 100) : 100;

            const currentMonthHolidays = publicHolidays.filter(h => h.date.startsWith(selectedCalMonth));
            const todayStr = new Date().toISOString().split("T")[0];
            const nextHoliday = publicHolidays
              .filter(h => h.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date))[0];

            // Filtered Leave Requests
            const filteredLeaveRequests = leaveRequests.filter(req => {
              const emp = employees.find(e => e.id === req.employeeId);
              const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : "";
              const note = (req.note || "").toLowerCase();
              const query = leaveSearchQuery.toLowerCase();
              if (query && !empName.includes(query) && !note.includes(query)) return false;
              if (leaveStatusFilter !== "All" && req.status !== leaveStatusFilter) return false;
              if (leaveTypeFilter !== "All" && req.type !== leaveTypeFilter) return false;
              return true;
            });

            // Month navigation helpers
            const changeCalMonth = (delta: number) => {
              const [yStr, mStr] = selectedCalMonth.split("-");
              const d = new Date(parseInt(yStr), parseInt(mStr) - 1 + delta, 1);
              setSelectedCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
            };

            const goToCurrentCalMonth = () => {
              const now = new Date();
              setSelectedCalMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
            };

            const calcLeaveDays = (startDate: string, endDate: string) => {
              if (!startDate || !endDate) return 1;
              const start = new Date(startDate);
              const end = new Date(endDate);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              return isNaN(diffDays) ? 1 : diffDays;
            };

            return (
              <div className="space-y-6">
                {/* Header with Title and Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-lg font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                      Leave & Absence Management
                    </h2>
                    <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-0.5`}>
                      Track staff statutory quotas, manage monthly schedule absences, and review approval pipelines
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      setNewLeave({
                        employeeId: activeEmployees[0]?.id || "",
                        type: "Annual",
                        startDate: today,
                        endDate: today,
                        status: "Pending",
                        note: "",
                      });
                      setLeaveDurationMode("single");
                      setShowAddLeaveModal(true);
                    }}
                    className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition ${
                      isDark
                        ? "bg-white text-zinc-900 hover:bg-zinc-100 shadow-black/30"
                        : "bg-[#0F85B0] text-white hover:bg-[#0c6c8f] shadow-[#0F85B0]/20"
                    }`}
                  >
                    <Icons.Plus className="w-4 h-4" />
                    <span>New Leave Request</span>
                  </button>
                </div>

                {/* 4 Executive Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* Card 1: Approved leaves this month */}
                  <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-purple-500/15 text-purple-400 border border-purple-500/20" : "bg-purple-50 text-purple-600 border border-purple-100"}`}>
                        <Icons.Calendar className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${approvedLeavesThisMonth > 0 ? (isDark ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200") : (isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500")}`}>
                        {approvedLeavesThisMonth} Scheduled
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-3">Leaves This Month</p>
                    <p className={`text-2xl font-extrabold tracking-tight mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {approvedLeavesThisMonth} <span className="text-xs font-semibold text-zinc-400">day(s)</span>
                    </p>
                    <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1 flex items-center gap-1`}>
                      In {selectedCalMonth}
                    </p>
                  </div>

                  {/* Card 2: Pending Approvals */}
                  <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                        <Icons.AlertTriangle className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pendingLeaveCount > 0 ? "bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse" : (isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500")}`}>
                        {pendingLeaveCount > 0 ? "Review Required" : "All Clear"}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-3">Pending Requests</p>
                    <p className={`text-2xl font-extrabold tracking-tight mt-0.5 ${pendingLeaveCount > 0 ? "text-amber-500" : (isDark ? "text-white" : "text-zinc-900")}`}>
                      {pendingLeaveCount} <span className="text-xs font-semibold text-zinc-400">request(s)</span>
                    </p>
                    <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1`}>
                      Awaiting clinic review
                    </p>
                  </div>

                  {/* Card 3: Team Quota Availability */}
                  <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-[#0F85B0]/20 text-[#38bdf8] border border-[#0F85B0]/30" : "bg-sky-50 text-[#0F85B0] border border-sky-100"}`}>
                        <Icons.CheckCircle className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-sky-500/15 text-sky-400 border border-sky-500/20" : "bg-sky-50 text-sky-700 border border-sky-200"}`}>
                        {totalAvailableQuota} Days Left
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-3">Team Quota Balance</p>
                    <p className={`text-2xl font-extrabold tracking-tight mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {quotaPct}% <span className="text-xs font-semibold text-zinc-400">available</span>
                    </p>
                    <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1`}>
                      Across {activeEmployees.length} registered staff
                    </p>
                  </div>

                  {/* Card 4: Upcoming Public Holiday */}
                  <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                        <Icons.Sun className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        {nextHoliday ? nextHoliday.date : "Standard Schedule"}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-3">Next Holiday</p>
                    <p className={`text-lg font-extrabold tracking-tight mt-0.5 truncate ${isDark ? "text-white" : "text-zinc-900"}`}>
                      {nextHoliday ? nextHoliday.name : "No Upcoming Holidays"}
                    </p>
                    <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-1`}>
                      {currentMonthHolidays.length} holiday(s) in {selectedCalMonth}
                    </p>
                  </div>
                </div>

                {/* Staff Leave Balances Roster */}
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-zinc-900/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        Staff Leave Allocations & Balances
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Statutory annual, medical, and casual entitlement quotas per employee
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full w-fit ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"}`}>
                      {activeEmployees.length} Registered Staff
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeEmployees.map(emp => {
                      const initials = `${emp.firstName[0] || ""}${emp.lastName[0] || ""}`.toUpperCase();
                      return (
                        <div
                          key={emp.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isDark
                              ? "bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700"
                              : "bg-zinc-50/70 border-zinc-200/90 hover:border-zinc-300 shadow-xs"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F85B0]/30 via-sky-500/20 to-indigo-500/30 text-[#0F85B0] font-extrabold text-xs flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                                {initials}
                              </div>
                              <div>
                                <p className={`font-bold text-xs ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                                  {emp.firstName} {emp.lastName}
                                </p>
                                <p className="text-[10px] text-zinc-400 truncate max-w-[200px]">
                                  {emp.role} · ID: {emp.biometricId || emp.id.slice(-4)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date().toISOString().split("T")[0];
                                setNewLeave({
                                  employeeId: emp.id,
                                  type: "Annual",
                                  startDate: today,
                                  endDate: today,
                                  status: "Pending",
                                  note: "",
                                });
                                setLeaveDurationMode("single");
                                setShowAddLeaveModal(true);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition flex items-center gap-1 ${
                                isDark
                                  ? "border-zinc-700 text-sky-400 hover:bg-zinc-800"
                                  : "border-zinc-300 text-[#0F85B0] hover:bg-white bg-white/60 shadow-2xs"
                              }`}
                            >
                              <Icons.Plus className="w-3 h-3" />
                              <span>Request</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className={`p-2 rounded-lg text-center border ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-200/80 shadow-2xs"}`}>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Annual</p>
                              <p className={`text-base font-extrabold mt-0.5 ${emp.leaveBalances?.annual === 0 ? "text-rose-500" : (isDark ? "text-sky-400" : "text-[#0F85B0]")}`}>
                                {emp.leaveBalances?.annual ?? 0}
                                <span className="text-[10px] font-normal text-zinc-400 ml-0.5">/14</span>
                              </p>
                              <p className="text-[9px] text-zinc-400">days left</p>
                            </div>

                            <div className={`p-2 rounded-lg text-center border ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-200/80 shadow-2xs"}`}>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Sick</p>
                              <p className={`text-base font-extrabold mt-0.5 ${emp.leaveBalances?.sick === 0 ? "text-rose-500" : "text-amber-500"}`}>
                                {emp.leaveBalances?.sick ?? 0}
                                <span className="text-[10px] font-normal text-zinc-400 ml-0.5">/7</span>
                              </p>
                              <p className="text-[9px] text-zinc-400">days left</p>
                            </div>

                            <div className={`p-2 rounded-lg text-center border ${isDark ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-200/80 shadow-2xs"}`}>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Casual</p>
                              <p className={`text-base font-extrabold mt-0.5 ${emp.leaveBalances?.casual === 0 ? "text-rose-500" : "text-purple-500"}`}>
                                {emp.leaveBalances?.casual ?? 0}
                                <span className="text-[10px] font-normal text-zinc-400 ml-0.5">/3</span>
                              </p>
                              <p className="text-[9px] text-zinc-400">days left</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Attendance & Leave Calendar */}
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-zinc-900/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-[#0F85B0]/20 text-[#38bdf8]" : "bg-sky-50 text-[#0F85B0]"}`}>
                        <Icons.Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                          Clinic Attendance & Leave Schedule
                        </h3>
                        <p className="text-[11px] text-zinc-400">
                          Monthly visual overview of rostered shifts, leaves, and holidays
                        </p>
                      </div>
                    </div>

                    {/* Navigation controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-2xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => changeCalMonth(-1)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
                          title="Previous Month"
                        >
                          <Icons.ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={goToCurrentCalMonth}
                          className="px-2.5 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-x border-zinc-200 dark:border-zinc-700 transition"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => changeCalMonth(1)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition"
                          title="Next Month"
                        >
                          <Icons.ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      {monthSelector(selectedCalMonth, setSelectedCalMonth)}
                    </div>
                  </div>

                  {(() => {
                    const [y, m] = selectedCalMonth.split("-").map(Number);
                    const firstDay = new Date(y, m - 1, 1).getDay();
                    const daysInMonth = new Date(y, m, 0).getDate();
                    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                    return (
                      <div>
                        {/* Weekday headers */}
                        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                          {dayLabels.map(d => (
                            <div key={d} className={`text-[11px] font-bold text-center py-1.5 uppercase tracking-wider ${d === "Sun" ? "text-rose-500" : (isDark ? "text-zinc-400" : "text-zinc-500")}`}>
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* Day cells */}
                        <div className="grid grid-cols-7 gap-1.5">
                          {cells.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className={`rounded-xl border border-transparent ${isDark ? "bg-zinc-950/20" : "bg-zinc-100/30"} min-h-[68px]`} />;

                            const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const isToday = dateStr === todayStr;
                            const cellDate = new Date(y, m - 1, day);
                            const dayOfWeek = cellDate.getDay();
                            const opHour = operatingHours.find(h => h.dayOfWeek === dayOfWeek);
                            const isClinicClosed = opHour ? !opHour.isOpen : (dayOfWeek === 0);

                            const dayLogs = attendanceLogs.filter(l => l.date === dateStr);
                            const holiday = publicHolidays.find(h => h.date === dateStr);
                            const presentCount = dayLogs.filter(l => ["On-Time", "Late", "Half-Day"].includes(l.status)).length;
                            
                            // Include approved leave requests for this day
                            const approvedLeavesOnDay = leaveRequests.filter(req => {
                              if (req.status !== "Approved") return false;
                              return req.startDate <= dateStr && dateStr <= req.endDate;
                            });
                            const leaveCount = Math.max(dayLogs.filter(l => l.status === "On-Leave").length, approvedLeavesOnDay.length);
                            const absentCount = dayLogs.filter(l => l.status === "Absent").length;
                            const lateCount = dayLogs.filter(l => l.status === "Late").length;

                            return (
                              <div
                                key={`day-${day}`}
                                className={`rounded-xl p-2 text-center text-[10px] min-h-[68px] sm:min-h-[76px] flex flex-col justify-between border transition-all ${
                                  isToday
                                    ? "ring-2 ring-[#0F85B0] border-[#0F85B0]"
                                    : ""
                                } ${
                                  holiday
                                    ? (isDark ? "border-amber-700/60 bg-amber-950/25 shadow-xs" : "border-amber-200 bg-amber-50/80 shadow-xs")
                                    : isClinicClosed
                                    ? (isDark ? "border-zinc-800/80 bg-zinc-950/60 border-dashed" : "border-slate-200/90 bg-slate-50/80 border-dashed")
                                    : (isDark ? "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700" : "border-zinc-200/90 bg-white hover:border-zinc-300 shadow-xs")
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-bold text-[11px] ${
                                    isToday
                                      ? "bg-[#0F85B0] text-white"
                                      : holiday
                                      ? "text-amber-500 font-extrabold"
                                      : isClinicClosed
                                      ? "text-rose-500 font-bold"
                                      : (isDark ? "text-zinc-300" : "text-zinc-700")
                                  }`}>
                                    {day}
                                  </span>
                                  {holiday ? (
                                    <span className="text-amber-500 flex items-center" title={holiday.name}>
                                      <Icons.Star className="w-2.5 h-2.5" />
                                    </span>
                                  ) : isClinicClosed ? (
                                    <span className="text-rose-500/70 dark:text-rose-400/70 flex items-center" title="Clinic Closed">
                                      <Icons.LockClosed className="w-2.5 h-2.5" />
                                    </span>
                                  ) : null}
                                </div>

                                {holiday && (
                                  <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 leading-tight my-1 truncate px-1 py-0.5 rounded bg-amber-100/50 dark:bg-amber-900/30">
                                    {holiday.name}
                                  </p>
                                )}

                                {isClinicClosed && !holiday && (
                                  <div className="my-auto py-0.5">
                                    <span className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                      <Icons.LockClosed className="w-2 h-2 shrink-0" />
                                      Closed
                                    </span>
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-center gap-1 mt-auto pt-1">
                                  {leaveCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-0.5" title={`${leaveCount} on leave`}>
                                      <Icons.Calendar className="w-2.5 h-2.5 shrink-0" />
                                      <span>{leaveCount}L</span>
                                    </span>
                                  )}
                                  {presentCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5" title={`${presentCount} present`}>
                                      <Icons.Check className="w-2.5 h-2.5 shrink-0" />
                                      <span>{presentCount}</span>
                                    </span>
                                  )}
                                  {lateCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-0.5" title={`${lateCount} late`}>
                                      <Icons.Clock className="w-2.5 h-2.5 shrink-0" />
                                      <span>{lateCount}</span>
                                    </span>
                                  )}
                                  {absentCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-0.5" title={`${absentCount} absent`}>
                                      <Icons.X className="w-2.5 h-2.5 shrink-0" />
                                      <span>{absentCount}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className={`flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t text-[11px] font-medium ${isDark ? "border-zinc-800 text-zinc-400" : "border-zinc-200 text-zinc-600"}`}>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Present</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Late Arrival</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" />On Leave</span>
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Absent</span>
                          <span className="flex items-center gap-1.5"><Icons.LockClosed className="w-3 h-3 text-rose-500" />Closed Day</span>
                          <span className="flex items-center gap-1.5"><Icons.Star className="w-3.5 h-3.5 text-amber-500" />Public Holiday</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Leave Requests Management Section */}
                <div className={`p-5 rounded-2xl border ${isDark ? "bg-zinc-900/60 border-zinc-800/80" : "bg-white border-zinc-200 shadow-sm"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                        Leave Requests & Approval Pipeline
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Review, approve, or reject employee leave applications
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full w-fit ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"}`}>
                      {filteredLeaveRequests.length} of {leaveRequests.length} Requests
                    </span>
                  </div>

                  {/* Filter Toolbar */}
                  <div className={`p-3 rounded-xl border mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${isDark ? "bg-zinc-950/40 border-zinc-800" : "bg-zinc-50/70 border-zinc-200"}`}>
                    <div className="relative flex-1 max-w-sm">
                      <Icons.Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={leaveSearchQuery}
                        onChange={e => setLeaveSearchQuery(e.target.value)}
                        placeholder="Search employee or reason..."
                        className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border transition outline-none ${
                          isDark
                            ? "bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 focus:border-[#38bdf8]"
                            : "bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-[#0F85B0] shadow-2xs"
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Status filter pills */}
                      <div className="flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs">
                        {(["All", "Pending", "Approved", "Rejected"] as const).map(st => {
                          const count = st === "All" ? leaveRequests.length : leaveRequests.filter(r => r.status === st).length;
                          const isSel = leaveStatusFilter === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setLeaveStatusFilter(st)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                                isSel
                                  ? (isDark ? "bg-zinc-800 text-white shadow-xs" : "bg-[#0F85B0] text-white shadow-xs")
                                  : (isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900")
                              }`}
                            >
                              <span>{st}</span>
                              <span className={`text-[10px] px-1 rounded-full ${
                                isSel
                                  ? (isDark ? "bg-zinc-700 text-white" : "bg-white/25 text-white")
                                  : (isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500")
                              }`}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Type filter */}
                      <select
                        value={leaveTypeFilter}
                        onChange={e => setLeaveTypeFilter(e.target.value as typeof leaveTypeFilter)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none ${
                          isDark
                            ? "bg-zinc-900 border-zinc-700 text-zinc-300"
                            : "bg-white border-zinc-200 text-zinc-700 shadow-2xs"
                        }`}
                      >
                        <option value="All">All Types</option>
                        <option value="Annual">Annual Leave</option>
                        <option value="Sick">Sick Leave</option>
                        <option value="Casual">Casual Leave</option>
                        <option value="Unpaid">Unpaid Leave</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  <div className={`rounded-xl border overflow-hidden ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                    <table className="w-full text-xs">
                      <thead className={`border-b ${isDark ? "bg-zinc-900/90 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                        <tr>
                          {["Employee", "Leave Type", "Schedule Period", "Status", "Reason / Note", "Actions"].map(h => (
                            <th key={h} className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-zinc-400">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? "divide-zinc-800/80" : "divide-zinc-100"}`}>
                        {filteredLeaveRequests.map(req => {
                          const emp = employees.find(e => e.id === req.employeeId);
                          const initials = emp ? `${emp.firstName[0] || ""}${emp.lastName[0] || ""}`.toUpperCase() : "??";
                          const days = calcLeaveDays(req.startDate, req.endDate);

                          const typeBadgeStyle = 
                            req.type === "Annual" ? (isDark ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-sky-50 text-sky-700 border-sky-200") :
                            req.type === "Sick" ? (isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200") :
                            req.type === "Casual" ? (isDark ? "bg-purple-500/15 text-purple-400 border-purple-500/30" : "bg-purple-50 text-purple-700 border-purple-200") :
                            (isDark ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-zinc-100 text-zinc-600 border-zinc-200");

                          return (
                            <tr key={req.id} className={`hover:${isDark ? "bg-zinc-900/40" : "bg-zinc-50/70"} transition-colors`}>
                              {/* Employee */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0F85B0]/20 to-sky-500/30 text-[#0F85B0] font-extrabold text-[11px] flex items-center justify-center border border-[#0F85B0]/20 shrink-0">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className={`font-semibold text-xs ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                                      {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Staff"}
                                    </p>
                                    <p className="text-[10px] text-zinc-400">
                                      {emp?.role || "Staff"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Type */}
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeBadgeStyle}`}>
                                  {req.type}
                                </span>
                              </td>

                              {/* Period */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                                    {req.startDate}{req.startDate !== req.endDate ? ` → ${req.endDate}` : ""}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"}`}>
                                    {days} {days === 1 ? "day" : "days"}
                                  </span>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(req.status, isDark)}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    req.status === "Approved" ? "bg-emerald-500" :
                                    req.status === "Pending" ? "bg-amber-500 animate-pulse" :
                                    "bg-rose-500"
                                  }`} />
                                  <span>{req.status}</span>
                                </span>
                              </td>

                              {/* Note */}
                              <td className="px-4 py-3">
                                <span className={`text-xs ${req.note ? (isDark ? "text-zinc-300 italic" : "text-zinc-600 italic") : "text-zinc-400"}`}>
                                  {req.note ? `"${req.note}"` : "—"}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                {req.status === "Pending" ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => approveLeave(req.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg shadow-xs transition flex items-center gap-1"
                                      title="Approve Leave"
                                    >
                                      <Icons.Check className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => rejectLeave(req.id)}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg shadow-xs transition flex items-center gap-1"
                                      title="Reject Leave"
                                    >
                                      <Icons.X className="w-3 h-3" />
                                      <span>Reject</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-zinc-400 font-medium">
                                    {req.status === "Approved" ? "Processed" : "Declined"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {filteredLeaveRequests.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-10 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${isDark ? "bg-zinc-800 text-zinc-500" : "bg-zinc-100 text-zinc-400"}`}>
                                  <Icons.Calendar className="w-5 h-5" />
                                </div>
                                <p className={`font-semibold text-xs ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                                  No leave requests found
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  {leaveSearchQuery || leaveStatusFilter !== "All" || leaveTypeFilter !== "All"
                                    ? "Try adjusting your search query or filters"
                                    : "All staff members are on regular duty with no active leave requests"}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══════════════ PAYROLL ENGINE ═══════════════ */}
          {activeTab==="payroll" && (
            <div className="space-y-6">
              {/* Header with Title and Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className={`text-lg font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Payroll Engine &amp; Statutory Compliance
                  </h2>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-0.5`}>
                    Automated salary calculations, overtime compensation, EPF/ETF contributions &amp; tax withholding
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={downloadPayrollCSV} className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-smooth ${isDark ? "bg-zinc-850 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  {!isCurrentMonthFinalized && (
                    <button onClick={handleFinalizePayroll} className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0F85B0] hover:bg-[#0c6c8f] text-white shadow-md shadow-[#0F85B0]/20 transition-smooth flex items-center gap-1.5">
                      <Icons.LockClosed className="w-3.5 h-3.5" />
                      <span>Finalize Month</span>
                    </button>
                  )}
                  <button onClick={downloadEpfFormC} className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-smooth ${isDark ? "bg-zinc-850 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>EPF Form C3</span>
                  </button>
                </div>
              </div>

              {/* 4 Executive Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Gross Salaries Pool */}
                <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gross Salaries Pool</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"}`}>
                      <Icons.Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <p className={`text-xl font-extrabold mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
                    LKR {payrollTotals.gross.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Total monthly salary allocation</p>
                </div>

                {/* Net Remittances */}
                <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Remittances</span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#0F85B0]/10 text-[#0F85B0] dark:text-[#38bdf8]">
                      <Icons.Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-extrabold mt-2 text-[#0F85B0] dark:text-[#38bdf8]">
                    LKR {payrollTotals.net.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Disbursable to staff accounts</p>
                </div>

                {/* EPF (8% + 12%) */}
                <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">EPF Total (8%+12%)</span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <Icons.Shield className="w-4 h-4" />
                    </div>
                  </div>
                  <p className={`text-xl font-extrabold mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
                    LKR {(payrollTotals.epfEmp + payrollTotals.epfEmr).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Statutory retirement fund total</p>
                </div>

                {/* APIT Total */}
                <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">APIT Total</span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Icons.FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-extrabold mt-2 text-amber-600 dark:text-amber-400">
                    LKR {Math.round(payrollTotals.apit).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Inland revenue withholding tax</p>
                </div>
              </div>

              {/* Filter / Period Bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {monthSelector(selectedMonth, setSelectedMonth)}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium ${isDark ? "bg-zinc-850 border-zinc-800 text-zinc-400" : "bg-white border-zinc-200 text-zinc-500 shadow-2xs"}`}>
                    <Icons.Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{dateRange.startDate} → {dateRange.endDate}</span>
                  </div>
                  {isCurrentMonthFinalized ? (
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 ${statusColor("Finalized", isDark)}`}>
                      <Icons.LockClosed className="w-3 h-3" />
                      <span>Finalized</span>
                    </span>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 ${isDark ? "bg-sky-500/10 border-sky-500/30 text-sky-400" : "bg-sky-50 border-sky-200 text-[#0F85B0]"}`}>
                      <Icons.Clock className="w-3 h-3" />
                      <span>Active Cycle</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Payroll table Card */}
              <div className={`rounded-2xl border overflow-hidden transition-smooth backdrop-blur-xl ${
                isDark
                  ? "bg-white/5 border-white/10 shadow-xl"
                  : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className={`border-b ${isDark ? "bg-slate-900/50 border-slate-800/80" : "bg-slate-50/80 border-slate-200/80"}`}>
                      <tr>
                        {["Staff Member", "Base (LKR)", "OT Earn", "Allowances", "No-Pay", "EPF (8%)", "APIT", "Net Salary", "Actions"].map((h, i) => (
                          <th key={h} className={`px-3 py-3 font-extrabold text-[10px] uppercase tracking-wider text-slate-400 whitespace-nowrap ${
                            i === 8 ? "text-right" : "text-left"
                          }`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-slate-800/60" : "divide-slate-100"}`}>
                      {payrollCalcs.map(c => {
                        const adjKey = `${selectedMonth}_${c.employee.id}`;
                        const existing = manualAdjustments[adjKey];
                        const hasAdjustment = existing && (existing.bonusAmount > 0 || existing.deductionAmount > 0 || (monthlyExcessIncome[adjKey] || 0) > 0);

                        return (
                          <tr key={c.employee.id} className={`hover:${isDark ? "bg-slate-800/20" : "bg-slate-50/70"} transition-smooth ${isCurrentMonthFinalized ? "opacity-85" : ""}`}>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-extrabold text-[11px] flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                                  {c.employee.firstName[0]}{c.employee.lastName[0]}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <p className={`font-bold text-xs ${isDark ? "text-white" : "text-zinc-900"}`}>
                                      {c.employee.firstName} {c.employee.lastName}
                                    </p>
                                    {hasAdjustment && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]" title="Manual adjustments active" />
                                    )}
                                  </div>
                                  <p className="text-[10px] text-zinc-400">
                                    {c.employee.role} · <span className="font-semibold text-zinc-500 dark:text-zinc-400">{c.employee.payType}</span>
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-mono font-semibold whitespace-nowrap">
                              <p className={isDark ? "text-zinc-200" : "text-zinc-800"}>LKR {c.basicEarnings.toLocaleString()}</p>
                              {c.employee.payType === "Session-based" && (
                                <p className="text-[9px] text-[#0ea5e9] mt-0.5 font-sans font-medium">{c.sessionCount} sessions</p>
                              )}
                            </td>
                            <td className="px-3 py-3 font-mono text-zinc-400 whitespace-nowrap">
                              LKR {Math.round(c.otPay).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              +LKR {c.totalAllowances.toLocaleString()}
                            </td>
                            <td className="px-3 py-3 font-mono font-bold text-rose-500 whitespace-nowrap">
                              {c.noPayDeduction > 0 ? `-LKR ${Math.round(c.noPayDeduction).toLocaleString()}` : "LKR 0"}
                            </td>
                            <td className="px-3 py-3 font-mono text-zinc-400 whitespace-nowrap">
                              {c.employee.epfEligible ? `-LKR ${Math.round(c.employeeEpf).toLocaleString()}` : "Exempt"}
                            </td>
                            <td className="px-3 py-3 font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap">
                              {c.apitMonthly > 0 ? `-LKR ${Math.round(c.apitMonthly).toLocaleString()}` : "—"}
                            </td>
                            <td className="px-3 py-3 font-mono font-extrabold text-xs text-[#0F85B0] dark:text-[#38bdf8] whitespace-nowrap">
                              LKR {Math.round(c.netSalary).toLocaleString()}
                            </td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const adjKey = `${selectedMonth}_${c.employee.id}`;
                                    const existing = manualAdjustments[adjKey] || { bonusAmount: 0, deductionAmount: 0, note: "" };
                                    setAdjustingPayslipEmpId(c.employee.id);
                                    setManualBonusInput(existing.bonusAmount);
                                    setManualDeductionInput(existing.deductionAmount);
                                    setManualExceedIncomeInput(monthlyExcessIncome[adjKey] || 0);
                                    setPayslipNoteInput(existing.note);
                                  }}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-smooth flex items-center gap-1 ${
                                    isDark
                                      ? "border-slate-700 bg-slate-800/80 text-sky-400 hover:bg-slate-700 hover:text-white"
                                      : "border-slate-200 bg-white text-[#0F85B0] hover:bg-slate-50 shadow-2xs"
                                  }`}
                                >
                                  <Icons.Edit className="w-3 h-3" />
                                  <span>Adjust</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPaySlip(c.employee.id)}
                                  className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-smooth active:scale-95 flex items-center gap-1 ${
                                    isDark
                                      ? "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                                  }`}
                                >
                                  <Icons.FileText className="w-3 h-3" />
                                  <span>Payslip</span>
                                </button>
                              </div>
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

          {/* ═══════════════ REPORTS ═══════════════ */}
          {activeTab==="reports" && (
            <div className="space-y-6">
              {/* Header with Title and Action Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className={`text-lg font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Reports, Archives &amp; Audit Logs
                  </h2>
                  <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"} mt-0.5`}>
                    Historical locked payroll periods, compliance summaries, and immutable biometric audit records
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                    isDark ? "bg-zinc-900/80 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700 shadow-2xs"
                  }`}>
                    <Icons.Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Audit Trail: {auditLogs.length} Events</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                    isDark ? "bg-zinc-900/80 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700 shadow-2xs"
                  }`}>
                    <Icons.Calendar className="w-3.5 h-3.5 text-[#0F85B0] dark:text-[#38bdf8]" />
                    <span>{payrollHistory.length} Locked Periods</span>
                  </div>
                </div>
              </div>

              {/* 4 Executive Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Metric 1: Total Audit Events */}
                <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total System Events</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? "bg-zinc-800 text-[#38bdf8]" : "bg-sky-50 text-[#0F85B0]"}`}>
                      <Icons.Clipboard className="w-4 h-4" />
                    </div>
                  </div>
                  <p className={`text-xl font-extrabold mt-2 ${isDark ? "text-white" : "text-zinc-900"}`}>
                    {auditLogs.length}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Immutable activity log entries</p>
                </div>

                {/* Metric 2: Terminal Scans */}
                {(() => {
                  const bioEvents = auditLogs.filter(l => l.entity === "BiometricHardware" || l.details.toLowerCase().includes("biometric") || l.details.toLowerCase().includes("scan")).length;
                  return (
                    <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Hardware Scans</span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600 dark:text-teal-400">
                          <Icons.Camera className="w-4 h-4" />
                        </div>
                      </div>
                      <p className={`text-xl font-extrabold mt-2 text-teal-600 dark:text-teal-400`}>
                        {bioEvents}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">Terminal real-time punches</p>
                    </div>
                  );
                })()}

                {/* Metric 3: Archived Payroll Cycles */}
                <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Archived Cycles</span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#0F85B0]/10 text-[#0F85B0] dark:text-[#38bdf8]">
                      <Icons.Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-extrabold mt-2 text-[#0F85B0] dark:text-[#38bdf8]">
                    {payrollHistory.length}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Locked periods on record</p>
                </div>

                {/* Metric 4: Security Actions */}
                {(() => {
                  const secEvents = auditLogs.filter(l => l.entity === "AdminSecurity" || l.action === "FINALIZE" || l.action === "DELETE").length;
                  return (
                    <div className={`p-4 rounded-2xl border transition-all ${isDark ? "bg-zinc-900/60 border-zinc-800/80 shadow-lg shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Security &amp; Admin</span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Icons.Shield className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-xl font-extrabold mt-2 text-amber-600 dark:text-amber-400">
                        {secEvents}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-1">Privileged system verifications</p>
                    </div>
                  );
                })()}
              </div>

              {/* Section 1: Payroll History with Year Filter */}
              {(() => {
                const availableYears = Array.from(
                  new Set(payrollHistory.map(p => p.month.split("-")[0]))
                ).sort((a, b) => b.localeCompare(a));
                const yearOptions = ["All Years", ...availableYears];

                const filteredHistory = payrollHistory.filter(period => {
                  if (selectedHistoryYear === "All Years") return true;
                  return period.month.startsWith(selectedHistoryYear);
                });

                return (
                  <div className={`rounded-2xl border overflow-hidden transition-smooth backdrop-blur-xl p-5 ${
                    isDark
                      ? "bg-white/5 border-white/10 shadow-xl"
                      : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                  }`}>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#0F85B0]/10 text-[#0F85B0] dark:text-[#38bdf8] border border-[#0F85B0]/20">
                          <Icons.Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                            Payroll Archive Statements
                          </h3>
                          <p className="text-xs text-zinc-400">Click any period card below to view detailed breakdown &amp; employee statements</p>
                        </div>
                      </div>

                      {/* Year Filter Tabs */}
                      <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`}>
                        {yearOptions.map(yr => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => setSelectedHistoryYear(yr)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedHistoryYear === yr
                                ? isDark ? "bg-[#0F85B0] text-white shadow" : "bg-white text-[#06394d] shadow-sm"
                                : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                            }`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {filteredHistory.map(period => (
                        <div
                          key={period.id}
                          onClick={() => setSelectedHistoryPeriodId(period.id)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer group hover:-translate-y-0.5 ${
                            isDark
                              ? "bg-zinc-900/60 border-zinc-800 hover:border-[#0ea5e9]/50 hover:bg-zinc-900 shadow-md shadow-black/20"
                              : "bg-white border-zinc-200/90 hover:border-[#7dd3fc] hover:bg-white shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-sm group-hover:text-[#0ea5e9] transition">{period.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusColor(period.status, isDark)}`}>{period.status}</span>
                              <Icons.ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0ea5e9] transition" />
                            </div>
                          </div>
                          <p className="text-xl font-extrabold text-[#0ea5e9] mb-1">LKR {period.grossSalaryPool.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">Net: LKR {period.netRemittances.toLocaleString()}</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">EPF: LKR {period.totalEpf.toLocaleString()} · ETF: LKR {period.totalEtf.toLocaleString()}</p>
                          <div className="mt-3 pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                            <span>Finalized: {period.finalizedAt?.split(" ")[0]}</span>
                            <span className="font-sans text-[#0ea5e9] font-bold group-hover:underline flex items-center gap-1">
                              <span>View Summary</span>
                              <Icons.ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}
                      {filteredHistory.length === 0 && (
                        <div className="col-span-3 py-10 text-center flex flex-col items-center justify-center">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
                            isDark ? "bg-zinc-800/60 text-zinc-500 border border-zinc-700/60" : "bg-zinc-100 text-zinc-400 border border-zinc-200"
                          }`}>
                            <Icons.Calendar className="w-6 h-6" />
                          </div>
                          <p className={`text-xs font-bold ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                            No finalized payroll periods found for {selectedHistoryYear}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
                            When you lock a monthly cycle using <strong>Finalize Month</strong> in the Payroll Engine, historical statements appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Section 2: Audit Trail & Activity Log Inspector */}
              {(() => {
                const actionOptions = ["All", "CREATE", "UPDATE", "FINALIZE", "APPROVE", "DELETE"];

                const filteredLogs = auditLogs.filter(log => {
                  const matchesAction = auditActionFilter === "All" || log.action === auditActionFilter;
                  const query = auditSearch.toLowerCase().trim();
                  const matchesQuery = !query ||
                    log.details.toLowerCase().includes(query) ||
                    log.entity.toLowerCase().includes(query) ||
                    log.entityId.toLowerCase().includes(query) ||
                    (log.actor && log.actor.toLowerCase().includes(query)) ||
                    (log.ipAddress && log.ipAddress.toLowerCase().includes(query)) ||
                    log.action.toLowerCase().includes(query);
                  return matchesAction && matchesQuery;
                });

                const getActionPill = (action: string) => {
                  switch (action) {
                    case "CREATE":
                      return isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200";
                    case "UPDATE":
                      return isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-200";
                    case "FINALIZE":
                      return isDark ? "bg-[#0ea5e9]/10 text-[#38bdf8] border-[#0ea5e9]/30" : "bg-[#f0f9ff] text-[#0c6c8f] border-[#bae6fd]";
                    case "APPROVE":
                      return isDark ? "bg-teal-500/10 text-teal-400 border-teal-500/30" : "bg-teal-50 text-teal-700 border-teal-200";
                    case "DELETE":
                    case "REJECT":
                      return isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-rose-50 text-rose-700 border-rose-200";
                    default:
                      return isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-700 border-zinc-200";
                  }
                };

                return (
                  <div className={`rounded-2xl border overflow-hidden transition-smooth backdrop-blur-xl p-5 ${
                    isDark
                      ? "bg-white/5 border-white/10 shadow-xl"
                      : "bg-white/80 border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                  }`}>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <Icons.Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                              Audit Trail &amp; Activity Log Inspector
                            </h3>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                              isDark ? "bg-zinc-800/80 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
                            }`}>
                              {filteredLogs.length} / {auditLogs.length} Events
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">Real-time system events, biometric scans, payroll locks &amp; admin operations</p>
                        </div>
                      </div>

                      {/* Filter & Search Bar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search logs (e.g. Ruwan, PIN, Payroll)..."
                            value={auditSearch}
                            onChange={e => setAuditSearch(e.target.value)}
                            className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                              isDark
                                ? "bg-zinc-900/80 border-zinc-700 text-white placeholder-zinc-500 focus:border-teal-500"
                                : "bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-[#0F85B0]"
                            } max-w-[240px]`}
                          />
                          <Icons.Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>

                        {/* Action Filter Pills */}
                        <div className={`flex items-center gap-1 p-1 rounded-xl border text-xs font-semibold ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`}>
                          {actionOptions.map(act => (
                            <button
                              key={act}
                              type="button"
                              onClick={() => setAuditActionFilter(act)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                auditActionFilter === act
                                  ? isDark ? "bg-[#0F85B0] text-white shadow" : "bg-white text-[#06394d] shadow-sm"
                                  : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              {act}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {filteredLogs.map(log => (
                        <div
                          key={log.id}
                          onClick={() => setSelectedAuditLogId(log.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer group hover:-translate-y-0.5 ${
                            isDark
                              ? "bg-zinc-900/40 border-zinc-800/80 hover:border-[#0ea5e9]/50 hover:bg-zinc-800/60 shadow-sm"
                              : "bg-white border-zinc-200/80 hover:border-[#7dd3fc] hover:bg-white shadow-xs"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider border uppercase ${getActionPill(log.action)}`}>
                                {log.action}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md border ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-100 border-zinc-200 text-zinc-600"}`}>
                                {log.entity}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-400">ID: {log.entityId}</span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px]">
                              {log.actor && (
                                <span className={`font-semibold flex items-center gap-1.5 ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                                  <Icons.User className="w-3 h-3 text-[#38bdf8]" />
                                  <span>{log.actor}</span>
                                </span>
                              )}
                              {log.ipAddress && (
                                <span className="font-mono text-zinc-400">
                                  IP: {log.ipAddress}
                                </span>
                              )}
                              <span className="font-mono text-zinc-400 flex items-center gap-1">
                                <Icons.Clock className="w-3 h-3 text-emerald-500" />
                                <span>{log.timestamp}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs ${isDark ? "text-zinc-200" : "text-zinc-800"} font-medium`}>
                              {log.details}
                            </p>
                            <span className="text-[10px] font-bold text-[#0F85B0] dark:text-[#38bdf8] opacity-0 group-hover:opacity-100 transition whitespace-nowrap flex items-center gap-1">
                              <span>Inspect</span>
                              <Icons.Search className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))}

                      {filteredLogs.length === 0 && (
                        <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center justify-center">
                          <Icons.Search className="w-8 h-8 text-zinc-400 mb-2 opacity-50" />
                          <p className="font-bold">No audit log events match your search criteria</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Try clearing the search query or selecting &quot;All&quot; actions</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══════════════ SELF-SERVICE ═══════════════ */}
          {activeTab==="selfservice" && (
            <div className="space-y-6">
              {!selfServiceEmp ? (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Hero Header Card */}
                  <div className={`relative overflow-hidden rounded-3xl p-8 sm:p-10 border transition-smooth backdrop-blur-xl ${
                    isDark
                      ? "bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border-slate-800 shadow-2xl"
                      : "bg-gradient-to-b from-white via-sky-50/30 to-white border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(15,133,176,0.07)]"
                  }`}>
                    <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#0F85B0]/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 left-10 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
                      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide mb-5 border transition ${
                        isDark
                          ? "bg-[#042633]/70 border-[#09526e] text-[#38bdf8]"
                          : "bg-sky-50 border-sky-200 text-[#0c6c8f] shadow-xs"
                      }`}>
                        <Icons.Shield className="w-3.5 h-3.5 text-[#0ea5e9]" />
                        <span>Smile Hub Portal · Biometric Staff Self-Service</span>
                      </div>

                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0F85B0] via-sky-500 to-teal-400 p-0.5 shadow-lg shadow-[#0F85B0]/20 mb-4">
                        <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-white"}`}>
                          <Icons.User className="w-8 h-8 text-[#0ea5e9]" />
                        </div>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Staff Portal Access</h2>
                      <p className={`text-xs sm:text-sm max-w-md ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        Enter your assigned Biometric ID or select your profile below to view your real-time verified attendance, leave balances, and live payroll statements.
                      </p>

                      {/* Input Group */}
                      {/* Input Group */}
                      <div className="w-full max-w-lg mt-6">
                        <div className={`relative flex items-center rounded-2xl border p-1.5 transition-all shadow-inner ${
                          isDark
                            ? "bg-slate-950/80 border-slate-800 focus-within:border-[#38bdf8] focus-within:ring-2 focus-within:ring-[#0ea5e9]/20"
                            : "bg-slate-50 border-slate-300/80 focus-within:bg-white focus-within:border-[#0F85B0] focus-within:ring-3 focus-within:ring-[#0F85B0]/10"
                        }`}>
                          <div className="pl-3.5 text-slate-400">
                            <Icons.Search className="w-5 h-5" />
                          </div>
                          <input
                            value={selfServicePin}
                            onChange={e => { setSelfServicePin(e.target.value); setSelfServiceError(""); }}
                            onKeyDown={e => { if (e.key === "Enter") handleSelfServicePin(); }}
                            placeholder="Biometric ID (e.g. SH001, SH002)"
                            className="w-full px-3 py-2.5 text-sm font-semibold bg-transparent focus:outline-none placeholder:text-slate-400"
                          />
                          <button
                            onClick={handleSelfServicePin}
                            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white shadow-md shadow-[#0F85B0]/20 transition shrink-0 active:scale-95"
                          >
                            Access Portal
                          </button>
                        </div>
                        {selfServiceError && (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 font-semibold mt-3 animate-fade-in">
                            <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>{selfServiceError}</span>
                          </div>
                        )}
                      </div>

                      {/* Security note */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-6">
                        <Icons.Shield className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Confidential Employee Portal · End-to-End Encrypted Live Sync</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Profile Selector Cards */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Staff Profile Directory</h3>
                      <span className="text-[11px] font-bold text-slate-400">{activeEmployees.length} Active Staff</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeEmployees.map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => { setSelfServiceEmp(emp); setSelfServicePin(emp.biometricId); setSelfServiceError(""); }}
                          className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all group ${
                            isDark
                              ? "bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-[#38bdf8]/50 hover:shadow-lg hover:shadow-sky-500/5"
                              : "bg-white border-slate-200/90 hover:border-[#0F85B0]/50 hover:bg-sky-50/30 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-extrabold text-sm flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                              {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs truncate group-hover:text-[#0F85B0] dark:group-hover:text-[#38bdf8] transition-colors">
                                {emp.firstName} {emp.lastName}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">{emp.role}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                              isDark ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                            }`}>
                              {emp.biometricId}
                            </span>
                            <span className="text-[9px] text-[#0ea5e9] font-bold mt-1 group-hover:translate-x-0.5 transition-transform">
                              Open →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                  {/* Top Navigation & Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => { setSelfServiceEmp(null); setSelfServicePin(""); }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-xs ${
                        isDark
                          ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>←</span>
                      <span>Back to Staff Directory</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}>
                        Period: <strong className="text-[#0ea5e9]">{selectedMonth}</strong>
                      </span>
                      <button
                        onClick={() => setSelectedPaySlip(selfServiceEmp.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F85B0] hover:bg-[#0c6c8f] text-white shadow-md shadow-[#0F85B0]/20 transition active:scale-95"
                      >
                        <Icons.Printer className="w-3.5 h-3.5" />
                        <span>Print Payslip</span>
                      </button>
                    </div>
                  </div>

                  {/* Staff Profile Hero Card */}
                  <div className={`p-6 sm:p-7 rounded-3xl border transition-smooth backdrop-blur-xl relative overflow-hidden ${
                    isDark
                      ? "bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 shadow-xl"
                      : "bg-gradient-to-br from-white via-sky-50/20 to-white border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0F85B0] via-sky-500 to-teal-400 p-0.5 shadow-md shadow-[#0F85B0]/20 shrink-0">
                          <div className={`w-full h-full rounded-[14px] flex items-center justify-center font-black text-xl text-white ${isDark ? "bg-slate-900" : "bg-[#0F85B0]"}`}>
                            {selfServiceEmp.firstName.charAt(0)}{selfServiceEmp.lastName.charAt(0)}
                          </div>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black tracking-tight">{selfServiceEmp.firstName} {selfServiceEmp.lastName}</h2>
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                              isDark ? "bg-[#042633] text-[#38bdf8] border-[#09526e]" : "bg-sky-50 text-[#0c6c8f] border-sky-200"
                            }`}>
                              {selfServiceEmp.role}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                            <span className="font-mono font-bold text-emerald-500">Biometric ID: {selfServiceEmp.biometricId}</span>
                            <span>•</span>
                            <span>{selfServiceEmp.payType}</span>
                            <span>•</span>
                            <span>{selfServiceEmp.epfEligible ? "EPF Contributor" : "EPF Exempt"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Status Tag */}
                      <div className={`p-3 rounded-2xl border text-right sm:text-left flex sm:flex-col justify-between items-center sm:items-start ${
                        isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200/80"
                      }`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Policy</span>
                        <span className="text-xs font-black text-[#0ea5e9]">{salarySettings.punctualGraceType} Mode</span>
                      </div>
                    </div>

                    {/* Metric Highlights Ribbon */}
                    {(() => {
                      const calc = payrollCalcs.find(c => c.employee.id === selfServiceEmp.id);
                      if (!calc) return null;
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                          <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-slate-50/70 border-slate-200/70"}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Worked Sessions</span>
                            <span className="text-lg font-black text-slate-900 dark:text-white">{calc.sessionCount} Days</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{formatHoursAndMins(calc.totalWorkHours)} logged</span>
                          </div>
                          <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-slate-50/70 border-slate-200/70"}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Punctual Days</span>
                            <span className="text-lg font-black text-emerald-500">{calc.punctualCount} / {calc.sessionCount}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {calc.sessionCount > 0 ? `${Math.round((calc.punctualCount / calc.sessionCount) * 100)}% on-time` : "No sessions"}
                            </span>
                          </div>
                          <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-slate-50/70 border-slate-200/70"}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overtime Hours</span>
                            <span className="text-lg font-black text-[#0ea5e9]">{formatHoursAndMins(calc.totalOtHours)}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">LKR {calc.otPay.toLocaleString()}</span>
                          </div>
                          <div className={`p-3.5 rounded-xl border ${isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-slate-50/70 border-slate-200/70"}`}>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Take-Home</span>
                            <span className="text-lg font-black text-emerald-500">LKR {Math.round(calc.netSalary).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Estimated</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 2-Column Grid: Leave Balances & Detailed Payslip */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Leave Balances & Policy (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                      {/* Leave Balances Card */}
                      <div className={`p-5 rounded-3xl border transition-smooth backdrop-blur-xl ${
                        isDark ? "bg-slate-900/60 border-slate-800 shadow-xl" : "bg-white border-slate-200/80 shadow-sm"
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Leave Quotas</h3>
                          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Year 2026</span>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: "Annual Leave", key: "annual" as const, color: "text-blue-500" },
                            { label: "Sick Leave", key: "sick" as const, color: "text-amber-500" },
                            { label: "Casual Leave", key: "casual" as const, color: "text-emerald-500" },
                          ].map(item => (
                            <div key={item.key} className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                              isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200/60"
                            }`}>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</p>
                                <p className="text-[10px] text-slate-400">Available balance</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-xl font-black ${item.color}`}>{selfServiceEmp.leaveBalances[item.key]}</span>
                                <span className="text-[10px] text-slate-400 ml-1 font-semibold">days</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Policy reference */}
                      <div className={`p-5 rounded-3xl border ${
                        isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-slate-50/80 border-slate-200/70"
                      }`}>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Shift Policy</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Clinic shifts commence at <strong>15:30</strong> (Tue-Fri), <strong>13:00</strong> (Sat), and <strong>07:30</strong> (Sun). Punctual bonuses evaluate under <strong>{salarySettings.punctualGraceType}</strong> policy ({salarySettings.punctualGraceType === "Strict" ? "0m grace" : `${salarySettings.punctualGraceMinutes}m grace`}).
                        </p>
                      </div>
                    </div>

                    {/* Right Column: Live Payslip Summary (8 cols) */}
                    <div className="lg:col-span-8">
                      {(() => {
                        const calc = payrollCalcs.find(c => c.employee.id === selfServiceEmp.id);
                        if (!calc) return null;
                        return (
                          <div className={`p-6 rounded-3xl border transition-smooth backdrop-blur-xl ${
                            isDark ? "bg-slate-900/60 border-slate-800 shadow-xl" : "bg-white border-slate-200/80 shadow-sm"
                          }`}>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Earnings &amp; Deductions Breakdown</h3>
                                <p className="text-xs text-slate-400">Statement for {selectedMonth}</p>
                              </div>
                              <button
                                onClick={() => setSelectedPaySlip(selfServiceEmp.id)}
                                className="px-3 py-1.5 text-xs font-bold text-[#0ea5e9] hover:text-[#0F85B0] dark:hover:text-[#38bdf8] flex items-center gap-1.5 transition"
                              >
                                <Icons.Printer className="w-3.5 h-3.5" />
                                <span>Full Payslip</span>
                              </button>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs mt-3">
                              <div className="py-2.5 flex justify-between items-center">
                                <span className="text-slate-500 font-medium">Basic / Session Pay</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">LKR {calc.basicEarnings.toLocaleString()}</span>
                              </div>
                              {calc.totalAllowances > 0 && (
                                <div className="py-2.5 flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">Fixed / Qualification Allowances</span>
                                  <span className="font-mono font-bold text-emerald-500">+LKR {calc.totalAllowances.toLocaleString()}</span>
                                </div>
                              )}
                              {calc.workedDaysBonus > 0 && (
                                <div className="py-2.5 flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    Worked Days Bonus <span className="text-[10px] text-slate-400 font-normal">({calc.sessionCount} × {calc.attBonusRate})</span>
                                  </span>
                                  <span className="font-mono font-bold text-emerald-500">+LKR {calc.workedDaysBonus.toLocaleString()}</span>
                                </div>
                              )}
                              {calc.punctualDaysBonus > 0 && (
                                <div className="py-2.5 flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    Punctual Days Bonus <span className="text-[10px] text-emerald-500 font-bold">({calc.punctualCount} × {calc.puncBonusRate})</span>
                                  </span>
                                  <span className="font-mono font-bold text-emerald-500">+LKR {calc.punctualDaysBonus.toLocaleString()}</span>
                                </div>
                              )}
                              {calc.otPay > 0 && (
                                <div className="py-2.5 flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">
                                    Overtime Pay <span className="text-[10px] text-slate-400 font-normal">({formatHoursAndMins(calc.totalOtHours)})</span>
                                  </span>
                                  <span className="font-mono font-bold text-emerald-500">+LKR {calc.otPay.toLocaleString()}</span>
                                </div>
                              )}
                              {calc.exceedIncomeBonus > 0 && (
                                <div className="py-2.5 flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">Target Excess Income Bonus</span>
                                  <span className="font-mono font-bold text-emerald-500">+LKR {calc.exceedIncomeBonus.toLocaleString()}</span>
                                </div>
                              )}

                              <div className="py-2.5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30 px-3 rounded-lg -mx-3 font-bold">
                                <span className="text-slate-700 dark:text-slate-200">Gross Remuneration</span>
                                <span className="font-mono text-slate-900 dark:text-white">LKR {calc.grossEarnings.toLocaleString()}</span>
                              </div>

                              {calc.noPayDeduction > 0 && (
                                <div className="py-2.5 flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">No-Pay Absence Deduction ({calc.absentCount}d)</span>
                                  <span className="font-mono font-bold text-rose-500">-LKR {Math.round(calc.noPayDeduction).toLocaleString()}</span>
                                </div>
                              )}
                              <div className="py-2.5 flex justify-between items-center">
                                <span className="text-slate-500 font-medium">EPF Employee Share (8%)</span>
                                <span className="font-mono font-bold text-rose-500">
                                  {calc.employee.epfEligible ? `-LKR ${Math.round(calc.employeeEpf).toLocaleString()}` : "Exempt"}
                                </span>
                              </div>
                              {calc.apitMonthly > 0 && (
                                <div className="py-2.5 flex justify-between items-center">
                                  <span className="text-slate-500 font-medium">APIT Income Tax</span>
                                  <span className="font-mono font-bold text-rose-500">-LKR {Math.round(calc.apitMonthly).toLocaleString()}</span>
                                </div>
                              )}

                              <div className="pt-4 flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-black text-slate-900 dark:text-white block">Net Payable Salary</span>
                                  <span className="text-[10px] text-slate-400">Direct transfer remittance</span>
                                </div>
                                <span className="font-mono text-xl sm:text-2xl font-black text-[#0ea5e9]">
                                  LKR {Math.round(calc.netSalary).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Bottom Full-Width Attendance History Feed */}
                  <div className={`p-6 rounded-3xl border transition-smooth backdrop-blur-xl ${
                    isDark ? "bg-slate-900/60 border-slate-800 shadow-xl" : "bg-white border-slate-200/80 shadow-sm"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Attendance Verification Logs</h3>
                        <p className="text-xs text-slate-400">Daily punch timestamps evaluated with live {salarySettings.punctualGraceType} policy</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Hardware Verified
                        </span>
                      </div>
                    </div>

                    {/* Log items feed */}
                    <div className="space-y-2 mt-4 max-h-96 overflow-y-auto pr-1">
                      {(() => {
                        const empLogs = attendanceLogs
                          .filter(l => l.employeeId === selfServiceEmp.id && l.date >= dateRange.startDate && l.date <= dateRange.endDate)
                          .sort((a, b) => b.date.localeCompare(a.date));

                        if (empLogs.length === 0) {
                          return (
                            <div className="py-12 text-center text-xs text-slate-400">
                              No attendance logs recorded for this period.
                            </div>
                          );
                        }

                        const effectiveHours = selfServiceEmp.customOperatingHours?.length
                          ? selfServiceEmp.customOperatingHours
                          : operatingHours;

                        return empLogs.map(l => {
                          const isPunc = ["On-Time", "Late"].includes(l.status)
                            ? calculateIsPunctual(l.checkIn, l.date, effectiveHours, salarySettings.punctualGraceType, salarySettings.punctualGraceMinutes)
                            : (l.status === "On-Time");
                          const effStatus = (l.status === "On-Time" || l.status === "Late")
                            ? (isPunc ? "On-Time" : "Late")
                            : l.status;

                          const logDate = new Date(l.date + "T00:00:00Z");
                          const dayOfWeek = logDate.getUTCDay();
                          const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                          const opHour = effectiveHours.find(h => h.dayOfWeek === dayOfWeek);

                          let delayMinutes = 0;
                          if (opHour && opHour.isOpen && l.checkIn) {
                            const [startH, startM] = opHour.startTime.split(":").map(Number);
                            const [inH, inM] = l.checkIn.split(":").map(Number);
                            const diff = (inH * 60 + inM) - (startH * 60 + startM);
                            if (diff > 0) delayMinutes = diff;
                          }

                          const ot = l.overtimeHours > 0
                            ? l.overtimeHours
                            : calculateOvertimeHours(l.checkOut, l.date, effectiveHours, salarySettings.otCalculationType, salarySettings.otGracePeriodMinutes);

                          return (
                            <div
                              key={l.id}
                              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                                isDark ? "bg-slate-950/40 border-slate-800/80 hover:bg-slate-900" : "bg-slate-50/60 border-slate-200/60 hover:bg-white hover:shadow-xs"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center text-center shrink-0">
                                  <span className="text-[9px] font-black uppercase text-slate-400">{dayNames[dayOfWeek]}</span>
                                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 font-mono leading-none">
                                    {l.date.split("-")[2]}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{l.date}</span>
                                    {opHour && opHour.isOpen ? (
                                      <span className="text-[10px] text-slate-400">Shift: {opHour.startTime} → {opHour.endTime}</span>
                                    ) : (
                                      <span className="text-[10px] text-amber-500">Off-Day / Special</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">In: {l.checkIn}</span>
                                    <span>→</span>
                                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">Out: {l.checkOut || "Active Shift"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {ot > 0 && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold border bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                                    +{formatHoursAndMins(ot)} OT
                                  </span>
                                )}
                                {effStatus === "Late" ? (
                                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black border bg-amber-500/10 border-amber-500/30 text-amber-400 flex items-center gap-1">
                                    <Icons.AlertTriangle className="w-3 h-3" />
                                    <span>Late {delayMinutes > 0 ? `(+${delayMinutes}m)` : ""}</span>
                                  </span>
                                ) : effStatus === "On-Time" ? (
                                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                                    <Icons.CheckCircle className="w-3 h-3" />
                                    <span>On-Time</span>
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${statusColor(effStatus, isDark)}`}>
                                    {effStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ SETTINGS ═══════════════ */}
          {activeTab==="settings" && (
            <div className="space-y-6">
              {/* Settings Page Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wide mb-2 border transition ${
                    isDark ? "bg-[#042633]/70 border-[#09526e] text-[#38bdf8]" : "bg-sky-50 border-sky-200 text-[#0c6c8f] shadow-xs"
                  }`}>
                    <Icons.Shield className="w-3.5 h-3.5 text-[#0ea5e9]" />
                    <span>Clinic Administration &amp; System Configuration</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Settings &amp; Preferences
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure hardware biometric synchronization, salary bonus policies, clinic identity branding, staff directory, and schedule operating hours.
                  </p>
                </div>
              </div>

              {/* Segmented Pill Navigation Bar */}
              <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/80 border-slate-800 shadow-lg"
                  : "bg-white/80 border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
              }`}>
                {SETTINGS_TABS.map(t => {
                  const active = settingsTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSettingsTab(t.id as SettingsTabId)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        active
                          ? "bg-[#0F85B0] text-white shadow-md shadow-[#0F85B0]/25 scale-[1.01]"
                          : isDark
                            ? "text-slate-400 hover:text-white hover:bg-slate-800/60"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                      }`}
                    >
                      {t.id === "biometric" && <Icons.Camera className="w-4 h-4 shrink-0" />}
                      {t.id === "company" && <Icons.FileText className="w-4 h-4 shrink-0" />}
                      {t.id === "security" && <Icons.Shield className="w-4 h-4 shrink-0" />}
                      {t.id === "epf" && <Icons.TrendingUp className="w-4 h-4 shrink-0" />}
                      {t.id === "staff" && <Icons.Users className="w-4 h-4 shrink-0" />}
                      {t.id === "operating-hours" && <Icons.Clock className="w-4 h-4 shrink-0" />}
                      {t.id === "holidays" && <Icons.Calendar className="w-4 h-4 shrink-0" />}
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-tab Content Area */}
              <div className={`p-6 sm:p-8 rounded-3xl border transition-smooth backdrop-blur-xl ${
                isDark
                  ? "bg-slate-900/60 border-slate-800 shadow-2xl"
                  : "bg-white border-slate-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
              }`}>

                {/* BIOMETRIC & HIKVISION CLOUD SETTINGS */}
                {settingsTab==="biometric" && (
                  <div className="space-y-6 max-w-3xl">
                    {/* Featured Device Card */}
                    <div className={`p-6 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
                      isDark
                        ? "bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border-slate-800 shadow-xl"
                        : "bg-gradient-to-br from-sky-50/50 via-white to-sky-50/20 border-slate-200/80 shadow-sm"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0F85B0] via-sky-500 to-teal-400 p-0.5 shadow-md shadow-[#0F85B0]/20 shrink-0">
                            <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${isDark ? "bg-slate-900" : "bg-white"}`}>
                              <Icons.Camera className="w-7 h-7 text-[#0ea5e9]" />
                            </div>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-rose-500/10 text-rose-500 rounded-md border border-rose-500/20">
                                Active Cloud Hardware
                              </span>
                              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 rounded-md border border-emerald-500/20 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>ISUP 5.0 Live Push</span>
                              </span>
                            </div>
                            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                              Hikvision DS-K1T320MFWX Face Terminal
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Touchless Facial &amp; Biometric Time Attendance · Port 8000 / HTTP Push
                            </p>
                          </div>
                        </div>

                        <span className={`px-3 py-1 text-xs font-mono font-bold rounded-xl border self-start sm:self-auto ${
                          isDark ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                        }`}>
                          ● 192.168.8.135 (Online)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
                        <div className={`p-3 rounded-2xl border ${isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white/80 border-slate-200/80"}`}>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Authentication</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">Face · Fingerprint · Card</span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white/80 border-slate-200/80"}`}>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Local Network IP</span>
                          <span className="font-mono font-bold text-emerald-500 mt-0.5 block">192.168.8.135:80</span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${isDark ? "bg-slate-950/40 border-slate-800/80" : "bg-white/80 border-slate-200/80"}`}>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sync Protocol</span>
                          <span className="font-semibold text-[#0ea5e9] mt-0.5 block">HTTP Real-time Push</span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Settings */}
                    <div className={`p-6 rounded-3xl border ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200/80 shadow-xs"} space-y-5`}>
                      <div>
                        <h4 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                          Cloud Webhook &amp; Listener Endpoint
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Endpoint configured inside Hikvision Web Client (<code className="text-[#0ea5e9]">Network → Advanced → Event Notification</code>).
                        </p>
                      </div>

                      <div>
                        <label className={labelCls}>Hikvision HTTP Notification / ISUP Server URL</label>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            className={`${inputCls(isDark)} font-mono text-xs font-semibold ${
                              isDark ? "text-emerald-400 bg-slate-900 border-slate-800" : "text-emerald-700 bg-emerald-50/80 border-emerald-300"
                            }`}
                            value="/api/biometric/hikvision"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/api/biometric/hikvision`);
                              setSettingsSaveMsg("Webhook URL copied to clipboard!");
                              setTimeout(() => setSettingsSaveMsg(""), 3000);
                            }}
                            className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap flex items-center gap-1.5 transition active:scale-95 ${
                              isDark ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs"
                            }`}
                          >
                            <Icons.Clipboard className="w-3.5 h-3.5 text-[#0ea5e9]" />
                            <span>Copy Webhook</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className={labelCls}>Device Model &amp; Firmware Mode</label>
                          <select
                            className={inputCls(isDark)}
                            value={bioForm.deviceType}
                            onChange={e => setBioForm(p => ({ ...p, deviceType: e.target.value as BiometricSettings["deviceType"] }))}
                          >
                            {["Hikvision DS-K1T320EFWX (ISUP 5.0 Cloud)", "ZKTeco TCP", "Cloud ADMS", "Hikvision Web"].map(d => (
                              <option key={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Sync Protocol Schedule</label>
                          <select
                            className={inputCls(isDark)}
                            value={bioForm.pollInterval}
                            onChange={e => setBioForm(p => ({ ...p, pollInterval: e.target.value as BiometricSettings["pollInterval"] }))}
                          >
                            {["Real-time Push (ISUP)", "Every 15 mins", "Hourly", "Daily", "Manual"].map(d => (
                              <option key={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        {settingsSaveMsg && settingsTab === "biometric" ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Icons.Check className="w-3.5 h-3.5" />
                            <span>{settingsSaveMsg}</span>
                          </span>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => {
                            updateBiometricSettings(bioForm);
                            setSettingsSaveMsg("Biometric settings updated successfully!");
                            setTimeout(() => setSettingsSaveMsg(""), 3000);
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#0F85B0]/20 transition active:scale-95 flex items-center gap-1.5"
                        >
                          <Icons.Check className="w-3.5 h-3.5" />
                          <span>Save Biometric Settings</span>
                        </button>
                      </div>
                    </div>

                    {/* Hardware Test & Simulation Box */}
                    <div className={`p-6 rounded-3xl border ${isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200/80 shadow-xs"} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                            Live Hardware Simulator
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Test real-time event push payloads as if sent by the Hikvision DS-K1T320EFWX terminal.
                          </p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide rounded-lg border ${
                          isDark ? "bg-[#0ea5e9]/10 text-[#38bdf8] border-[#0ea5e9]/20" : "bg-[#f0f9ff] text-[#0c6c8f] border-[#bae6fd]"
                        }`}>
                          Cloud API Tester
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className={labelCls}>Target Staff Member (Biometric ID)</label>
                          <select
                            className={inputCls(isDark)}
                            value={selectedSimEmpId}
                            onChange={e => setSelectedSimEmpId(e.target.value)}
                          >
                            {employees.map(e => (
                              <option key={e.id} value={e.biometricId}>
                                #{e.biometricId} - {e.firstName} {e.lastName} ({e.role})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={async () => {
                              setSimulatingScan(true);
                              setSimResult(null);
                              const res = await simulateHikvisionScan(selectedSimEmpId, "Face");
                              setSimulatingScan(false);
                              const info = res as { success?: boolean; receiverResponse?: { data?: { action?: string; time?: string } } } | undefined;
                              if (info?.success) {
                                setSimResult(`Face Verified! ${info.receiverResponse?.data?.action || "punch"} recorded at ${info.receiverResponse?.data?.time || "now"}`);
                              } else {
                                setSimResult("Event simulation failed");
                              }
                            }}
                            disabled={simulatingScan}
                            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                          >
                            <Icons.Bolt className="w-4 h-4" />
                            <span>{simulatingScan ? "Transmitting payload..." : "Simulate Face Scan"}</span>
                          </button>
                        </div>
                      </div>

                      {simResult && (
                        <div className={`p-3 rounded-xl text-xs font-mono border flex items-center gap-2 ${
                          isDark ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                        }`}>
                          <Icons.CheckCircle className="w-4 h-4 shrink-0" />
                          <span>{simResult}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CLINIC COMPANY PROFILE */}
                {settingsTab === "company" && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                      <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                        Clinic Identity &amp; Organization Profile
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        These credentials, address details, and official logo appear automatically on all printed Payslips, Monthly Statements, and EPF Form C-3 reports.
                      </p>
                    </div>

                    {/* Official Clinic Logo Upload */}
                    <div className={`p-6 rounded-3xl border ${
                      isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200/80 shadow-xs"
                    }`}>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        Official Clinic Logo
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        {/* Logo Preview box */}
                        <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center p-2.5 shrink-0 relative overflow-hidden transition ${
                          profileForm.logoUrl
                            ? (isDark ? "bg-slate-800 border-sky-500/50 shadow-md" : "bg-white border-[#0F85B0]/40 shadow-sm")
                            : (isDark ? "bg-slate-900/60 border-slate-700 text-slate-500" : "bg-white border-slate-200 text-slate-400 shadow-sm")
                        }`}>
                          {profileForm.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={profileForm.logoUrl} alt="Clinic Logo Preview" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/logo.png" alt="Default Logo" className="w-10 h-10 object-contain opacity-40 grayscale mb-1" />
                              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Default</span>
                            </div>
                          )}
                        </div>

                        {/* Upload Controls & Guidance */}
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white text-xs font-bold shadow-md shadow-[#0F85B0]/20 transition active:scale-95">
                              <Icons.Printer className="w-3.5 h-3.5" />
                              <span>{profileForm.logoUrl ? "Change Clinic Logo" : "Upload Clinic Logo"}</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 1.5 * 1024 * 1024) {
                                    alert("Please choose an image under 1.5 MB for crisp print rendering.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = ev => {
                                    const b64 = ev.target?.result as string;
                                    if (b64) setProfileForm(p => ({ ...p, logoUrl: b64 }));
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>

                            {profileForm.logoUrl && (
                              <button
                                type="button"
                                onClick={() => setProfileForm(p => ({ ...p, logoUrl: "" }))}
                                className="px-3 py-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition"
                              >
                                Remove Custom Logo
                              </button>
                            )}
                          </div>

                          <div className={`p-3 rounded-2xl border text-[11px] space-y-1 ${
                            isDark ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500 shadow-xs"
                          }`}>
                            <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Logo Requirements for Payslip Rendering:
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Transparent PNG or SVG with square/horizontal proportions (250×250px up to 600×600px).
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 rounded-3xl border ${
                      isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200/80 shadow-xs"
                    } space-y-4`}>
                      <div>
                        <label className={labelCls}>Clinic / Entity Name</label>
                        <input
                          className={inputCls(isDark)}
                          value={profileForm.name || ""}
                          onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="e.g. Smile Hub Premium Dental Care"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Official Registered Address</label>
                        <textarea
                          rows={2}
                          className={inputCls(isDark)}
                          value={profileForm.address || ""}
                          onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))}
                          placeholder="e.g. 951, 1st Floor, Art Lanka Building, Peradeniya Road, Kandy"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Contact Phone Number</label>
                          <input
                            className={inputCls(isDark)}
                            value={profileForm.phone || ""}
                            onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="+94 81 223 4567"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Official Contact Email</label>
                          <input
                            type="email"
                            className={inputCls(isDark)}
                            value={profileForm.email || ""}
                            onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="contact@smilehub.lk"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>EPF Registration No.</label>
                          <input
                            className={inputCls(isDark)}
                            value={profileForm.epfRegNo || ""}
                            onChange={e => setProfileForm(p => ({ ...p, epfRegNo: e.target.value }))}
                            placeholder="e.g. EPF 24345/D"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>ETF Registration No.</label>
                          <input
                            className={inputCls(isDark)}
                            value={profileForm.etfRegNo || ""}
                            onChange={e => setProfileForm(p => ({ ...p, etfRegNo: e.target.value }))}
                            placeholder="e.g. ETF 24345/D"
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        {settingsSaveMsg && settingsTab === "company" ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Icons.Check className="w-3.5 h-3.5" />
                            <span>{settingsSaveMsg}</span>
                          </span>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => {
                            updateCompanyProfile(profileForm);
                            if (profileForm.epfRegNo || profileForm.etfRegNo) {
                              updateEpfSettings({ epfRegNo: profileForm.epfRegNo, etfRegNo: profileForm.etfRegNo });
                            }
                            setSettingsSaveMsg("Clinic profile saved successfully!");
                            setTimeout(() => setSettingsSaveMsg(""), 3000);
                          }}
                          className="px-5 py-2.5 bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#0F85B0]/20 transition active:scale-95 flex items-center gap-1.5"
                        >
                          <Icons.Check className="w-3.5 h-3.5" />
                          <span>Save Clinic Profile</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECURITY & ADMIN PIN */}
                {settingsTab === "security" && (
                  <div className="space-y-6 max-w-lg">
                    <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
                      <div className="flex items-center gap-2">
                        <Icons.Shield className="w-5 h-5 text-[#0ea5e9]" />
                        <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                          Administrator PIN &amp; Access Security
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Authorize unlocks for sensitive payroll remittances, staff salary adjustments, and system hardware configuration.
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (updateAdminPin(newPinInput)) {
                          setPinChangeMsg("Admin PIN updated successfully!");
                          setNewPinInput("");
                        } else {
                          setPinChangeMsg("PIN must be exactly 4 digits");
                        }
                      }}
                      className={`p-6 rounded-3xl border space-y-4 ${
                        isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200/80 shadow-xs"
                      }`}
                    >
                      <div>
                        <label className={labelCls}>Current Active PIN</label>
                        <input
                          disabled
                          readOnly
                          className={`${inputCls(isDark)} font-mono tracking-widest text-center text-sm ${
                            isDark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-600"
                          }`}
                          value={`•••• (Active: ${adminPin})`}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>New 4-Digit Security PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="e.g. 5678"
                          className={`${inputCls(isDark)} font-mono text-center tracking-[0.5em] text-lg font-bold`}
                          value={newPinInput}
                          onChange={e => {
                            setNewPinInput(e.target.value);
                            setPinChangeMsg("");
                          }}
                        />
                      </div>

                      {pinChangeMsg && (
                        <p className={`text-xs font-bold text-center flex items-center justify-center gap-1.5 ${
                          pinChangeMsg.includes("successfully") ? "text-emerald-400" : "text-rose-500"
                        }`}>
                          {pinChangeMsg.includes("successfully") ? (
                            <Icons.Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Icons.AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          <span>{pinChangeMsg}</span>
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={newPinInput.length !== 4}
                        className="w-full py-2.5 bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-[#0F85B0]/20 transition active:scale-95 text-xs flex items-center justify-center gap-1.5"
                      >
                        <Icons.LockClosed className="w-3.5 h-3.5" />
                        <span>Update Security PIN</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* SALARY & DYNAMIC BONUS SETTINGS */}
                {settingsTab==="epf" && (
                  <div className="space-y-8 max-w-4xl pb-10">
                    
                    {/* DYNAMIC BONUSES & ATTENDANCE INCENTIVES ENGINE */}
                    <div className={`p-6 rounded-2xl border transition-smooth ${
                      isDark ? "bg-zinc-950/40 border-zinc-800 shadow-xl shadow-black/20" : "bg-white border-zinc-200/90 shadow-sm"
                    } space-y-6`}>
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                            isDark ? "bg-sky-500/10 border-sky-500/20 text-[#38bdf8]" : "bg-sky-50 border-sky-200 text-[#0F85B0]"
                          }`}>
                            <Icons.TrendingUp className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={`text-base font-extrabold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                                Dynamic Attendance &amp; Punctuality Bonuses
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Real-Time Biometric Sync
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              Calculates per-day worked incentives and on-time arrival bonuses directly into employee payslips.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateSalarySettings(salarySettings);
                              setSettingsSaveMsg("Dynamic Bonus rates saved successfully!");
                              setTimeout(() => setSettingsSaveMsg(""), 3000);
                            }}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-[#0F85B0] to-[#0ea5e9] hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
                          >
                            <Icons.Check className="w-3.5 h-3.5" />
                            <span>Save Dynamic Rates</span>
                          </button>
                        </div>
                      </div>

                      {/* Formula Visual Explainer Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className={`p-3.5 rounded-xl border ${
                          isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200/80"
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Worked Days Bonus</span>
                          </div>
                          <p className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            Attended Days × Rate
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                            e.g. 21 days × LKR {salarySettings.globalWorkedDayBonus || 200} = <strong className="text-zinc-700 dark:text-zinc-200">LKR {(21 * (salarySettings.globalWorkedDayBonus || 200)).toLocaleString()}</strong>
                          </p>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${
                          isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200/80"
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#0F85B0] shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Punctual Days Bonus</span>
                          </div>
                          <p className="font-mono text-xs font-extrabold text-[#0F85B0] dark:text-[#38bdf8]">
                            On-Time Days × Rate
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                            e.g. 21 scans × LKR {salarySettings.globalPunctualBonus || 200} = <strong className="text-zinc-700 dark:text-zinc-200">LKR {(21 * (salarySettings.globalPunctualBonus || 200)).toLocaleString()}</strong>
                            <span className="block mt-0.5 text-[9px] text-[#0F85B0] dark:text-[#38bdf8] font-bold">
                              Policy: {salarySettings.punctualGraceType === "Strict" ? "Strict (0m Cutoff)" : `+${salarySettings.punctualGraceMinutes || 15}m Grace Window`}
                            </span>
                          </p>
                        </div>

                        <div className={`p-3.5 rounded-xl border ${
                          isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200/80"
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Exceed Income Bonus</span>
                          </div>
                          <p className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400">
                            Clinic Revenue Surplus × %
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                            Applies global share ({salarySettings.globalIncomeBonusPct || 0}%) or per-person manual bonus.
                          </p>
                        </div>
                      </div>

                      {/* Part 1: Global Baseline Dynamic Rates */}
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              Clinic Global Baseline Incentive Rates
                            </h4>
                            <p className="text-[11px] text-zinc-400">
                              Default rates applied across all staff members unless specifically customized below.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Global Worked Day Bonus */}
                          <div className={`p-4 rounded-xl border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50/70 border-zinc-200"} space-y-2.5`}>
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Worked Day Bonus</label>
                              <span className="text-[10px] font-mono text-emerald-600 font-bold">Per Attended Day</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">LKR</span>
                              <input
                                type="number"
                                min="0"
                                step="25"
                                className={`${inputCls(isDark)} pl-12 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400`}
                                value={salarySettings.globalWorkedDayBonus}
                                onChange={e => updateSalarySettings({ globalWorkedDayBonus: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {[150, 200, 250, 300].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => updateSalarySettings({ globalWorkedDayBonus: val })}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                                    salarySettings.globalWorkedDayBonus === val
                                      ? "bg-emerald-500 text-white border-emerald-500"
                                      : isDark ? "border-zinc-700 hover:bg-zinc-800 text-zinc-400" : "border-zinc-200 hover:bg-white text-zinc-600"
                                  }`}
                                >
                                  LKR {val}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Global Punctual Day Bonus */}
                          <div className={`p-4 rounded-xl border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50/70 border-zinc-200"} space-y-2.5`}>
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Punctual Day Bonus</label>
                              <span className="text-[10px] font-mono text-[#0F85B0] dark:text-[#38bdf8] font-bold">Per On-Time Day</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">LKR</span>
                              <input
                                type="number"
                                min="0"
                                step="25"
                                className={`${inputCls(isDark)} pl-12 font-mono font-bold text-sm text-[#0F85B0] dark:text-[#38bdf8]`}
                                value={salarySettings.globalPunctualBonus}
                                onChange={e => updateSalarySettings({ globalPunctualBonus: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {[150, 200, 250, 300].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => updateSalarySettings({ globalPunctualBonus: val })}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                                    salarySettings.globalPunctualBonus === val
                                      ? "bg-[#0F85B0] text-white border-[#0F85B0]"
                                      : isDark ? "border-zinc-700 hover:bg-zinc-800 text-zinc-400" : "border-zinc-200 hover:bg-white text-zinc-600"
                                  }`}
                                >
                                  LKR {val}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Global Income Bonus Percentage */}
                          <div className={`p-4 rounded-xl border ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50/70 border-zinc-200"} space-y-2.5`}>
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200">Income Bonus Share</label>
                              <span className="text-[10px] font-mono text-amber-500 font-bold">Revenue %</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                className={`${inputCls(isDark)} pr-8 font-mono font-bold text-sm text-amber-500`}
                                value={salarySettings.globalIncomeBonusPct}
                                onChange={e => updateSalarySettings({ globalIncomeBonusPct: parseFloat(e.target.value) || 0 })}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">%</span>
                            </div>
                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {[1, 2, 3, 5].map(val => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => updateSalarySettings({ globalIncomeBonusPct: val })}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                                    salarySettings.globalIncomeBonusPct === val
                                      ? "bg-amber-500 text-white border-amber-500"
                                      : isDark ? "border-zinc-700 hover:bg-zinc-800 text-zinc-400" : "border-zinc-200 hover:bg-white text-zinc-600"
                                  }`}
                                >
                                  {val}%
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Part 2: Per-Staff Dynamic Bonus Matrix & Overrides */}
                      <div className="space-y-3 pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Staff Individual Dynamic Bonus Matrix &amp; Overrides
                              </h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-zinc-100 text-zinc-700 border-zinc-200"
                              }`}>
                                {activeEmployees.length} Staff Members
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              Customize individual Worked &amp; Punctual rates. Set to 0 to automatically inherit the global baseline above.
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
                            isDark ? "bg-slate-800/80 border-slate-700 text-sky-400" : "bg-sky-50 border-sky-200 text-sky-700"
                          }`}>
                            Active Month: {selectedMonth}
                          </span>
                        </div>

                        <div className="space-y-3 mt-2">
                          {activeEmployees.map(emp => {
                            const personBonusKey = `${selectedMonth}_${emp.id}`;
                            const exceedVal = monthlyExcessIncome[personBonusKey] !== undefined
                              ? monthlyExcessIncome[personBonusKey]
                              : "";
                            const initials = `${emp.firstName[0] || ""}${emp.lastName[0] || ""}`.toUpperCase();
                            const isWorkedCustom = emp.attendanceBonusRate > 0;
                            const isPunctualCustom = emp.punctualBonusRate > 0;

                            return (
                              <div
                                key={emp.id}
                                className={`p-4 rounded-xl border transition ${
                                  isDark ? "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700" : "bg-zinc-50/80 border-zinc-200 hover:border-zinc-300 shadow-2xs"
                                }`}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                  {/* Staff Info */}
                                  <div className="flex items-center gap-3 min-w-[220px]">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-extrabold text-xs flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                                      {initials}
                                    </div>
                                    <div>
                                      <p className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</p>
                                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{emp.role} · {emp.payType} · Biometric: {emp.biometricId}</p>
                                    </div>
                                  </div>

                                  {/* Dynamic Rate Adjustments */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                                    {/* Worked Day Bonus */}
                                    <div className={`p-2.5 rounded-lg border ${
                                      isDark ? "bg-zinc-950/40 border-zinc-800/80" : "bg-white border-zinc-200"
                                    }`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Worked Day Bonus</label>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                          isWorkedCustom
                                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                            : "text-zinc-400"
                                        }`}>
                                          {isWorkedCustom ? "Custom" : `Global: ${salarySettings.globalWorkedDayBonus}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-zinc-400">LKR</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="25"
                                          placeholder={String(salarySettings.globalWorkedDayBonus)}
                                          value={emp.attendanceBonusRate || ""}
                                          onChange={e => updateEmployee(emp.id, { attendanceBonusRate: parseFloat(e.target.value) || 0 })}
                                          className={`${inputCls(isDark)} py-1 px-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400`}
                                        />
                                        {isWorkedCustom && (
                                          <button
                                            type="button"
                                            onClick={() => updateEmployee(emp.id, { attendanceBonusRate: 0 })}
                                            className="text-[9px] px-1.5 py-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                            title="Reset to Global Baseline"
                                          >
                                            Reset
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Punctual Day Bonus */}
                                    <div className={`p-2.5 rounded-lg border ${
                                      isDark ? "bg-zinc-950/40 border-zinc-800/80" : "bg-white border-zinc-200"
                                    }`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Punctual Day Bonus</label>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                          isPunctualCustom
                                            ? "bg-sky-500/10 text-[#0F85B0] dark:text-[#38bdf8] border border-sky-500/20"
                                            : "text-zinc-400"
                                        }`}>
                                          {isPunctualCustom ? "Custom" : `Global: ${salarySettings.globalPunctualBonus}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-zinc-400">LKR</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="25"
                                          placeholder={String(salarySettings.globalPunctualBonus)}
                                          value={emp.punctualBonusRate || ""}
                                          onChange={e => updateEmployee(emp.id, { punctualBonusRate: parseFloat(e.target.value) || 0 })}
                                          className={`${inputCls(isDark)} py-1 px-2 text-xs font-mono font-bold text-[#0F85B0] dark:text-[#38bdf8]`}
                                        />
                                        {isPunctualCustom && (
                                          <button
                                            type="button"
                                            onClick={() => updateEmployee(emp.id, { punctualBonusRate: 0 })}
                                            className="text-[9px] px-1.5 py-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                            title="Reset to Global Baseline"
                                          >
                                            Reset
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Monthly Exceed Income Bonus */}
                                    <div className={`p-2.5 rounded-lg border ${
                                      isDark ? "bg-zinc-950/40 border-zinc-800/80" : "bg-white border-zinc-200"
                                    }`}>
                                      <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">Exceed Income Bonus</label>
                                        <span className="text-[9px] text-zinc-400">Month: {selectedMonth}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-zinc-400">LKR</span>
                                        <input
                                          type="number"
                                          min="0"
                                          step="100"
                                          placeholder="0"
                                          className={`${inputCls(isDark)} py-1 px-2 text-xs font-mono font-bold text-right text-amber-500`}
                                          value={exceedVal}
                                          onChange={e => updateMonthlyExcessIncome(selectedMonth, parseFloat(e.target.value) || 0, emp.id)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* PUNCTUALITY & ARRIVAL GRACE POLICY */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Icons.Clock className="w-4 h-4 text-[#0F85B0] dark:text-[#38bdf8]" />
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Punctuality &amp; Arrival Grace Policy</h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          salarySettings.punctualGraceType === "Strict"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        }`}>
                          {salarySettings.punctualGraceType === "Strict" ? "Strict Mode (0 min)" : `Grace Window (${salarySettings.punctualGraceMinutes || 15} mins)`}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Controls whether check-in events past the scheduled shift start time qualify as <strong>On-Time</strong> (awarding the Punctual Days Bonus) or <strong>Late</strong>.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Policy Mode</label>
                          <select 
                            className={inputCls(isDark)}
                            value={salarySettings.punctualGraceType || "Grace Period"}
                            onChange={e => updateSalarySettings({ punctualGraceType: e.target.value as "Strict" | "Grace Period" })}
                          >
                            <option value="Grace Period">Grace Period (Forgives minor delays)</option>
                            <option value="Strict">Strict (Minute-by-Minute Cutoff)</option>
                          </select>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {salarySettings.punctualGraceType === "Strict"
                              ? "Any check-in after the exact shift start (e.g. 08:31 AM for 08:30) is marked Late."
                              : `Arriving within ${salarySettings.punctualGraceMinutes || 15} mins of shift start awards the full Punctual Bonus.`
                            }
                          </p>
                        </div>
                        
                        {salarySettings.punctualGraceType !== "Strict" && (
                          <div>
                            <div className="flex items-center justify-between">
                              <label className={labelCls}>Grace Period (Minutes)</label>
                              <span className="text-[10px] font-mono text-[#0F85B0] dark:text-[#38bdf8] font-bold">
                                +{salarySettings.punctualGraceMinutes || 15} mins tolerance
                              </span>
                            </div>
                            <input 
                              type="number" 
                              min="1"
                              max="120"
                              step="5"
                              className={inputCls(isDark)} 
                              value={salarySettings.punctualGraceMinutes || 15} 
                              onChange={e => updateSalarySettings({ punctualGraceMinutes: parseInt(e.target.value) || 0 })}
                            />
                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                              {[5, 10, 15, 20, 30].map(mins => (
                                <button
                                  key={mins}
                                  type="button"
                                  onClick={() => updateSalarySettings({ punctualGraceMinutes: mins })}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                                    (salarySettings.punctualGraceMinutes || 15) === mins
                                      ? "bg-[#0F85B0] text-white border-[#0F85B0]"
                                      : isDark ? "border-zinc-700 hover:bg-zinc-800 text-zinc-400" : "border-zinc-200 hover:bg-white text-zinc-600"
                                  }`}
                                >
                                  {mins} min
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* OVERTIME POLICY */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800">Overtime Policy</h3>
                      <p className="text-[10px] text-zinc-500">Determine how the Biometric System handles check-outs that occur after the scheduled Operating Hours.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Calculation Mode</label>
                          <select 
                            className={inputCls(isDark)}
                            value={salarySettings.otCalculationType}
                            onChange={e => updateSalarySettings({ otCalculationType: e.target.value as "Manual" | "Strict" | "Grace Period" })}
                          >
                            <option value="Manual">Disabled / Manual Only</option>
                            <option value="Strict">Strict (Minute-by-Minute)</option>
                            <option value="Grace Period">Grace Period (Forgives small delays)</option>
                          </select>
                        </div>
                        
                        {salarySettings.otCalculationType === "Grace Period" && (
                          <div>
                            <label className={labelCls}>Grace Period (Minutes)</label>
                            <input 
                              type="number" 
                              className={inputCls(isDark)} 
                              value={salarySettings.otGracePeriodMinutes} 
                              onChange={e => updateSalarySettings({ otGracePeriodMinutes: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-[10px] text-zinc-500 mt-1">If staff leave within {salarySettings.otGracePeriodMinutes} mins of session end, OT = 0.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* EPF / ETF */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800">Statutory Rates (EPF/ETF)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className={labelCls}>Employee EPF (%)</label><input type="number" className={inputCls(isDark)} value={epfForm.employeeRate} onChange={e=>setEpfForm(p=>({...p, employeeRate: parseFloat(e.target.value)||0}))}/></div>
                        <div><label className={labelCls}>Employer EPF (%)</label><input type="number" className={inputCls(isDark)} value={epfForm.employerRate} onChange={e=>setEpfForm(p=>({...p, employerRate: parseFloat(e.target.value)||0}))}/></div>
                        <div><label className={labelCls}>ETF (%)</label><input type="number" className={inputCls(isDark)} value={epfForm.etfRate} onChange={e=>setEpfForm(p=>({...p, etfRate: parseFloat(e.target.value)||0}))}/></div>
                      </div>
                      <div><label className={labelCls}>Working Days / Month</label><input type="number" className={`${inputCls(isDark)} max-w-[120px]`} value={salarySettings.workingDaysPerMonth} onChange={e=>updateSalarySettings({workingDaysPerMonth: parseInt(e.target.value)||20})}/><p className="text-[10px] text-zinc-500 mt-1">Used to calculate daily no-pay rate.</p></div>
                      
                      <div className="pt-2 border-t border-zinc-800">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Salary Period Cycle</h4>
                        <select className={inputCls(isDark)} value={cycleStartDayForm} onChange={e=>setCycleStartDayForm(parseInt(e.target.value)||1)}>
                          {Array.from({length:31},(_,i)=>i+1).map(day=>{const s=daySuffix(day);const pd=day-1;const ps=daySuffix(pd);return(<option key={day} value={day}>{day}{s} of month {day===1?"(Standard calendar month)":`(${day}${s} to ${pd}${ps} of next month)`}</option>);})}
                        </select>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        {settingsSaveMsg && settingsTab === "epf" ? <span className="text-xs font-bold text-emerald-400">{settingsSaveMsg}</span> : <span />}
                        <button type="button" onClick={() => { updateEpfSettings(epfForm); updatePayrollCycleStartDay(cycleStartDayForm); updateSalarySettings(salarySettings); setSettingsSaveMsg("Salary & Bonus Settings updated successfully!"); setTimeout(() => setSettingsSaveMsg(""), 3000); }} className="px-4 py-2 bg-[#0F85B0] hover:bg-[#0ea5e9] text-white text-xs font-bold rounded-xl shadow transition">Save Salary Settings</button>
                      </div>
                    </div>

                    {/* ALLOWANCES */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 border-b pb-2 dark:border-zinc-800">Global Allowance Categories</h3>
                      <div className="space-y-2.5">
                        {allowances.map(al => {
                          const isEditing = editingAllowanceId === al.id;

                          if (isEditing) {
                            return (
                              <div
                                key={al.id}
                                className={`p-4 rounded-xl border transition-all ${
                                  isDark
                                    ? "bg-zinc-900/90 border-[#0F85B0]/60 ring-1 ring-[#0F85B0]/40"
                                    : "bg-sky-50/50 border-[#0F85B0]/60 ring-1 ring-[#0F85B0]/30 shadow-sm"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#0F85B0] animate-pulse" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F85B0]">
                                      Edit Allowance Category
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-400 font-mono">ID: {al.id}</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className={labelCls}>Allowance Name</label>
                                    <input
                                      className={inputCls(isDark)}
                                      value={editingAllowanceForm.name}
                                      onChange={e => setEditingAllowanceForm(p => ({ ...p, name: e.target.value }))}
                                      placeholder="e.g. Medical Allowance"
                                      autoFocus
                                    />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Amount (LKR)</label>
                                    <input
                                      type="number"
                                      className={inputCls(isDark)}
                                      value={editingAllowanceForm.amount}
                                      onChange={e => setEditingAllowanceForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelCls}>Type</label>
                                    <select
                                      className={inputCls(isDark)}
                                      value={editingAllowanceForm.type}
                                      onChange={e => setEditingAllowanceForm(p => ({ ...p, type: e.target.value }))}
                                    >
                                      <option value="Fixed">Fixed</option>
                                      <option value="Monthly">Monthly</option>
                                      <option value="Variable">Variable</option>
                                      <option value="Session">Per Session</option>
                                    </select>
                                  </div>
                                </div>

                                <div className={`flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                                  <div className="flex items-center gap-5">
                                    <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                                      <input
                                        type="checkbox"
                                        checked={editingAllowanceForm.epfApplicable}
                                        onChange={e => setEditingAllowanceForm(p => ({ ...p, epfApplicable: e.target.checked }))}
                                        className="rounded border-zinc-300 text-[#0F85B0] focus:ring-[#0F85B0]"
                                      />
                                      EPF Applicable
                                    </label>
                                    <label className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                                      <input
                                        type="checkbox"
                                        checked={editingAllowanceForm.taxDeductible}
                                        onChange={e => setEditingAllowanceForm(p => ({ ...p, taxDeductible: e.target.checked }))}
                                        className="rounded border-zinc-300 text-[#0F85B0] focus:ring-[#0F85B0]"
                                      />
                                      Tax Deductible
                                    </label>
                                  </div>

                                  <div className="flex items-center gap-2 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => setEditingAllowanceId(null)}
                                      className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                                        isDark
                                          ? "text-zinc-400 hover:bg-zinc-800"
                                          : "text-zinc-600 hover:bg-zinc-200"
                                      }`}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!editingAllowanceForm.name.trim()) return;
                                        await updateAllowance(al.id, {
                                          name: editingAllowanceForm.name.trim(),
                                          amount: editingAllowanceForm.amount,
                                          type: editingAllowanceForm.type,
                                          epfApplicable: editingAllowanceForm.epfApplicable,
                                          taxDeductible: editingAllowanceForm.taxDeductible,
                                        });
                                        setEditingAllowanceId(null);
                                      }}
                                      className={`px-4 py-1.5 text-xs font-bold rounded shadow transition ${
                                        isDark
                                          ? "bg-white text-zinc-900 hover:bg-zinc-100"
                                          : "bg-[#0F85B0] text-white hover:bg-[#0c6c8f]"
                                      }`}
                                    >
                                      Save Changes
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={al.id}
                              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                isDark
                                  ? "bg-zinc-950/50 border-zinc-800/80 hover:border-zinc-700"
                                  : "bg-white border-zinc-200/90 shadow-sm hover:border-zinc-300"
                              }`}
                            >
                              <div>
                                <p className={`font-semibold text-xs tracking-tight ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                                  {al.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                                    LKR {al.amount.toLocaleString()}
                                  </span>
                                  <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>·</span>
                                  <span className={`text-[11px] font-medium ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                                    {al.type}
                                  </span>
                                  {al.epfApplicable && (
                                    <>
                                      <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>·</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 font-semibold rounded ${
                                        isDark
                                          ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                                          : "bg-sky-100/70 text-sky-700 border border-sky-200"
                                      }`}>
                                        EPF Subject
                                      </span>
                                    </>
                                  )}
                                  {al.taxDeductible && (
                                    <>
                                      <span className={isDark ? "text-zinc-600" : "text-zinc-400"}>·</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 font-semibold rounded ${
                                        isDark
                                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                          : "bg-emerald-100/70 text-emerald-700 border border-emerald-200"
                                      }`}>
                                        Tax Deductible
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAllowanceId(al.id);
                                    setEditingAllowanceForm({
                                      name: al.name,
                                      amount: al.amount,
                                      epfApplicable: al.epfApplicable,
                                      taxDeductible: al.taxDeductible,
                                      type: al.type,
                                    });
                                  }}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded transition flex items-center gap-1 ${
                                    isDark
                                      ? "text-sky-400 hover:bg-sky-950/40"
                                      : "text-[#0F85B0] hover:bg-sky-50"
                                  }`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteAllowance(al.id)}
                                  className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                                    isDark
                                      ? "text-rose-400 hover:bg-rose-950/40"
                                      : "text-rose-600 hover:bg-rose-50"
                                  }`}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-xl ${
                        isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50/70 border-slate-200/80"
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Add Clinic Allowance</h4>
                          <span className="text-[10px] text-slate-400">Custom statutory & non-statutory stipends</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="sm:col-span-2">
                            <label className={labelCls}>Allowance Name</label>
                            <input
                              className={inputCls(isDark)}
                              placeholder="e.g. Specialist Clinic Session Allowance"
                              value={newAllowance.name}
                              onChange={e=>setNewAllowance(p=>({...p,name:e.target.value}))}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Amount (LKR)</label>
                            <input
                              type="number"
                              className={inputCls(isDark)}
                              value={newAllowance.amount}
                              onChange={e=>setNewAllowance(p=>({...p,amount:parseFloat(e.target.value)||0}))}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Type</label>
                            <select
                              className={inputCls(isDark)}
                              value={newAllowance.type}
                              onChange={e=>setNewAllowance(p=>({...p,type:e.target.value}))}
                            >
                              <option value="Fixed">Fixed</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Variable">Variable</option>
                              <option value="Session">Per Session</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                          <div className="flex items-center gap-5">
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={newAllowance.epfApplicable}
                                onChange={e=>setNewAllowance(p=>({...p,epfApplicable:e.target.checked}))}
                                className="w-4 h-4 rounded text-[#0F85B0] focus:ring-[#0F85B0]"
                              />
                              <span>EPF Applicable</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={newAllowance.taxDeductible}
                                onChange={e=>setNewAllowance(p=>({...p,taxDeductible:e.target.checked}))}
                                className="w-4 h-4 rounded text-[#0F85B0] focus:ring-[#0F85B0]"
                              />
                              <span>Tax Deductible</span>
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={()=>{
                              if(newAllowance.name.trim()){
                                addAllowance(newAllowance);
                                setNewAllowance({name:"",amount:10000,epfApplicable:false,taxDeductible:true,type:"Fixed"});
                              }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#0F85B0]/20 transition active:scale-95 flex items-center gap-1.5"
                          >
                            <Icons.Plus className="w-3.5 h-3.5" />
                            <span>Add Allowance</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* APIT */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                          APIT / PAYE Tax Slabs (Annual Income)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Follows Sri Lanka Inland Revenue Department guidelines. Monthly APIT is computed as 1/12th of projected annual tax.
                        </p>
                      </div>
                      <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${
                        isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-200/80 bg-white shadow-sm"
                      }`}>
                        <table className="w-full text-xs">
                          <thead className={`border-b ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50/80 border-slate-200/80"}`}>
                            <tr>
                              {["From (LKR)","To (LKR)","Rate (%)"].map(h=>(
                                <th key={h} className="px-5 py-3.5 text-left font-black text-[10px] uppercase tracking-wider text-slate-400">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? "divide-slate-800/60" : "divide-slate-100"}`}>
                            {apitSlabs.map((slab,idx)=>(
                              <tr key={idx} className={isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/60"}>
                                <td className="px-5 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                                  LKR {slab.minIncome.toLocaleString()}
                                </td>
                                <td className="px-5 py-3 font-mono text-slate-500">
                                  {slab.maxIncome ? `LKR ${slab.maxIncome.toLocaleString()}` : "No limit"}
                                </td>
                                <td className="px-5 py-3">
                                  <span className="px-2.5 py-1 rounded-md text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    {slab.rate}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

                {/* STAFF DIRECTORY */}
                {settingsTab==="staff" && (
                  <div className="space-y-6 max-w-4xl">
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                            Staff &amp; Personnel Directory
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#0ea5e9]/10 text-[#0F85B0] dark:text-[#38bdf8] border border-[#0ea5e9]/20">
                            {activeEmployees.length} Registered Members
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Manage personnel profiles, pay rates, dynamic attendance bonus multipliers, and terminal biometric associations.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const maxBioId = Math.max(...employees.map(e => parseInt(e.biometricId) || 0), 0);
                            const nextBioId = String(maxBioId >= 1 ? maxBioId + 1 : 3);
                            setEditingEmpId(null);
                            setNewEmp({
                              firstName: "",
                              lastName: "",
                              role: "Nurse",
                              payType: "Fixed Monthly",
                              basicSalary: 60000,
                              hourlyRate: 350,
                              sessionRate: 0,
                              commissionRate: 0,
                              biometricId: nextBioId,
                              epfEligible: true,
                              taxable: false,
                              branchId: null,
                              allowanceIds: [],
                              leaveBalances: { annual: 14, sick: 7, casual: 3 },
                              attendanceBonusRate: 0,
                              punctualBonusRate: 0,
                              incomeBonusPercentage: 0,
                            });
                            setShowAddEmpModal(true);
                          }}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl border shadow-xs transition flex items-center gap-2 ${
                            isDark
                              ? "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icons.Refresh className="w-3.5 h-3.5 text-[#38bdf8]" />
                          <span>Import from Terminal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEmpId(null);
                            setNewEmp({
                              firstName: "",
                              lastName: "",
                              role: "Nurse",
                              payType: "Fixed Monthly",
                              basicSalary: 50000,
                              hourlyRate: 300,
                              sessionRate: 0,
                              commissionRate: 0,
                              biometricId: "",
                              epfEligible: true,
                              taxable: false,
                              branchId: null,
                              allowanceIds: [],
                              leaveBalances: { annual: 14, sick: 7, casual: 3 },
                              attendanceBonusRate: 0,
                              punctualBonusRate: 0,
                              incomeBonusPercentage: 0,
                              customOperatingHours: []
                            });
                            setShowAddEmpModal(true);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#0F85B0]/20 transition active:scale-95 flex items-center gap-1.5"
                        >
                          <Icons.Plus className="w-3.5 h-3.5" />
                          <span>Register Member</span>
                        </button>
                      </div>
                    </div>

                    {/* Employee Cards List */}
                    <div className="grid grid-cols-1 gap-3">
                      {activeEmployees.map(emp => {
                        const initials = `${emp.firstName[0] || ""}${emp.lastName[0] || ""}`.toUpperCase();
                        const workedRate = emp.attendanceBonusRate || salarySettings.globalWorkedDayBonus || 0;
                        const punctualRate = emp.punctualBonusRate || salarySettings.globalPunctualBonus || 0;
                        return (
                          <div
                            key={emp.id}
                            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                              isDark
                                ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                                : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start sm:items-center gap-3.5">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-black text-sm flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-black text-sm tracking-tight text-slate-900 dark:text-white">
                                      {emp.firstName} {emp.lastName}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                      isDark ? "bg-[#042633]/60 border border-[#09526e]/50 text-[#7dd3fc]" : "bg-[#f0f9ff] border border-[#bae6fd] text-[#0c6c8f]"
                                    }`}>
                                      {emp.role}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                                      isDark ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}>
                                      <Icons.Camera className="w-2.5 h-2.5 text-[#0ea5e9]" />
                                      <span>Biometric #{emp.biometricId || "Unlinked"}</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${
                                      isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    }`}>
                                      <Icons.Calendar className="w-3 h-3 shrink-0" />
                                      <span>Worked: LKR {workedRate.toLocaleString()}/day</span>
                                      {emp.attendanceBonusRate > 0 && <span className="text-[8px] opacity-75 font-black uppercase">(Custom)</span>}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${
                                      isDark ? "bg-sky-500/10 border-sky-500/30 text-sky-400" : "bg-sky-50 border-sky-200 text-[#0F85B0]"
                                    }`}>
                                      <Icons.Clock className="w-3 h-3 shrink-0" />
                                      <span>Punctual: LKR {punctualRate.toLocaleString()}/day</span>
                                      {emp.punctualBonusRate > 0 && <span className="text-[8px] opacity-75 font-black uppercase">(Custom)</span>}
                                    </span>
                                    {emp.allowanceIds.map(aid => {
                                      const al = allowances.find(a => a.id === aid);
                                      return al ? (
                                        <span key={aid} className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium ${
                                          isDark ? "border-slate-800 bg-slate-800/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-600"
                                        }`}>
                                          {al.name}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                                <div className="text-left sm:text-right">
                                  <p className="font-black text-sm text-slate-900 dark:text-white">
                                    {emp.payType === "Fixed Monthly"
                                      ? `LKR ${emp.basicSalary.toLocaleString()}/mo`
                                      : emp.payType === "Session-based"
                                        ? `LKR ${emp.sessionRate.toLocaleString()}/session`
                                        : `LKR ${emp.hourlyRate.toLocaleString()}/hr`}
                                  </p>
                                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                    {emp.epfEligible ? "EPF Subject" : "EPF Exempt"}
                                    {emp.taxable ? " · APIT" : ""} · {emp.payType}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => openEditEmp(emp)}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                                      isDark
                                        ? "border-slate-700 bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700"
                                        : "border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs"
                                    }`}
                                    title="Edit Staff Member"
                                  >
                                    <Icons.Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Delete ${emp.firstName} ${emp.lastName}?`)) {
                                        deleteEmployee(emp.id);
                                      }
                                    }}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                                      isDark
                                        ? "border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40"
                                        : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-xs"
                                    }`}
                                    title="Delete Member"
                                  >
                                    <Icons.Trash className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Machine Enrolled Persons Section */}
                    <div className={`p-6 rounded-3xl border transition-smooth ${
                      isDark ? "bg-slate-900/70 border-slate-800 shadow-xl" : "bg-white border-slate-200/90 shadow-sm"
                    } space-y-5`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white">
                              Terminal Enrolled Persons ({machinePersons.length} / 500)
                            </h4>
                            <span className="px-2.5 py-0.5 text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Push Protocol Connected
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Hardware HTTP Push listener active — biometric scans &amp; users automatically sync in real-time.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              openEditEmp({
                                id: "",
                                firstName: "",
                                lastName: "",
                                role: "Nurse",
                                payType: "Fixed Monthly",
                                basicSalary: 60000,
                                hourlyRate: 350,
                                sessionRate: 0,
                                commissionRate: 0,
                                biometricId: String(machinePersons.length + 1),
                                epfEligible: true,
                                taxable: false,
                                active: true,
                                branchId: null,
                                allowanceIds: [],
                                leaveBalances: { annual: 14, sick: 7, casual: 3 },
                                attendanceBonusRate: 0,
                                punctualBonusRate: 0,
                                incomeBonusPercentage: 0,
                              });
                            }}
                            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white shadow-md shadow-[#0F85B0]/20 transition flex items-center gap-1.5"
                          >
                            <Icons.Plus className="w-3.5 h-3.5" />
                            <span>Link New Terminal ID</span>
                          </button>
                          <button
                            type="button"
                            disabled={isFetchingPersons}
                            onClick={async () => {
                              await fetchMachinePersons();
                              setSettingsSaveMsg("Enrolled users synced via Hikvision Push protocol!");
                              setTimeout(() => setSettingsSaveMsg(""), 3000);
                            }}
                            className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 border transition ${
                              isDark
                                ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-xs"
                            }`}
                          >
                            <Icons.Refresh className={`w-3.5 h-3.5 text-[#38bdf8] ${isFetchingPersons ? "animate-spin" : ""}`} />
                            <span>{isFetchingPersons ? "Syncing..." : "Sync Enrolled Persons"}</span>
                          </button>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl text-xs border ${
                        isDark ? "bg-[#042633]/30 border-[#09526e]/50 text-[#7dd3fc]" : "bg-[#f0f9ff] border-[#bae6fd] text-[#09526e]"
                      }`}>
                        <div className="font-black flex items-center gap-2 mb-1.5">
                          <Icons.Shield className="w-4 h-4 text-[#38bdf8]" />
                          <span>Connecting Local Router IP (192.168.8.135) to Cloud App</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          Because the Hikvision terminal is on a local private Wi-Fi network (<code>192.168.8.135</code>), cloud servers cannot open inbound HTTP calls to local router IPs directly.
                          <br />
                          <strong>To register new staff added on Hikvision browser:</strong>
                        </p>
                        <ul className="list-disc list-inside text-[11px] mt-2 space-y-1 font-medium opacity-90">
                          <li><strong>Option 1 (Automatic)</strong>: Have the new employee scan their face/finger on the terminal once — our server will auto-register them in real-time!</li>
                          <li><strong>Option 2 (Manual)</strong>: Click <strong>Link New Terminal ID</strong> above and enter their Biometric ID (e.g. <code>3</code>, <code>4</code>).</li>
                        </ul>
                      </div>

                      <div className={`overflow-x-auto rounded-2xl border ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                        <table className="w-full text-xs text-left">
                          <thead className={`text-[10px] font-black uppercase tracking-wider border-b ${
                            isDark ? "bg-slate-900/90 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}>
                            <tr>
                              <th className="px-5 py-3.5">User ID</th>
                              <th className="px-5 py-3.5">Name</th>
                              <th className="px-5 py-3.5">Type</th>
                              <th className="px-5 py-3.5">Biometrics Enrolled</th>
                              <th className="px-5 py-3.5 text-right">App Status</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? "divide-slate-800/40" : "divide-slate-100"}`}>
                            {machinePersons.map(p => {
                              const matchedEmp = employees.find(e => e.biometricId === p.employeeNo);
                              return (
                                <tr key={p.employeeNo} className={isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/60"}>
                                  <td className="px-5 py-3.5 font-mono font-bold text-[#0ea5e9]">#{p.employeeNo}</td>
                                  <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                                  <td className="px-5 py-3.5 text-slate-400 uppercase text-[10px] font-black">{p.userType}</td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex gap-2 text-[10px]">
                                      {p.numOfFace ? (
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                                          Face
                                        </span>
                                      ) : null}
                                      {p.numOfFingerprint ? (
                                        <span className="px-2 py-0.5 rounded-md bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/20 font-bold">
                                          Fingerprint
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    {matchedEmp ? (
                                      <span className="px-2.5 py-1 text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                                        Linked ({matchedEmp.firstName})
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openEditEmp({
                                            id: "",
                                            firstName: p.name,
                                            lastName: "",
                                            role: "Nurse",
                                            payType: "Fixed Monthly",
                                            basicSalary: 50000,
                                            hourlyRate: 300,
                                            sessionRate: 0,
                                            commissionRate: 0,
                                            biometricId: p.employeeNo,
                                            epfEligible: true,
                                            taxable: false,
                                            active: true,
                                            branchId: null,
                                            allowanceIds: [],
                                            leaveBalances: { annual: 14, sick: 7, casual: 3 },
                                            attendanceBonusRate: 0,
                                            punctualBonusRate: 0,
                                            incomeBonusPercentage: 0
                                          });
                                        }}
                                        className="px-2.5 py-1 text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition"
                                      >
                                        Import to Staff
                                      </button>
                                    )}
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

                {/* OPERATING HOURS */}
                {settingsTab==="operating-hours" && (
                  <div className="space-y-6 max-w-4xl">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                            Clinic Operating Schedule &amp; Shifts
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {operatingHours.filter(h => h.isOpen).length} Days Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Standard clinic hours for each day of the week. Used to calculate shift durations, punctuality grace, and overtime hours.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          updateOperatingHours(operatingHours);
                          setSettingsSaveMsg("Operating hours updated successfully!");
                          setTimeout(() => setSettingsSaveMsg(""), 3000);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#0F85B0]/20 transition active:scale-95 flex items-center gap-1.5"
                      >
                        <Icons.Check className="w-3.5 h-3.5" />
                        <span>Save Operating Schedule</span>
                      </button>
                    </div>

                    {/* Day Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {operatingHours.map(h => {
                        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                        const dayName = dayNames[h.dayOfWeek];
                        
                        // Calculate shift duration
                        let durationLabel = "";
                        if (h.isOpen && h.startTime && h.endTime) {
                          const [sH, sM] = h.startTime.split(":").map(Number);
                          const [eH, eM] = h.endTime.split(":").map(Number);
                          if (!isNaN(sH) && !isNaN(eH)) {
                            let diff = (eH * 60 + eM) - (sH * 60 + sM);
                            if (diff < 0) diff += 24 * 60;
                            const hrs = Math.floor(diff / 60);
                            const mins = diff % 60;
                            durationLabel = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hrs`;
                          }
                        }

                        return (
                          <div
                            key={h.id}
                            className={`p-5 rounded-2xl border transition-all ${
                              h.isOpen
                                ? isDark
                                  ? "bg-slate-900/80 border-slate-700/80 shadow-md"
                                  : "bg-white border-slate-200/90 shadow-xs"
                                : isDark
                                  ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                                  : "bg-slate-50/70 border-slate-200/60 opacity-60"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${h.isOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`} />
                                <span className="font-black text-sm text-slate-900 dark:text-white">{dayName}</span>
                              </div>
                              <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={h.isOpen}
                                    onChange={() => {
                                      const updated = operatingHours.map(o => o.dayOfWeek === h.dayOfWeek ? { ...o, isOpen: !o.isOpen } : o);
                                      updateOperatingHours(updated);
                                    }}
                                  />
                                  <div className={`block w-10 h-6 rounded-full transition-colors ${
                                    h.isOpen ? "bg-[#0F85B0]" : (isDark ? "bg-slate-700" : "bg-slate-300")
                                  }`} />
                                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                                    h.isOpen ? "transform translate-x-4" : ""
                                  }`} />
                                </div>
                              </label>
                            </div>

                            {h.isOpen ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                      Opens
                                    </label>
                                    <input
                                      type="time"
                                      value={h.startTime}
                                      onChange={e => {
                                        const updated = operatingHours.map(o => o.dayOfWeek === h.dayOfWeek ? { ...o, startTime: e.target.value } : o);
                                        updateOperatingHours(updated);
                                      }}
                                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0F85B0] transition ${
                                        isDark
                                          ? "bg-slate-950 border border-slate-800 text-white"
                                          : "bg-slate-50 border border-slate-200 text-slate-900"
                                      }`}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                      Closes
                                    </label>
                                    <input
                                      type="time"
                                      value={h.endTime}
                                      onChange={e => {
                                        const updated = operatingHours.map(o => o.dayOfWeek === h.dayOfWeek ? { ...o, endTime: e.target.value } : o);
                                        updateOperatingHours(updated);
                                      }}
                                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0F85B0] transition ${
                                        isDark
                                          ? "bg-slate-950 border border-slate-800 text-white"
                                          : "bg-slate-50 border border-slate-200 text-slate-900"
                                      }`}
                                    />
                                  </div>
                                </div>
                                {durationLabel && (
                                  <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between border ${
                                    isDark ? "bg-[#042633]/40 border-[#09526e]/40 text-[#7dd3fc]" : "bg-sky-50 border-sky-200 text-[#0c6c8f]"
                                  }`}>
                                    <span className="flex items-center gap-1">
                                      <Icons.Clock className="w-3 h-3 text-[#38bdf8]" />
                                      <span>Shift Window</span>
                                    </span>
                                    <span className="font-black">{durationLabel}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className={`py-4 text-center rounded-xl border border-dashed text-xs font-semibold ${
                                isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                              }`}>
                                Clinic Closed
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* HOLIDAYS */}
                {settingsTab==="holidays" && (
                  <div className="space-y-6 max-w-3xl">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                            Public &amp; Mercantile Holidays (2026)
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#0ea5e9]/10 text-[#0F85B0] dark:text-[#38bdf8] border border-[#0ea5e9]/20">
                            {publicHolidays.length} Holidays Configured
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Sri Lankan official holidays used to compute double-rate overtime (2× OT) and special attendance bonus multipliers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddHolidayModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-[#0F85B0] to-sky-500 hover:from-[#0c6c8f] hover:to-sky-600 text-white text-xs font-bold rounded-xl shadow-md shadow-[#0F85B0]/20 transition active:scale-95 flex items-center gap-1.5"
                      >
                        <Icons.Plus className="w-3.5 h-3.5" />
                        <span>Add Holiday</span>
                      </button>
                    </div>

                    {/* Holiday Cards Feed */}
                    <div className="space-y-2.5">
                      {publicHolidays.length === 0 ? (
                        <div className={`p-8 text-center rounded-2xl border border-dashed ${
                          isDark ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                        }`}>
                          <Icons.Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="font-bold text-sm">No holidays registered</p>
                          <p className="text-xs mt-0.5">Click &quot;Add Holiday&quot; above to create a holiday entry.</p>
                        </div>
                      ) : (
                        publicHolidays.map(h => {
                          let monthStr = "CAL";
                          let dayStr = "--";
                          let weekdayStr = "";
                          try {
                            const d = new Date(h.date + "T00:00:00");
                            monthStr = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                            dayStr = d.toLocaleDateString("en-US", { day: "2-digit" });
                            weekdayStr = d.toLocaleDateString("en-US", { weekday: "short" });
                          } catch {
                            // fallback
                          }

                          return (
                            <div
                              key={h.id}
                              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                                isDark
                                  ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                                  : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                {/* Calendar Tear-off Icon */}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0F85B0]/15 via-sky-500/10 to-teal-400/15 border border-[#0F85B0]/30 flex flex-col items-center justify-center shrink-0">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-[#0F85B0] dark:text-[#38bdf8] leading-none">
                                    {monthStr}
                                  </span>
                                  <span className="text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
                                    {dayStr}
                                  </span>
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                                      {h.name}
                                    </h4>
                                    {weekdayStr && (
                                      <span className="text-[10px] font-medium text-slate-400">
                                        ({weekdayStr})
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">{h.date}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 sm:gap-4">
                                <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                                  h.isDoubleOT
                                    ? isDark
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                      : "bg-amber-50 border-amber-200 text-amber-700"
                                    : isDark
                                      ? "border-slate-800 text-slate-500 hover:bg-slate-800"
                                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={h.isDoubleOT}
                                    onChange={() => toggleHolidayDoubleOT(h.id)}
                                    className="w-3.5 h-3.5 rounded text-[#0F85B0] focus:ring-[#0F85B0]"
                                  />
                                  <span className="whitespace-nowrap">2× Overtime</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => deleteHoliday(h.id)}
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                                    isDark
                                      ? "border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40"
                                      : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-xs"
                                  }`}
                                  title="Delete Holiday"
                                >
                                  <Icons.Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </main>

      {/* ═══════════════ SLIDE DRAWER (Attendance Edit) ═══════════════ */}
      {(() => {
        const activeDrawerLog = drawerLogId ? attendanceLogs.find(l => l.id === drawerLogId) : null;
        const activeDrawerEmp = activeDrawerLog
          ? employees.find(e => e.id === activeDrawerLog.employeeId || e.biometricId === activeDrawerLog.employeeId || (activeDrawerLog.employee && e.biometricId === String(activeDrawerLog.employee.biometricId)))
          : null;
        const drawerEmpName = activeDrawerEmp
          ? `${activeDrawerEmp.firstName} ${activeDrawerEmp.lastName}`
          : (activeDrawerLog?.employee ? `${activeDrawerLog.employee.firstName} ${activeDrawerLog.employee.lastName}` : `Staff #${activeDrawerLog?.employeeId || ""}`);
        const drawerEmpRole = activeDrawerEmp?.role || "Staff Member";
        const drawerInitial = drawerEmpName.charAt(0).toUpperCase();
        const drawerWorkedHours = calculateWorkedHours(punchEdit.checkIn, punchEdit.checkOut);

        return (
          <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${drawerLogId ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerLogId(null)} />
            <div className={`absolute right-0 top-0 h-full w-full max-w-md shadow-2xl transition-transform duration-300 flex flex-col ${drawerLogId ? "translate-x-0" : "translate-x-full"} ${isDark ? "bg-slate-900 border-l border-slate-800" : "bg-white border-l border-slate-200"}`}>
              
              {/* Drawer Header */}
              <div className={`px-6 py-5 border-b flex items-center justify-between ${isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"}`}>
                <div>
                  <h3 className={`font-extrabold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>Adjust Punch Record</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Manual attendance correction &amp; shift adjustment</p>
                </div>
                <button
                  onClick={() => setDrawerLogId(null)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-smooth ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-400 hover:text-white" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 shadow-sm"
                  }`}
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* Staff Context Card */}
                {activeDrawerLog && (
                  <div className={`p-4 rounded-2xl border transition-smooth ${
                    isDark ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50/80 border-slate-200/80"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-extrabold text-sm flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                        {drawerInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-extrabold text-sm leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{drawerEmpName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                            isDark ? "bg-[#042633]/60 border border-[#09526e]/50 text-[#7dd3fc]" : "bg-[#f0f9ff] border border-[#bae6fd] text-[#0c6c8f]"
                          }`}>
                            {drawerEmpRole}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">Date: {activeDrawerLog.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-dashed flex items-center justify-between text-xs border-slate-200 dark:border-slate-700/60">
                      <span className="text-slate-400 text-[11px]">Calculated Duration:</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-lg ${
                        drawerWorkedHours > 0
                          ? isDark ? "bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/20" : "bg-[#f0f9ff] text-[#0c6c8f] border border-[#bae6fd]"
                          : "text-slate-400"
                      }`}>
                        {formatHoursAndMins(drawerWorkedHours)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Check In Time
                    </label>
                    <input
                      type="text"
                      className={`${inputCls(isDark)} font-mono font-semibold rounded-xl text-sm`}
                      value={punchEdit.checkIn}
                      onChange={e => setPunchEdit(p => ({ ...p, checkIn: e.target.value }))}
                      placeholder="HH:MM:SS (e.g. 08:30:00)"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                      Check Out Time
                    </label>
                    <input
                      type="text"
                      className={`${inputCls(isDark)} font-mono font-semibold rounded-xl text-sm`}
                      value={punchEdit.checkOut}
                      onChange={e => {
                        const newOut = e.target.value;
                        const autoOt = activeDrawerLog
                          ? calculateOvertimeHours(newOut, activeDrawerLog.date, operatingHours, salarySettings.otCalculationType, salarySettings.otGracePeriodMinutes)
                          : 0;
                        setPunchEdit(p => ({
                          ...p,
                          checkOut: newOut,
                          overtimeHours: (salarySettings.otCalculationType !== "Manual" && autoOt > 0) ? Math.round(autoOt * 100) / 100 : p.overtimeHours
                        }));
                      }}
                      placeholder="HH:MM:SS (e.g. 17:30:00)"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                      Shift Attendance Status
                    </label>
                    <select
                      className={`${inputCls(isDark)} font-semibold rounded-xl text-xs`}
                      value={punchEdit.status}
                      onChange={e => setPunchEdit(p => ({ ...p, status: e.target.value as AttendanceLog["status"] }))}
                    >  
                      {["On-Time", "Late", "Half-Day", "On-Leave", "Absent"].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        Overtime (Hours)
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        className={`${inputCls(isDark)} font-mono font-bold rounded-xl text-sm text-emerald-500`}
                        value={punchEdit.overtimeHours}
                        onChange={e => setPunchEdit(p => ({ ...p, overtimeHours: parseFloat(e.target.value) || 0 }))}
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        ≈ {formatHoursAndMins(punchEdit.overtimeHours)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                        No-Pay (Hours)
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        className={`${inputCls(isDark)} font-mono font-bold rounded-xl text-sm text-rose-400`}
                        value={punchEdit.noPayHours}
                        onChange={e => setPunchEdit(p => ({ ...p, noPayHours: parseFloat(e.target.value) || 0 }))}
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        ≈ {formatHoursAndMins(punchEdit.noPayHours)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className={`p-5 border-t flex items-center gap-3 ${isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/60"}`}>
                <button
                  onClick={() => setDrawerLogId(null)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-smooth ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (drawerLogId) {
                      updateAttendanceLog(drawerLogId, punchEdit);
                      setDrawerLogId(null);
                    }
                  }}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0F85B0] to-[#0ea5e9] hover:opacity-95 text-white shadow-lg shadow-sky-500/25 transition-smooth"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════ MODAL: ADD/EDIT EMPLOYEE ═══════════════ */}
      {showAddEmpModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${isDark ? "bg-zinc-950/70" : "bg-slate-900/40"}`}>
          <div className={`w-full max-w-xl rounded-xl overflow-hidden shadow-2xl border ${isDark?"bg-zinc-900 border-zinc-800":"bg-white border-zinc-200"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{editingEmpId?"Edit Staff Profile":"Register New Staff Profile"}</h3>
              <button onClick={()=>setShowAddEmpModal(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>First Name</label><input required className={inputCls(isDark)} value={newEmp.firstName} onChange={e=>setNewEmp(p=>({...p,firstName:e.target.value}))}/></div>
                <div><label className={labelCls}>Last Name</label><input required className={inputCls(isDark)} value={newEmp.lastName} onChange={e=>setNewEmp(p=>({...p,lastName:e.target.value}))}/></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Role</label><input required className={inputCls(isDark)} value={newEmp.role} onChange={e=>setNewEmp(p=>({...p,role:e.target.value as Employee["role"]}))} placeholder="e.g. Developer" /></div>
                <div><label className={labelCls}>Pay Type</label><select className={inputCls(isDark)} value={newEmp.payType} onChange={e=>setNewEmp(p=>({...p,payType:e.target.value as Employee["payType"]}))}>{["Fixed Monthly","Session-based","Hourly"].map(r=><option key={r}>{r}</option>)}</select></div>
              </div>
              {newEmp.payType==="Fixed Monthly"&&<div className="grid grid-cols-2 gap-4"><div><label className={labelCls}>Basic Salary (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.basicSalary} onChange={e=>setNewEmp(p=>({...p,basicSalary:parseFloat(e.target.value)||0}))}/></div><div><label className={labelCls}>Hourly Rate (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.hourlyRate} onChange={e=>setNewEmp(p=>({...p,hourlyRate:parseFloat(e.target.value)||0}))}/></div></div>}
              {newEmp.payType==="Session-based"&&<div><label className={labelCls}>Session Rate (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.sessionRate} onChange={e=>setNewEmp(p=>({...p,sessionRate:parseFloat(e.target.value)||0}))}/></div>}
              {newEmp.payType==="Hourly"&&<div><label className={labelCls}>Hourly Rate (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.hourlyRate} onChange={e=>setNewEmp(p=>({...p,hourlyRate:parseFloat(e.target.value)||0}))}/></div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={labelCls}>Biometric ID</label><input required className={inputCls(isDark)} value={newEmp.biometricId} onChange={e=>setNewEmp(p=>({...p,biometricId:e.target.value}))}/></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Worked Day Bonus (LKR / day)</label>
                  <input
                    type="number"
                    min="0"
                    step="25"
                    className={inputCls(isDark)}
                    placeholder={`Global: LKR ${salarySettings.globalWorkedDayBonus}`}
                    value={newEmp.attendanceBonusRate || ""}
                    onChange={e => setNewEmp(p => ({ ...p, attendanceBonusRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Set 0 to inherit Global: LKR {salarySettings.globalWorkedDayBonus}</p>
                </div>
                <div>
                  <label className={labelCls}>Punctual Bonus (LKR / day)</label>
                  <input
                    type="number"
                    min="0"
                    step="25"
                    className={inputCls(isDark)}
                    placeholder={`Global: LKR ${salarySettings.globalPunctualBonus}`}
                    value={newEmp.punctualBonusRate || ""}
                    onChange={e => setNewEmp(p => ({ ...p, punctualBonusRate: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Set 0 to inherit Global: LKR {salarySettings.globalPunctualBonus}</p>
                </div>
                <div>
                  <label className={labelCls}>Income Bonus (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className={inputCls(isDark)}
                    placeholder={`Global: ${salarySettings.globalIncomeBonusPct}%`}
                    value={newEmp.incomeBonusPercentage || ""}
                    onChange={e => setNewEmp(p => ({ ...p, incomeBonusPercentage: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Set 0 to inherit Global: {salarySettings.globalIncomeBonusPct}%</p>
                </div>
              </div>

              <div><label className={labelCls}>Assign Allowances</label><div className="flex flex-wrap gap-2 mt-1">{allowances.map(al=>{const has=newEmp.allowanceIds.includes(al.id);return(<label key={al.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer"><input type="checkbox" checked={has} onChange={()=>setNewEmp(p=>({...p,allowanceIds:has?p.allowanceIds.filter(id=>id!==al.id):[...p.allowanceIds,al.id]}))}/>{al.name}</label>);})}</div></div>
              <div className="flex justify-between gap-5 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <div className="flex gap-5">
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={newEmp.epfEligible} onChange={e=>setNewEmp(p=>({...p,epfEligible:e.target.checked}))} className="rounded"/>EPF / ETF Eligible</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={newEmp.taxable} onChange={e=>setNewEmp(p=>({...p,taxable:e.target.checked}))} className="rounded"/>APIT Taxable</label>
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={newEmp.customOperatingHours && newEmp.customOperatingHours.length > 0} onChange={e => {
                    if (e.target.checked) {
                      setNewEmp(p => ({ ...p, customOperatingHours: operatingHours.map(h => ({ ...h, id: `NEW-${Math.random()}` })) }));
                    } else {
                      setNewEmp(p => ({ ...p, customOperatingHours: [] }));
                    }
                  }} className="rounded"/>
                  <span className="font-bold text-amber-500">Use Custom Operating Hours</span>
                </label>
              </div>

              {newEmp.customOperatingHours && newEmp.customOperatingHours.length > 0 && (
                <div className={`p-4 rounded-xl border ${isDark ? "border-amber-500/30 bg-amber-500/5" : "border-amber-200 bg-amber-50"}`}>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-3">Custom Weekly Schedule</h4>
                  <div className="space-y-2">
                    {newEmp.customOperatingHours.map((hour, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 w-28">
                          <input type="checkbox" className="rounded" checked={hour.isOpen} onChange={e => {
                            const updated = [...newEmp.customOperatingHours!];
                            updated[idx].isOpen = e.target.checked;
                            setNewEmp(p => ({ ...p, customOperatingHours: updated }));
                          }}/>
                          <span className={`font-bold ${hour.isOpen ? (isDark ? "text-zinc-200" : "text-zinc-800") : "text-zinc-500 line-through"}`}>
                            {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][hour.dayOfWeek]}
                          </span>
                        </label>
                        {hour.isOpen ? (
                          <div className="flex items-center gap-2">
                            <input type="time" className={inputCls(isDark)} value={hour.startTime} onChange={e => {
                              const updated = [...newEmp.customOperatingHours!];
                              updated[idx].startTime = e.target.value;
                              setNewEmp(p => ({ ...p, customOperatingHours: updated }));
                            }}/>
                            <span className="text-zinc-500">to</span>
                            <input type="time" className={inputCls(isDark)} value={hour.endTime} onChange={e => {
                              const updated = [...newEmp.customOperatingHours!];
                              updated[idx].endTime = e.target.value;
                              setNewEmp(p => ({ ...p, customOperatingHours: updated }));
                            }}/>
                          </div>
                        ) : (
                          <span className="text-[10px] uppercase font-bold text-amber-500 w-[220px] text-right">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={()=>setShowAddEmpModal(false)} className={`px-4 py-2 text-xs font-bold rounded border ${isDark?"border-zinc-700 text-zinc-400":"border-zinc-200 text-zinc-600"}`}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded shadow">{editingEmpId?"Save Changes":"Register Profile"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: ADD LEAVE REQUEST ═══════════════ */}
      {showAddLeaveModal && (() => {
        const selectedEmp = activeEmployees.find(e => e.id === newLeave.employeeId) || activeEmployees[0];
        
        // Calculate duration if dates are selected
        const effectiveEndDate = leaveDurationMode === "single" || !newLeave.endDate
          ? newLeave.startDate
          : newLeave.endDate;

        let durationDays = 0;
        let isDateInvalid = false;
        if (newLeave.startDate && effectiveEndDate) {
          const start = new Date(newLeave.startDate);
          const end = new Date(effectiveEndDate);
          if (end < start) {
            isDateInvalid = true;
          } else {
            durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }
        }

        const leaveTypes: { type: LeaveRequest["type"]; label: string; icon: React.ReactNode; quotaKey?: "annual" | "sick" | "casual" }[] = [
          { type: "Annual", label: "Annual Leave", icon: <Icons.Sun className="w-3.5 h-3.5" />, quotaKey: "annual" },
          { type: "Sick", label: "Sick Leave", icon: <Icons.HeartPulse className="w-3.5 h-3.5" />, quotaKey: "sick" },
          { type: "Casual", label: "Casual Leave", icon: <Icons.Coffee className="w-3.5 h-3.5" />, quotaKey: "casual" },
          { type: "Unpaid", label: "Unpaid Leave", icon: <Icons.FileText className="w-3.5 h-3.5" /> },
        ];

        const availableQuota = selectedEmp && newLeave.type !== "Unpaid" && selectedEmp.leaveBalances
          ? (selectedEmp.leaveBalances[newLeave.type.toLowerCase() as "annual" | "sick" | "casual"] ?? 0)
          : null;

        const isQuotaExceeded = availableQuota !== null && durationDays > availableQuota;

        const quickReasons = [
          { label: "Family Vacation", icon: <Icons.Sun className="w-3 h-3 text-amber-500" /> },
          { label: "Doctor Appointment", icon: <Icons.HeartPulse className="w-3 h-3 text-rose-500" /> },
          { label: "Personal / Family Matters", icon: <Icons.Home className="w-3 h-3 text-blue-500" /> },
          { label: "Medical Recovery", icon: <Icons.Clock className="w-3 h-3 text-purple-500" /> },
          { label: "Travel / Out of City", icon: <Icons.Plane className="w-3 h-3 text-teal-500" /> },
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-all duration-200 animate-in fade-in">
            <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all ${
              isDark ? "bg-zinc-900/95 border-zinc-800 text-white" : "bg-white/95 border-zinc-200/90 text-zinc-900"
            } backdrop-blur-xl`}>
              
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 via-[#0F85B0] to-indigo-500" />

              {/* Modal Header */}
              <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? "border-zinc-800/80" : "border-zinc-100"}`}>
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                    isDark ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" : "bg-teal-50 text-teal-600 border border-teal-200/60"
                  }`}>
                    <Icons.Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                      New Leave Request
                    </h3>
                    <p className="text-xs text-zinc-400 font-medium">Record planned vacation, sick leave, or personal time off</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddLeaveModal(false)}
                  className={`p-2 rounded-xl transition ${
                    isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                  }`}
                  aria-label="Close modal"
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
                
                {/* 1. Employee Selector & Live Balance Preview */}
                <div className="space-y-2">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Staff Member
                  </label>
                  <div className="relative">
                    <select
                      className={`w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border transition appearance-none cursor-pointer pr-10 ${
                        isDark 
                          ? "bg-zinc-800/80 border-zinc-700 text-white hover:border-zinc-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:border-zinc-300 focus:border-[#0F85B0] focus:ring-2 focus:ring-[#0F85B0]/20"
                      }`}
                      value={newLeave.employeeId || selectedEmp?.id || ""}
                      onChange={e => setNewLeave(p => ({ ...p, employeeId: e.target.value }))}
                    >
                      {activeEmployees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.role})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                      <Icons.ChevronRight className="w-4 h-4 rotate-90" />
                    </div>
                  </div>

                  {/* Remaining Balances Strip for Selected Staff */}
                  {selectedEmp && (
                    <div className={`flex flex-wrap items-center gap-2 p-2.5 rounded-xl border text-[11px] ${
                      isDark ? "bg-zinc-800/40 border-zinc-800/80" : "bg-slate-50 border-slate-200/80"
                    }`}>
                      <span className="text-zinc-400 font-medium">Available Quotas:</span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1.5 ${
                        (selectedEmp.leaveBalances?.annual ?? 0) === 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}>
                        <Icons.Sun className="w-3 h-3" />
                        <span>Annual: {selectedEmp.leaveBalances?.annual ?? 14}/14d</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1.5 ${
                        (selectedEmp.leaveBalances?.sick ?? 0) === 0 ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}>
                        <Icons.HeartPulse className="w-3 h-3" />
                        <span>Sick: {selectedEmp.leaveBalances?.sick ?? 7}/7d</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-semibold flex items-center gap-1.5 ${
                        (selectedEmp.leaveBalances?.casual ?? 0) === 0 ? "bg-rose-500/10 text-rose-500" : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      }`}>
                        <Icons.Coffee className="w-3 h-3" />
                        <span>Casual: {selectedEmp.leaveBalances?.casual ?? 3}/3d</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Leave Type (Interactive Pills) */}
                <div className="space-y-2">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Leave Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {leaveTypes.map(item => {
                      const isSelected = newLeave.type === item.type;
                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setNewLeave(p => ({ ...p, type: item.type }))}
                          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            isSelected
                              ? isDark
                                ? "bg-teal-500/20 border-teal-500 text-teal-300 shadow-sm"
                                : "bg-[#0F85B0]/10 border-[#0F85B0] text-[#0F85B0] shadow-sm font-bold"
                              : isDark
                                ? "bg-zinc-800/50 border-zinc-700/80 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                                : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                          }`}
                        >
                          <span className="shrink-0">{item.icon}</span>
                          <span className="truncate">{item.label.replace(" Leave", "")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Approval Pipeline Status */}
                <div className="space-y-2">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                    Approval Status
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setNewLeave(p => ({ ...p, status: "Pending" }))}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        newLeave.status === "Pending"
                          ? "bg-amber-500/15 border-amber-500/80 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                          : isDark
                            ? "bg-zinc-800/40 border-zinc-700/70 text-zinc-400 hover:bg-zinc-800"
                            : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Pending Approval
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLeave(p => ({ ...p, status: "Approved" }))}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                        newLeave.status === "Approved"
                          ? "bg-emerald-500/15 border-emerald-500/80 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                          : isDark
                            ? "bg-zinc-800/40 border-zinc-700/70 text-zinc-400 hover:bg-zinc-800"
                            : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Instant Approve
                    </button>
                  </div>
                </div>

                {/* 4. Date Selection & Duration Calculator */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Leave Duration
                    </label>
                    {/* Duration Mode Segmented Switch */}
                    <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => {
                          setLeaveDurationMode("single");
                          if (newLeave.startDate) {
                            setNewLeave(p => ({ ...p, endDate: p.startDate }));
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                          leaveDurationMode === "single"
                            ? isDark
                              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs"
                              : "bg-white text-[#0F85B0] border border-[#0F85B0]/20 shadow-xs"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-transparent"
                        }`}
                      >
                        <Icons.Calendar className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col text-left leading-tight whitespace-nowrap">
                          <span className="font-bold">Single Day</span>
                          <span className="text-[10px] font-medium opacity-75">(1 Day)</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveDurationMode("range")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                          leaveDurationMode === "range"
                            ? isDark
                              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-xs"
                              : "bg-white text-[#0F85B0] border border-[#0F85B0]/20 shadow-xs"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-transparent"
                        }`}
                      >
                        <Icons.Clock className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col text-left leading-tight whitespace-nowrap">
                          <span className="font-bold">Date Range</span>
                          <span className="text-[10px] font-medium opacity-75">(Multi-Day)</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {leaveDurationMode === "single" ? (
                    <div>
                      <span className="block text-[10px] text-zinc-400 mb-1 font-medium">Select Date</span>
                      <input
                        type="date"
                        className={`w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border transition ${
                          isDark 
                            ? "bg-zinc-800/80 border-zinc-700 text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" 
                            : "bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-[#0F85B0] focus:ring-2 focus:ring-[#0F85B0]/20"
                        }`}
                        value={newLeave.startDate}
                        onChange={e => {
                          const val = e.target.value;
                          setNewLeave(p => ({ ...p, startDate: val, endDate: val }));
                        }}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[10px] text-zinc-400 mb-1 font-medium">Start Date</span>
                        <input
                          type="date"
                          className={`w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border transition ${
                            isDark 
                              ? "bg-zinc-800/80 border-zinc-700 text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" 
                              : "bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-[#0F85B0] focus:ring-2 focus:ring-[#0F85B0]/20"
                          }`}
                          value={newLeave.startDate}
                          onChange={e => setNewLeave(p => ({ ...p, startDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 mb-1 font-medium">End Date</span>
                        <input
                          type="date"
                          className={`w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border transition ${
                            isDark 
                              ? "bg-zinc-800/80 border-zinc-700 text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" 
                              : "bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-[#0F85B0] focus:ring-2 focus:ring-[#0F85B0]/20"
                          }`}
                          value={newLeave.endDate}
                          onChange={e => setNewLeave(p => ({ ...p, endDate: e.target.value }))}
                        />
                      </div>
                    </div>
                  )}

                  {/* Calculated Duration Banner */}
                  {isDateInvalid && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium flex items-center gap-2">
                      <Icons.AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Invalid range: End date must be on or after start date.</span>
                    </div>
                  )}

                  {!isDateInvalid && durationDays > 0 && (
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                      isQuotaExceeded 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : isDark
                          ? "bg-teal-500/10 border-teal-500/30 text-teal-300"
                          : "bg-teal-50 border-teal-200 text-teal-700"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Icons.Calendar className="w-4 h-4" />
                        <span>Total Duration: <strong>{durationDays} {durationDays === 1 ? "day (Single day leave)" : "days"}</strong></span>
                      </div>
                      {isQuotaExceeded && (
                        <span className="text-[10px] font-normal underline">
                          Exceeds current quota ({availableQuota}d)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Notes & Quick Suggestions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                      Reason / Note (Optional)
                    </label>
                    <span className="text-[10px] text-zinc-400">Keep admin & payroll synced</span>
                  </div>
                  
                  <textarea
                    rows={3}
                    placeholder="e.g. Taking scheduled annual leave for family trip; emergencies covered by colleague..."
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border resize-none transition ${
                      isDark 
                        ? "bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" 
                        : "bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-[#0F85B0] focus:ring-2 focus:ring-[#0F85B0]/20"
                    }`}
                    value={newLeave.note}
                    onChange={e => setNewLeave(p => ({ ...p, note: e.target.value }))}
                  />

                  {/* Quick Reason Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {quickReasons.map(r => (
                      <button
                        key={r.label}
                        type="button"
                        onClick={() => setNewLeave(p => ({ ...p, note: p.note ? `${p.note}, ${r.label}` : r.label }))}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 ${
                          isDark 
                            ? "bg-zinc-800/50 border-zinc-700/60 text-zinc-300 hover:text-white hover:border-zinc-500" 
                            : "bg-zinc-100/80 border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200"
                        }`}
                      >
                        {r.icon}
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
                isDark ? "border-zinc-800 bg-zinc-900/80" : "border-zinc-100 bg-zinc-50/70"
              }`}>
                <button
                  type="button"
                  onClick={() => setShowAddLeaveModal(false)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                    isDark
                      ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newLeave.startDate || (leaveDurationMode === "range" && !newLeave.endDate) || isDateInvalid}
                  onClick={() => {
                    const finalEndDate = leaveDurationMode === "single" || !newLeave.endDate
                      ? newLeave.startDate
                      : newLeave.endDate;

                    if (newLeave.startDate && finalEndDate && !isDateInvalid) {
                      const finalLeave = {
                        ...newLeave,
                        endDate: finalEndDate,
                        employeeId: newLeave.employeeId || selectedEmp?.id || activeEmployees[0]?.id || "",
                      };
                      addLeaveRequest(finalLeave);
                      if (finalLeave.status === "Approved") {
                        setTimeout(() => approveLeave(leaveRequests[0]?.id), 100);
                      }
                      setShowAddLeaveModal(false);
                    }
                  }}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                    !newLeave.startDate || (leaveDurationMode === "range" && !newLeave.endDate) || isDateInvalid
                      ? "opacity-50 cursor-not-allowed bg-zinc-400 text-white"
                      : isDark
                        ? "bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-teal-500/20 active:scale-95"
                        : "bg-[#0F85B0] hover:bg-[#0c6c8f] text-white shadow-[#0F85B0]/25 active:scale-95"
                  }`}
                >
                  <Icons.Plus className="w-4 h-4" />
                  <span>Submit Leave Request</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}





      {/* ═══════════════ MODAL: ADD HOLIDAY ═══════════════ */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md transition-all duration-200 animate-in fade-in">
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden transition-all ${
            isDark ? "bg-zinc-900/95 border-zinc-800 text-white" : "bg-white/95 border-zinc-200/90 text-zinc-900"
          } backdrop-blur-xl`}>
            {/* Top Accent Gradient Bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500" />

            <div className={`flex items-center justify-between px-6 py-5 border-b ${isDark ? "border-zinc-800/80" : "border-zinc-100"}`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  isDark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-50 text-amber-600 border border-amber-200/60"
                }`}>
                  <Icons.Star className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className={`text-base font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                    Add Public Holiday
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">Configure clinic statutory calendar & OT policy</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddHolidayModal(false)}
                className={`p-2 rounded-xl transition ${
                  isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                }`}
                aria-label="Close modal"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Holiday Date
                </label>
                <input
                  type="date"
                  className={`w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border transition ${
                    isDark 
                      ? "bg-zinc-800/80 border-zinc-700 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
                      : "bg-zinc-50 border-zinc-200 text-zinc-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  }`}
                  value={newHoliday.date}
                  onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                  Holiday Name
                </label>
                <input
                  placeholder="e.g. Binara Full Moon Poya Day"
                  className={`w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border transition ${
                    isDark 
                      ? "bg-zinc-800/80 border-zinc-700 text-white placeholder-zinc-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" 
                      : "bg-zinc-50 border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  }`}
                  value={newHoliday.name}
                  onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className={`p-3.5 rounded-xl border transition flex items-start gap-3 cursor-pointer ${
                newHoliday.isDoubleOT
                  ? isDark
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                  : isDark
                    ? "bg-zinc-800/40 border-zinc-800 text-zinc-300"
                    : "bg-zinc-50 border-zinc-200 text-zinc-700"
              }`}
              onClick={() => setNewHoliday(p => ({ ...p, isDoubleOT: !p.isDoubleOT }))}
              >
                <input
                  type="checkbox"
                  checked={newHoliday.isDoubleOT}
                  onChange={e => setNewHoliday(p => ({ ...p, isDoubleOT: e.target.checked }))}
                  className="mt-0.5 rounded text-amber-500 focus:ring-amber-500/20 h-4 w-4"
                />
                <div>
                  <span className="font-bold text-xs block">Double OT (2.0× Rate)</span>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    Staff working on this public holiday receive statutory double overtime rates automatically in payroll.
                  </span>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
              isDark ? "border-zinc-800 bg-zinc-900/80" : "border-zinc-100 bg-zinc-50/70"
            }`}>
              <button
                type="button"
                onClick={() => setShowAddHolidayModal(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition ${
                  isDark
                    ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newHoliday.date || !newHoliday.name}
                onClick={() => {
                  if (newHoliday.date && newHoliday.name) {
                    addHoliday(newHoliday);
                    setShowAddHolidayModal(false);
                  }
                }}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 ${
                  !newHoliday.date || !newHoliday.name
                    ? "opacity-50 cursor-not-allowed bg-zinc-400 text-white"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20 active:scale-95"
                }`}
              >
                <Icons.Plus className="w-4 h-4" />
                <span>Add Holiday</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ PAYSLIP MODAL ═══════════════ */}
      {selectedPaySlip && (() => {
        const calc = payrollCalcs.find(c=>c.employee.id===selectedPaySlip);
        if (!calc) return null;
        const emp = calc.employee;
        
        // Calculate detailed allowances for payslip
        const empAllowances = employeeAllowances.filter(ea => ea.employeeId === emp.id).map(ea => {
          const allDef = allowances.find(a => a.id === ea.allowanceId);
          const amt = ea.overrideAmount ?? allDef?.amount ?? 0;
          return { name: allDef?.name || "Allowance", amount: amt, epfApplicable: allDef?.epfApplicable };
        });
        const epfBase = calc.basicEarnings + empAllowances.filter(a => a.epfApplicable).reduce((sum, a) => sum + a.amount, 0);
        
        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md transition-all duration-200 animate-in fade-in print:relative print:inset-auto print:p-0 print:m-0 print:bg-white print:block ${isDark ? "bg-zinc-950/75" : "bg-slate-900/50"}`}>
            <div className="absolute inset-0 print:hidden" onClick={() => setSelectedPaySlip(null)} />
            <div id="printable-payslip" className="relative z-10 bg-white text-zinc-900 w-full max-w-[480px] rounded-2xl shadow-2xl border border-zinc-200/80 flex flex-col transition-all duration-200 animate-in zoom-in-95 ease-out print:shadow-none print:rounded-none print:border print:border-zinc-300 print:mx-auto">
              <div className="p-6">
                <div className="text-center mb-3 pb-3 border-b-2 border-dashed border-zinc-300">
                  {/* Clinic Logo */}
                  {companyProfile.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={companyProfile.logoUrl} alt={`${companyProfile.name} Logo`} className="max-h-12 max-w-[180px] object-contain mx-auto mb-1.5" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src="/logo.png" alt="MedSync Logo" className="w-8 h-8 object-contain mx-auto mb-1.5" />
                  )}
                  <p className="font-extrabold text-base tracking-wider uppercase text-zinc-900">{companyProfile.name}</p>
                  <p className="text-[10px] text-zinc-500">{companyProfile.address}</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5">EPF Reg: {companyProfile.epfRegNo || epfSettings.epfRegNo || "—"} · Salary Period: {dateRange.startDate} → {dateRange.endDate}</p>
                </div>
                <div className="text-center mb-3">
                  <p className="font-extrabold text-base">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-zinc-500">{emp.role} · Biometric ID: {emp.biometricId}</p>
                </div>
                
                <div className="space-y-1.5 text-xs border-t border-dashed border-zinc-300 pt-3 mb-3">
                  <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                    <span className="text-zinc-500">Basic / Session Pay</span>
                    <span className="font-mono font-semibold">LKR {calc.basicEarnings.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                    <span className="text-zinc-500">Total Worked Hours</span>
                    <span className="font-mono font-semibold">{formatHoursAndMins(calc.totalWorkHours || 0)}</span>
                  </div>
                  
                  {empAllowances.map((a, i) => (
                    <div key={i} className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                      <span className="text-zinc-500">{a.name}</span>
                      <span className="font-mono font-semibold">LKR {a.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  ))}

                  <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                    <span className="text-zinc-500 flex items-center gap-1">Worked Days Bonus <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">({calc.sessionCount} × {calc.attBonusRate})</span></span>
                    <span className="font-mono font-semibold text-emerald-600">+LKR {(calc.workedDaysBonus || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                    <span className="text-zinc-500 flex items-center gap-1">Punctual Days Bonus <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">({calc.punctualCount} × {calc.puncBonusRate})</span></span>
                    <span className="font-mono font-semibold text-emerald-600">+LKR {(calc.punctualDaysBonus || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                    <span className="text-zinc-500 flex items-center gap-1">Overtime Pay <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">({formatHoursAndMins(calc.totalOtHours)} × {Math.round(calc.otPay / (calc.totalOtHours || 1))})</span></span>
                    <span className="font-mono font-semibold text-emerald-600">+LKR {calc.otPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                    <span className="text-zinc-500">Exceed Income Bonus</span>
                    <span className="font-mono font-semibold text-emerald-600">+LKR {(calc.exceedIncomeBonus || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  {calc.manualBonus > 0 && (
                    <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                      <span className="text-zinc-500">Manual Addition / Bonus</span>
                      <span className="font-mono font-semibold text-emerald-600">+LKR {calc.manualBonus.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  )}

                  {calc.noPayDeduction > 0 && (
                    <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                      <span className="text-zinc-500 flex items-center gap-1">No-Pay Deduction <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded">({calc.absentCount} days absent)</span></span>
                      <span className="font-mono font-semibold text-rose-600">-LKR {Math.round(calc.noPayDeduction).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  )}

                  {calc.manualDeduction > 0 && (
                    <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                      <span className="text-zinc-500">Manual Deduction</span>
                      <span className="font-mono font-semibold text-rose-600">-LKR {calc.manualDeduction.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-b-2 border-dashed border-zinc-300 pb-1.5 pt-1.5 mb-1.5 mt-1.5">
                    <span className="font-extrabold text-zinc-700">GROSS EARNINGS</span>
                    <span className="font-mono font-extrabold">LKR {calc.grossEarnings.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-dotted border-zinc-200 pb-1">
                    <span className="text-zinc-500 flex items-center gap-1.5">
                      <span>EPF Deduction (Employee 8%)</span>
                      <span className="text-[9px] text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded whitespace-nowrap">(Base: {epfBase.toLocaleString()})</span>
                    </span>
                    <span className="font-mono font-semibold text-rose-600 whitespace-nowrap">
                      {calc.employee.epfEligible ? `-LKR ${Math.round(calc.employeeEpf).toLocaleString(undefined, {minimumFractionDigits: 2})}` : "Exempt"}
                    </span>
                  </div>

                  {calc.apitMonthly > 0 && (
                    <div className="flex justify-between border-b border-dotted border-zinc-200 pb-1">
                      <span className="text-zinc-500">APIT Tax</span>
                      <span className="font-mono font-semibold text-rose-600">-LKR {Math.round(calc.apitMonthly).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  )}
                </div>

                {calc.payslipNote && (
                  <div className="p-2 rounded bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-600 mb-3 italic">
                    <span className="font-bold not-italic text-zinc-800">Remark: </span>{calc.payslipNote}
                  </div>
                )}

                <div className="flex justify-between items-baseline border-t-2 border-dashed border-zinc-300 pt-2.5 mb-3 mt-2.5">
                  <span className="font-extrabold text-sm">NET SALARY</span>
                  <span className="font-extrabold text-xl text-[#0c6c8f]">LKR {Math.round(calc.netSalary).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                
                <div className="flex justify-between items-end border-t border-dashed border-zinc-200 pt-2 mt-2.5">
                  <div>
                    <div className="h-6 flex items-end">
                      <div className="w-32 border-b border-zinc-300" />
                    </div>
                    <p className="text-[10px] font-semibold text-zinc-500 mt-1">Authorized Signature</p>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <div className="h-6 flex items-end">
                      <div className="w-32 border-b border-zinc-300" />
                    </div>
                    <p className="text-[10px] font-semibold text-zinc-500 mt-1">Employee Signature</p>
                  </div>
                </div>

                <div className="text-center pt-2.5 mt-2.5 border-t border-dotted border-zinc-200">
                  <p className="text-[9px] tracking-wider uppercase text-zinc-400 font-medium">
                    Powered by <span className="font-bold text-zinc-600">CODEKNOX (PVT) LTD</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-5 pt-0 print:hidden">
                <button onClick={() => window.print()} className="flex-1 py-2.5 text-xs font-bold bg-zinc-900 text-white rounded-xl shadow flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition">
                  <Icons.Printer className="w-4 h-4" />
                  <span>Print Payslip</span>
                </button>
                <button onClick={() => setSelectedPaySlip(null)} className="flex-1 py-2.5 text-xs font-bold border border-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-50 transition">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════ SLIDE DRAWER: MANUAL PAYSLIP ADJUSTMENT ═══════════════ */}
      {(() => {
        const emp = adjustingPayslipEmpId ? activeEmployees.find(e => e.id === adjustingPayslipEmpId) : null;
        const calc = emp ? payrollCalcs.find(c => c.employee.id === emp.id) : null;
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : "";
        const empRole = emp?.role || "Staff Member";
        const empInitials = emp ? `${emp.firstName[0]}${emp.lastName[0]}` : "";

        // Live calculation of adjusted net salary preview
        const previewBonus = manualBonusInput || 0;
        const previewDeduction = manualDeductionInput || 0;
        const previewExceed = manualExceedIncomeInput || 0;
        const originalNet = calc ? calc.netSalary : 0;
        const currentNetWithAdjustment = calc
          ? Math.max(0, originalNet + previewBonus + previewExceed - previewDeduction)
          : 0;

        return (
          <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${adjustingPayslipEmpId ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setAdjustingPayslipEmpId(null)} />
            <div className={`absolute right-0 top-0 h-full w-full max-w-md shadow-2xl transition-transform duration-300 flex flex-col ${adjustingPayslipEmpId ? "translate-x-0" : "translate-x-full"} ${isDark ? "bg-slate-900 border-l border-slate-800" : "bg-white border-l border-slate-200"}`}>
              
              {/* Drawer Header */}
              <div className={`px-6 py-5 border-b flex items-center justify-between ${isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50/50"}`}>
                <div>
                  <h3 className={`font-extrabold text-base tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    Adjust Payslip &amp; Compensation
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Manual additions, deductions &amp; bonuses for {selectedMonth}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingPayslipEmpId(null)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-smooth ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-400 hover:text-white" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 shadow-sm"
                  }`}
                  aria-label="Close drawer"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                {/* Staff Context Card */}
                {emp && (
                  <div className={`p-4 rounded-2xl border transition-smooth ${
                    isDark ? "bg-slate-800/40 border-slate-700/60" : "bg-slate-50/80 border-slate-200/80"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0F85B0]/25 via-sky-500/20 to-[#0ea5e9]/25 text-[#0F85B0] dark:text-[#38bdf8] font-extrabold text-sm flex items-center justify-center border border-[#0F85B0]/30 shadow-xs shrink-0">
                        {empInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-extrabold text-sm leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>{empName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                            isDark ? "bg-[#042633]/60 border border-[#09526e]/50 text-[#7dd3fc]" : "bg-[#f0f9ff] border border-[#bae6fd] text-[#0c6c8f]"
                          }`}>
                            {empRole}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                            isDark ? "bg-zinc-800/80 border-zinc-700 text-zinc-300" : "bg-white border-zinc-200 text-zinc-600"
                          }`}>
                            {emp.payType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick financial context strip */}
                    <div className="mt-3 pt-3 border-t border-dashed flex items-center justify-between text-xs border-slate-200 dark:border-slate-700/60">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Base Earnings</span>
                        <span className="font-mono font-bold text-xs">LKR {(calc?.basicEarnings ?? 0).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Current Net (Pre-Adjustment)</span>
                        <span className={`font-mono font-bold text-xs text-[#0F85B0] dark:text-[#38bdf8]`}>
                          LKR {Math.round(originalNet).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <form
                  id="payroll-adjustment-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!emp) return;
                    const adjKey = `${selectedMonth}_${emp.id}`;
                    updatePayslipAdjustment(adjKey, {
                      bonusAmount: manualBonusInput,
                      deductionAmount: manualDeductionInput,
                      note: payslipNoteInput.trim(),
                    });
                    updateMonthlyExcessIncome(selectedMonth, manualExceedIncomeInput, emp.id);
                    setAdjustingPayslipEmpId(null);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Bonus / Addition (LKR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        className={`${inputCls(isDark)} font-mono font-bold rounded-xl text-sm text-emerald-500`}
                        value={manualBonusInput}
                        onChange={e => setManualBonusInput(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Deduction (LKR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        className={`${inputCls(isDark)} font-mono font-bold rounded-xl text-sm text-rose-500`}
                        value={manualDeductionInput}
                        onChange={e => setManualDeductionInput(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      Exceed Income Bonus (LKR)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      className={`${inputCls(isDark)} font-mono font-bold rounded-xl text-sm text-sky-500`}
                      value={manualExceedIncomeInput}
                      onChange={e => setManualExceedIncomeInput(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Manual clinic performance target exceed bonus for {selectedMonth}.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Adjustment Reason / Remark Note
                      </label>
                      <span className="text-[10px] text-zinc-400">Prints on payslip</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="e.g. Performance Incentive + Emergency Advance deduction approved by management"
                      className={`${inputCls(isDark)} rounded-xl text-xs resize-none`}
                      value={payslipNoteInput}
                      onChange={e => setPayslipNoteInput(e.target.value)}
                    />
                    {/* Quick preset chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      {[
                        "Performance Incentive",
                        "Cash Advance Deduction",
                        "Overtime Correction",
                        "Target Bonus",
                        "Special Medical Allowance",
                      ].map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setPayslipNoteInput(p => p ? `${p}, ${chip}` : chip)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                            isDark
                              ? "bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-700"
                              : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
                          }`}
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real-time Net Salary Impact Card */}
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? "bg-[#042633]/40 border-[#09526e]/60" : "bg-[#f0f9ff] border-[#bae6fd]"
                  }`}>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Adjusted Net Salary Preview
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Reflects immediate effect on payslip
                      </span>
                    </div>
                    <span className={`text-sm font-extrabold font-mono text-[#0F85B0] dark:text-[#38bdf8]`}>
                      LKR {Math.round(currentNetWithAdjustment).toLocaleString()}
                    </span>
                  </div>
                </form>
              </div>

              {/* Drawer Footer Actions */}
              <div className={`p-5 border-t flex items-center gap-3 ${isDark ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/60"}`}>
                <button
                  type="button"
                  onClick={() => setAdjustingPayslipEmpId(null)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-smooth ${
                    isDark ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="payroll-adjustment-form"
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0F85B0] to-[#0ea5e9] hover:opacity-95 text-white shadow-lg shadow-sky-500/25 transition-smooth flex items-center justify-center gap-1.5"
                >
                  <Icons.Check className="w-4 h-4" />
                  <span>Save Adjustment</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════ MODAL: ADMIN PIN AUTHENTICATION ═══════════════ */}
      {showAdminPinModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${isDark ? "bg-zinc-950/80" : "bg-slate-900/50"}`}>
          <div className={`w-full max-w-sm rounded-xl shadow-2xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Icons.LockClosed className="w-4 h-4 text-[#38bdf8]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Admin Authentication Required</h3>
              </div>
              <button onClick={() => setShowAdminPinModal(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (verifyAdminPin(adminPinInput)) {
                  setShowAdminPinModal(false);
                  if (targetProtectedTab) {
                    setActiveTab(targetProtectedTab);
                    setTargetProtectedTab(null);
                  }
                } else {
                  setPinError("Invalid Admin PIN. Try default: 1234");
                }
              }}
              className="p-6 space-y-4 text-xs"
            >
              <p className="text-zinc-400 leading-relaxed">
                Enter your <span className="font-bold text-white">Admin Security PIN</span> to unlock access to sensitive Payroll Engine &amp; System Configuration.
              </p>
              <div>
                <label className={labelCls}>Admin Security PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  autoFocus
                  placeholder="••••"
                  className={`${inputCls(isDark)} font-mono text-center tracking-[0.5em] text-base py-2.5`}
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setPinError("");
                  }}
                />
              </div>

              {pinError && (
                <p className="text-rose-500 font-bold text-center text-[11px] animate-bounce">{pinError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPinModal(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded border ${isDark ? "border-zinc-700 text-zinc-400" : "border-zinc-200 text-zinc-600"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-[#0F85B0] to-[#0ea5e9] hover:from-[#0ea5e9] hover:to-[#0F85B0] text-white text-xs font-bold rounded shadow transition"
                >
                  Unlock Access
                </button>
              </div>

              <p className="text-[10px] text-zinc-500 text-center pt-2">Default Admin PIN: <code className="text-zinc-400">1234</code></p>
            </form>
          </div>
        </div>
      )}
      {/* ═══════════════ MODAL: AUDIT EVENT INSPECTION ═══════════════ */}
      {(() => {
        if (!selectedAuditLogId) return null;
        const log = auditLogs.find(l => l.id === selectedAuditLogId);
        if (!log) return null;

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-200 animate-in fade-in ${isDark ? "bg-zinc-950/80" : "bg-slate-900/50"}`}>
            <div className="absolute inset-0" onClick={() => setSelectedAuditLogId(null)} />
            <div className={`relative z-10 w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all duration-200 animate-in zoom-in-95 ease-out ${isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"}`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isDark ? "bg-sky-500/10 border-sky-500/20 text-[#38bdf8]" : "bg-sky-50 border-sky-200 text-[#0F85B0]"
                  }`}>
                    <Icons.Clipboard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>Audit Event Detail</h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>{log.id}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Recorded on <span className="font-mono text-zinc-400">{log.timestamp}</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAuditLogId(null)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                    isDark ? "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white" : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 shadow-sm"
                  }`}
                  aria-label="Close inspection modal"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Action Type</span>
                    <span className="font-bold text-sm text-[#0F85B0] dark:text-[#38bdf8] block mt-0.5">{log.action}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Target Module</span>
                    <span className={`font-bold text-sm block mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>{log.entity}</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-xl border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"} space-y-2`}>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Entity ID</span>
                    <span className="font-mono text-[#0F85B0] dark:text-[#38bdf8] font-bold">{log.entityId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Triggered By / Actor</span>
                    <span className="font-semibold">{log.actor || "Clinic Administrator"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Client IP Address</span>
                    <span className="font-mono text-zinc-400">{log.ipAddress || "127.0.0.1"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Action Event Description</span>
                  <div className={`p-3 rounded-xl border font-medium ${isDark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-zinc-100 border-zinc-200 text-zinc-800"}`}>
                    {log.details}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Raw Event Payload</span>
                  <pre className={`p-3 rounded-xl border font-mono text-[11px] overflow-x-auto ${isDark ? "bg-zinc-950 border-zinc-800 text-emerald-400" : "bg-zinc-900 text-emerald-300 border-zinc-800"}`}>
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedAuditLogId(null)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-[#0F85B0] text-white hover:bg-[#0c6c8f]"}`}
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════ MODAL: PAYROLL PERIOD DETAIL ═══════════════ */}
      {(() => {
        if (!selectedHistoryPeriodId) return null;
        const period = payrollHistory.find(p => p.id === selectedHistoryPeriodId);
        if (!period) return null;

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-200 animate-in fade-in ${isDark ? "bg-zinc-950/80" : "bg-slate-900/50"}`}>
            <div className="absolute inset-0" onClick={() => setSelectedHistoryPeriodId(null)} />
            <div className={`relative z-10 w-full max-w-3xl rounded-2xl shadow-2xl border overflow-hidden transition-all duration-200 animate-in zoom-in-95 ease-out ${isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"}`}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#0F85B0]/10 text-[#0F85B0] dark:text-[#38bdf8] border border-[#0F85B0]/20">
                    <Icons.Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>{period.label} Payroll Summary</h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusColor(period.status, isDark)}`}>{period.status}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Finalized on <span className="font-mono">{period.finalizedAt}</span> · {period.employeeCount || activeEmployees.length} Staff Members</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryPeriodId(null)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition ${
                    isDark ? "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white" : "border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 shadow-sm"
                  }`}
                  aria-label="Close summary"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Metrics summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-xl border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Gross Pool</span>
                    <span className={`text-lg font-extrabold block mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>LKR {period.grossSalaryPool.toLocaleString()}</span>
                  </div>
                  <div className={`p-3.5 rounded-xl border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Net Remittance</span>
                    <span className="text-lg font-extrabold text-[#0F85B0] dark:text-[#38bdf8] block mt-0.5">LKR {period.netRemittances.toLocaleString()}</span>
                  </div>
                  <div className={`p-3.5 rounded-xl border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">EPF (8%+12%)</span>
                    <span className={`text-lg font-extrabold block mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>LKR {period.totalEpf.toLocaleString()}</span>
                  </div>
                  <div className={`p-3.5 rounded-xl border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">ETF (3%)</span>
                    <span className="text-lg font-extrabold text-emerald-500 block mt-0.5">LKR {period.totalEtf.toLocaleString()}</span>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Staff Salary Breakdown</h4>
                  <div className={`rounded-xl border overflow-hidden ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className={`text-[10px] uppercase tracking-wider text-zinc-400 border-b ${isDark ? "bg-zinc-950/60 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`}>
                            <th className="text-left py-2.5 px-3">Staff Name</th>
                            <th className="text-left py-2.5 px-3">Role</th>
                            <th className="text-right py-2.5 px-3">Base Pay</th>
                            <th className="text-right py-2.5 px-3">Allowances</th>
                            <th className="text-right py-2.5 px-3">EPF (8%)</th>
                            <th className="text-right py-2.5 px-3">Net Salary</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? "divide-zinc-800/60" : "divide-zinc-100"}`}>
                          {activeEmployees.map(emp => {
                            const base = emp.basicSalary || (emp.sessionRate * 15) || 50000;
                            const allw = emp.allowanceIds.length * 8000;
                            const epf = emp.epfEligible ? Math.round(base * 0.08) : 0;
                            const net = base + allw - epf;
                            return (
                              <tr key={emp.id} className={isDark ? "hover:bg-zinc-800/30" : "hover:bg-zinc-50"}>
                                <td className="py-2.5 px-3 font-semibold">{emp.firstName} {emp.lastName}</td>
                                <td className="py-2.5 px-3 text-zinc-400">{emp.role}</td>
                                <td className="py-2.5 px-3 text-right font-mono">LKR {base.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-500">+LKR {allw.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-zinc-400">{epf ? `-LKR ${epf.toLocaleString()}` : "Exempt"}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0F85B0] dark:text-[#38bdf8]">LKR {net.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex gap-2">
                  <button onClick={downloadPayrollCSV} className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>Export Period CSV</span>
                  </button>
                  <button onClick={downloadEpfFormC} className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>EPF Form C3</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryPeriodId(null)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-[#0F85B0] text-white hover:bg-[#0c6c8f]"}`}
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
