
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  useApp, Employee, AttendanceLog, Allowance, LeaveRequest, Shift, PublicHoliday, BiometricSettings
} from "./context/AppContext";

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
  { id: "biometric", label: "Biometric" },
  { id: "company", label: "Clinic Profile" },
  { id: "security", label: "Security & PIN" },
  { id: "epf", label: "EPF / ETF" },
  { id: "allowances", label: "Allowances" },
  { id: "staff", label: "Staff" },
  { id: "shifts", label: "Shifts" },
  { id: "apit", label: "APIT Tax" },
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
    Finalized:  ["text-indigo-600 bg-indigo-50 border-indigo-200",      "text-indigo-400 bg-indigo-950/40 border-indigo-900"],
    Draft:      ["text-zinc-600 bg-zinc-50 border-zinc-200",            "text-zinc-400 bg-zinc-900 border-zinc-800"],
  };
  const pair = map[status] ?? ["text-zinc-600 bg-zinc-50 border-zinc-200", "text-zinc-400 bg-zinc-900 border-zinc-800"];
  return pair[dark ? 1 : 0];
};

const inputCls = (dark: boolean) => `w-full border rounded-md px-3 py-2 text-xs focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 ${dark ? "bg-zinc-950 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-800"}`;
const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5";
const cardCls = (dark: boolean) => `rounded-lg border p-4 ${dark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`;

const daySuffix = (d: number) => d===1||d===21||d===31?"st":d===2||d===22?"nd":d===3||d===23?"rd":"th";

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
  Search: ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
};

// ─── Salary Trend Chart (needs own state for hover tooltips) ────────────────

type PayrollPeriodSummary = { id: string; label: string; grossSalaryPool: number; netRemittances: number; };

function ClinicActivityChart({ logs, isDark }: { logs: AttendanceLog[]; isDark: boolean }) {
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

      result.push({ date: dateStr, day: dayName, present: presentCount, hours: Math.min(12, hours) });
    }
    return result;
  }, [logs]);

  const totalWeeklyHours = daysData.reduce((acc, d) => acc + d.hours, 0);

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">7-Day Clinic Attendance &amp; Shift Activity</h3>
          <p className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>Live worked hours calculated from biometric scans</p>
        </div>
        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
          {totalWeeklyHours.toFixed(1)} hrs Logged
        </span>
      </div>

      <div className={`grid grid-cols-7 gap-3 items-end h-36 pt-2 pb-6 px-3 border-b ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
        {daysData.map((d, idx) => {
          const heightPct = d.hours > 0 ? Math.max(18, (d.hours / 10) * 100) : 6;
          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 group">
              <span className={`text-[10px] font-mono font-bold ${d.hours > 0 ? "text-indigo-400" : "text-slate-400"}`}>
                {d.hours > 0 ? `${d.hours}h` : "0h"}
              </span>
              <div className={`w-full max-w-[32px] rounded-t-xl overflow-hidden h-24 flex items-end p-0.5 border ${isDark ? "bg-slate-800/50 border-slate-700/40" : "bg-slate-100 border-slate-200"}`}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    d.hours > 0
                      ? "bg-gradient-to-t from-indigo-600 via-purple-600 to-emerald-400 shadow-md glow-indigo"
                      : isDark ? "bg-slate-800/20" : "bg-slate-200/50"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className={`text-[11px] font-extrabold ${isDark ? "text-slate-300" : "text-slate-700"}`}>{d.day}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>Real-time Neon Postgres Database Activity</span>
        <span className="font-mono text-indigo-400">Shift Target: 08:30 AM → 05:00 PM</span>
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
    employees, attendanceLogs, allowances, employeeAllowances, shifts, leaveRequests,
    payrollHistory, auditLogs, publicHolidays, apitSlabs,
    biometricSettings, epfSettings, payrollCycleStartDay, adminPin, companyProfile, manualAdjustments,
    addEmployee, updateEmployee, deleteEmployee,
    updateAttendanceLog, deleteAttendanceLog,
    addAllowance, deleteAllowance,
    addShift, updateShift, deleteShift,
    addLeaveRequest, approveLeave, rejectLeave,
    finalizePayroll,
    addHoliday, deleteHoliday, toggleHolidayDoubleOT,
    updateBiometricSettings, updateEpfSettings, updatePayrollCycleStartDay,
    triggerSync, simulateHikvisionScan,
    isAdminAuthenticated, verifyAdminPin, updateAdminPin, logoutAdmin,
    updateCompanyProfile, updatePayslipAdjustment,
    machinePersons, fetchMachinePersons, isFetchingPersons,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isDark, setIsDark] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { const h = requestAnimationFrame(() => setHasMounted(true)); return () => cancelAnimationFrame(h); }, []);

  // ── Authentication Portal state ──
  const [loginType, setLoginType] = useState<"admin" | "staff">("admin");
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [loginBiometricId, setLoginBiometricId] = useState("2");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ── Admin Security state ──
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [targetProtectedTab, setTargetProtectedTab] = useState<TabId | null>(null);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  // ── Filters ──
  const [selectedMonth, setSelectedMonth] = useState("2026-08");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("All");
  const [selectedCalMonth, setSelectedCalMonth] = useState("2026-08");
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
    biometricId:"", epfEligible:true, taxable:false, shiftId:null, branchId:null,
    allowanceIds:[], leaveBalances:{annual:14,sick:7,casual:3},
  });

  const [drawerLogId, setDrawerLogId] = useState<string|null>(null);
  const [punchEdit, setPunchEdit] = useState({ checkIn:"", checkOut:"", status:"On-Time" as AttendanceLog["status"], overtimeHours:0, noPayHours:0 });

  const [selectedPaySlip, setSelectedPaySlip] = useState<string|null>(null);

  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState<Omit<LeaveRequest,"id"|"appliedAt">>({ employeeId:"EMP-001", type:"Annual", startDate:"", endDate:"", status:"Pending", note:"" });

  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [newShift, setNewShift] = useState<Omit<Shift,"id">>({ name:"", startTime:"08:00", endTime:"17:00", workDays:[1,2,3,4,5], otThresholdHours:9, otMultiplier:1.5 });



  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState<Omit<PublicHoliday,"id">>({ date:"", name:"", isDoubleOT:false });

  const [selfServicePin, setSelfServicePin] = useState("");
  const [selfServiceEmp, setSelfServiceEmp] = useState<Employee|null>(null);
  const [selfServiceError, setSelfServiceError] = useState("");

  const [newAllowance, setNewAllowance] = useState<Omit<Allowance,"id">>({ name:"", amount:10000, epfApplicable:false, taxDeductible:true, type:"Fixed" });

  // ── Manual Payslip Adjustment Modal state ──
  const [adjustingPayslipEmpId, setAdjustingPayslipEmpId] = useState<string | null>(null);
  const [manualBonusInput, setManualBonusInput] = useState<number>(0);
  const [manualDeductionInput, setManualDeductionInput] = useState<number>(0);
  const [payslipNoteInput, setPayslipNoteInput] = useState<string>("");

  // ── Admin PIN Security & Company Settings state ──
  const [newPinInput, setNewPinInput] = useState("");
  const [pinChangeMsg, setPinChangeMsg] = useState("");

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
    const today = hasMounted ? new Date().toISOString().split("T")[0] : "2026-07-10";
    const todayLogs = attendanceLogs.filter(l => l.date === today);
    const present = todayLogs.filter(l => ["On-Time","Late","Half-Day"].includes(l.status)).length;
    return { totalStaff: activeEmployees.length, present, late: todayLogs.filter(l=>l.status==="Late").length, onLeave: todayLogs.filter(l=>l.status==="On-Leave").length, absent: todayLogs.filter(l=>l.status==="Absent").length, presentPercent: activeEmployees.length>0 ? Math.round((present/activeEmployees.length)*100):0, todayLogs };
  }, [activeEmployees, attendanceLogs, hasMounted]);

  const filteredLogs = useMemo(() => attendanceLogs
    .filter(l => {
      if (l.date < dateRange.startDate || l.date > dateRange.endDate) return false;
      const emp = employees.find(e => e.id === l.employeeId || e.biometricId === l.employeeId || (l.employee && e.biometricId === String(l.employee.biometricId)));
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : (l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : `Staff #${l.employeeId}`);
      return empName.toLowerCase().includes(attendanceSearch.toLowerCase()) &&
        (attendanceStatusFilter === "All" || l.status === attendanceStatusFilter);
    }).sort((a,b) => b.date.localeCompare(a.date)), [attendanceLogs, employees, attendanceSearch, attendanceStatusFilter, dateRange]);

  const statusCounts = useMemo(() => {
    const c: Record<string,number> = {All:0,"On-Time":0,Late:0,"Half-Day":0,"On-Leave":0,Absent:0};
    attendanceLogs.forEach(l => { if (l.date>=dateRange.startDate && l.date<=dateRange.endDate) { c.All++; if(c[l.status]!==undefined) c[l.status]++; } });
    return c;
  }, [attendanceLogs, dateRange]);

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
      const absentCount = empLogs.filter(l => l.status==="Absent").length;
      const totalOtHours = empLogs.reduce((s,l) => s+l.overtimeHours, 0);

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
      const noPayDeduction = emp.payType==="Fixed Monthly" ? (emp.basicSalary / epfSettings.workingDaysPerMonth) * absentCount : 0;

      if (emp.payType==="Fixed Monthly") {
        basicEarnings = emp.basicSalary;
        const shift = shifts.find(s => s.id===emp.shiftId);
        const otRate = emp.hourlyRate || (emp.basicSalary / (epfSettings.workingDaysPerMonth * 9));
        otPay = totalOtHours * otRate * (shift?.otMultiplier ?? 1.5);
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

      const employeeEpf = emp.epfEligible ? epfBase * (epfSettings.employeeRate/100) : 0;
      const employerEpf = emp.epfEligible ? epfBase * (epfSettings.employerRate/100) : 0;
      const employerEtf = emp.epfEligible ? epfBase * (epfSettings.etfRate/100) : 0;
      const grossEarnings = basicEarnings + otPay + totalAllowancesVal + manualBonus;
      const preNetSalary = grossEarnings - employeeEpf - noPayDeduction - manualDeduction;
      const apitMonthly = emp.taxable ? calcApit(Math.max(0, preNetSalary * 12)) : 0;
      const netSalary = Math.max(0, preNetSalary - apitMonthly);

      return { employee:emp, sessionCount, absentCount, totalOtHours, basicEarnings, otPay, sessionPay, totalAllowances:totalAllowancesVal, noPayDeduction, manualBonus, manualDeduction, payslipNote: adj.note, employeeEpf, employerEpf, employerEtf, grossEarnings, apitMonthly, netSalary };
    });
  }, [activeEmployees, attendanceLogs, allowances, employeeAllowances, epfSettings, dateRange, shifts, calcApit, manualAdjustments, selectedMonth]);

  const payrollTotals = useMemo(() => payrollCalcs.reduce((t,c) => ({ gross:t.gross+c.grossEarnings, net:t.net+c.netSalary, epfEmp:t.epfEmp+c.employeeEpf, epfEmr:t.epfEmr+c.employerEpf, etf:t.etf+c.employerEtf, apit:t.apit+c.apitMonthly }), {gross:0,net:0,epfEmp:0,epfEmr:0,etf:0,apit:0}), [payrollCalcs]);

  const isCurrentMonthFinalized = useMemo(() => payrollHistory.some(p => p.month===selectedMonth && p.status==="Finalized"), [payrollHistory, selectedMonth]);

  // ── Handlers ──

  const openEditEmp = (emp: Employee) => { setEditingEmpId(emp.id); setNewEmp({ firstName:emp.firstName, lastName:emp.lastName, role:emp.role, payType:emp.payType, basicSalary:emp.basicSalary, hourlyRate:emp.hourlyRate, sessionRate:emp.sessionRate, commissionRate:emp.commissionRate, biometricId:emp.biometricId, epfEligible:emp.epfEligible, taxable:emp.taxable, shiftId:emp.shiftId, branchId:emp.branchId, allowanceIds:emp.allowanceIds, leaveBalances:emp.leaveBalances }); setShowAddEmpModal(true); };

  const handleAddEmployee = (e: React.FormEvent) => { e.preventDefault(); if(editingEmpId){updateEmployee(editingEmpId,newEmp);setEditingEmpId(null);}else{addEmployee(newEmp);} setShowAddEmpModal(false); setNewEmp({firstName:"",lastName:"",role:"Nurse",payType:"Fixed Monthly",basicSalary:50000,hourlyRate:300,sessionRate:0,commissionRate:0,biometricId:"",epfEligible:true,taxable:false,shiftId:null,branchId:null,allowanceIds:[],leaveBalances:{annual:14,sick:7,casual:3}}); };

  const openDrawer = (log: AttendanceLog) => { setPunchEdit({checkIn:log.checkIn,checkOut:log.checkOut||"",status:log.status,overtimeHours:log.overtimeHours,noPayHours:log.noPayHours}); setDrawerLogId(log.id); };

  const handleFinalizePayroll = () => {
    if (isCurrentMonthFinalized) return;
    const [y,m] = selectedMonth.split("-");
    const monthLabel = new Date(parseInt(y), parseInt(m)-1, 1).toLocaleString("default",{month:"long",year:"numeric"});
    finalizePayroll({ month:selectedMonth, label:monthLabel, grossSalaryPool:payrollTotals.gross, netRemittances:payrollTotals.net, totalEpf:payrollTotals.epfEmp+payrollTotals.epfEmr, totalEtf:payrollTotals.etf, totalApit:payrollTotals.apit, employeeCount:activeEmployees.length });
  };


  const downloadAttendanceCSV = () => {
    const rows = [["Date","Employee","Status","Check In","Check Out","OT Hours","No-Pay Hours"]];
    filteredLogs.forEach(l => { const emp=employees.find(e=>e.id===l.employeeId); rows.push([l.date,emp?`${emp.firstName} ${emp.lastName}`:"Unknown",l.status,l.checkIn,l.checkOut||"--",String(l.overtimeHours),String(l.noPayHours)]); });
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


  const handleSelfServicePin = () => { setSelfServiceError(""); const emp=activeEmployees.find(e=>e.biometricId===selfServicePin); if(emp){setSelfServiceEmp(emp);}else{setSelfServiceError("Biometric ID not found. Please try again.");} };

  // ── Shared UI pieces ──
  const monthSelector = (value: string, onChange: (v:string)=>void) => (
    <select value={value} onChange={e=>onChange(e.target.value)} className={`border rounded-md px-3 py-1.5 text-xs font-semibold focus:outline-none ${isDark?"bg-zinc-900 border-zinc-800 text-white":"bg-white border-zinc-200 text-zinc-800"}`}>
      {["2026-08","2026-07","2026-06","2026-05","2026-04","2026-03","2026-02","2026-01"].map(m => {
        const [y,mo]=m.split("-"); const label=new Date(parseInt(y),parseInt(mo)-1,1).toLocaleString("default",{month:"long",year:"numeric"});
        return <option key={m} value={m}>{label}</option>;
      })}
    </select>
  );

  if (!hasMounted) return <div className="flex flex-1 min-h-screen items-center justify-center bg-zinc-950 text-zinc-500 text-xs font-bold">Initializing MedicFlow…</div>;

  // ─── LOGIN PORTAL (UNAUTHENTICATED) ───────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative transition-all ${isDark ? "bg-[#080c14] text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        {/* Theme Toggle Button Top Right */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-2 transition ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 shadow-sm hover:bg-slate-100"
            }`}
          >
            {isDark ? <Icons.Sun className="w-3.5 h-3.5 text-amber-400" /> : <Icons.Moon className="w-3.5 h-3.5 text-indigo-500" />}
            <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Brand Logo Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto h-14 w-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl glow-indigo">
              MF
            </div>
            <h1 className={`text-2xl font-extrabold tracking-tight bg-gradient-to-r ${isDark ? "from-white via-indigo-200 to-emerald-400" : "from-slate-900 via-indigo-900 to-purple-700"} bg-clip-text text-transparent`}>
              MedicFlow Dental OS
            </h1>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Cloud Biometric Attendance &amp; Payroll Management</p>
          </div>

          {/* Login Card */}
          <div className={`p-6 sm:p-8 rounded-2xl border shadow-2xl backdrop-blur-xl ${isDark ? "bg-slate-900/90 border-slate-800/80" : "bg-white border-slate-200"}`}>
            {/* Tabs: Admin vs Staff */}
            <div className={`flex p-1 rounded-xl border mb-6 ${isDark ? "bg-slate-950/40 border-slate-800/50" : "bg-slate-100 border-slate-200"}`}>
              <button
                type="button"
                onClick={() => { setLoginType("admin"); setLoginError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === "admin" ? "bg-indigo-600 text-white shadow-lg glow-indigo" : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"}`}
              >
                Clinic Admin
              </button>
              <button
                type="button"
                onClick={() => { setLoginType("staff"); setLoginError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === "staff" ? "bg-indigo-600 text-white shadow-lg glow-indigo" : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"}`}
              >
                Staff Portal
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsLoggingIn(true);
                setLoginError("");
                const res = await loginUser({
                  loginType,
                  username: loginUsername,
                  password: loginPassword,
                  biometricId: loginBiometricId,
                });
                setIsLoggingIn(false);
                if (!res.success) {
                  setLoginError(res.error || "Invalid login credentials");
                }
              }}
              className="space-y-4"
            >
              {loginType === "admin" ? (
                <>
                  <div>
                    <label className={labelCls}>Administrator Username</label>
                    <input
                      type="text"
                      className={inputCls(isDark)}
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      placeholder="admin"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Password</label>
                    <input
                      type="password"
                      className={inputCls(isDark)}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Staff Biometric ID / Staff No.</label>
                    <input
                      type="text"
                      className={inputCls(isDark)}
                      value={loginBiometricId}
                      onChange={e => setLoginBiometricId(e.target.value)}
                      placeholder="e.g. 2 or 1"
                      required
                    />
                    <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-600"} mt-1`}>Enter your assigned biometric ID (e.g. 2 for Ruwantha Alwis or 1 for Lakmina Ekanayake)</p>
                  </div>
                </>
              )}

              {loginError && (
                <div className="p-3 rounded-lg text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all glow-indigo"
              >
                {isLoggingIn ? "Signing In..." : `Sign In to ${loginType === "admin" ? "Clinic Admin" : "Staff Portal"}`}
              </button>
            </form>

            {/* Quick Demo Access */}
            <div className={`mt-6 pt-5 border-t text-center space-y-2 ${isDark ? "border-slate-800/60" : "border-slate-200"}`}>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? "text-slate-500" : "text-slate-600"}`}>Quick Demo Sign-In</span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => loginUser({ loginType: "admin", username: "admin", password: "admin123" })}
                  className={`py-1.5 px-2 rounded border text-[10px] font-bold transition flex items-center justify-center gap-1.5 ${
                    isDark
                      ? "bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-indigo-300"
                      : "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
                  }`}
                >
                  <Icons.Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Admin Sign-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => loginUser({ loginType: "staff", biometricId: "2" })}
                  className={`py-1.5 px-2 rounded border text-[10px] font-bold transition flex items-center justify-center gap-1.5 ${
                    isDark
                      ? "bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-emerald-300"
                      : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                  }`}
                >
                  <Icons.User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Staff Sign-In (#2)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN APPLICATION RENDER ──────────────────────────────────────────────────
  return (
    <div className={`flex flex-1 min-h-screen ${isDark ? "dark bg-[#090d16] text-slate-100" : "bg-slate-50 text-slate-800"}`} style={isDark ? { colorScheme: "dark" } : {}}>
      {/* ── Sidebar ── */}
      <aside className={`w-52 border-r flex flex-col justify-between shrink-0 transition-all ${isDark ? "bg-slate-900/80 border-slate-800/80 backdrop-blur-xl" : "bg-white/90 border-slate-200 backdrop-blur-xl shadow-sm"}`}>
        <div className="p-4">
          <div className="flex items-center gap-2.5 mb-7 px-1">
            <div className="h-8 w-8 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-lg glow-indigo">
              MF
            </div>
            <div>
              <h1 className={`font-extrabold text-sm tracking-tight bg-gradient-to-r ${isDark ? "from-white via-slate-200 to-indigo-300" : "from-slate-900 via-indigo-950 to-indigo-600"} bg-clip-text text-transparent`}>MedicFlow</h1>
              <p className={`text-[10px] ${isDark ? "text-indigo-400" : "text-indigo-600"} font-semibold tracking-wider uppercase leading-none mt-0.5`}>Clinic OS</p>
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
                        ? "bg-gradient-to-r from-indigo-950/60 to-slate-900 text-white border-l-2 border-indigo-500 shadow-sm"
                        : "bg-gradient-to-r from-indigo-50 to-white text-indigo-900 border-l-2 border-indigo-600 shadow-sm font-bold"
                      : isDark
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <svg className={`w-4 h-4 shrink-0 transition-smooth ${isActive ? (isDark ? "text-indigo-400" : "text-indigo-600") : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <button onClick={()=>setIsDark(!isDark)} className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold rounded-md transition ${isDark?"text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800":"text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}>
            <span className="flex items-center gap-2">
              {isDark ? <Icons.Sun className="w-3.5 h-3.5 text-amber-400" /> : <Icons.Moon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className={`h-14 border-b flex items-center justify-between px-8 shrink-0 backdrop-blur-xl transition-all ${isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-white/80 border-slate-200 shadow-sm"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              biometricSettings.status === "Connected"
                ? isDark ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-400 glow-emerald" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                : biometricSettings.status === "Syncing"
                ? isDark ? "bg-amber-950/40 border-amber-800/50 text-amber-400 glow-amber" : "bg-amber-50 border-amber-200 text-amber-700"
                : isDark ? "bg-rose-950/40 border-rose-800/50 text-rose-400" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              <span className={`w-2 h-2 rounded-full ${biometricSettings.status === "Connected" ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping"}`}/>
              <span>Hikvision DS-K1T320MFWX (HTTP Real-time Push - Connected)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerSync}
              disabled={biometricSettings.status === "Syncing"}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-smooth flex items-center gap-2 ${
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
              }`}
            >
              <Icons.Refresh className={`w-3.5 h-3.5 ${biometricSettings.status === "Syncing" ? "animate-spin text-amber-400" : "text-indigo-400"}`} />
              <span>{biometricSettings.status === "Syncing" ? "Syncing Logs..." : "Refresh Cloud Logs"}</span>
            </button>

            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border text-xs font-semibold ${isDark ? "bg-slate-900/90 border-slate-800 text-slate-200" : "bg-white border-slate-200 text-slate-800 shadow-sm"}`}>
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 flex items-center justify-center text-white text-[11px] font-black shadow glow-indigo">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs leading-none">{currentUser?.name || "Clinic Administrator"}</span>
                <span className="text-[9px] text-indigo-400 font-semibold uppercase tracking-wider leading-none mt-0.5">{currentUser?.role || "Admin"}</span>
              </div>
              <button
                onClick={logoutUser}
                className="ml-1 px-2 py-1 text-[10px] font-bold rounded border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 max-w-[1500px] w-full mx-auto space-y-6 flex-1">

          {/* ═══════════════ DASHBOARD ═══════════════ */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">

              {/* Stat cards with gradient borders & modern counters */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Staff", value: dashboardMetrics.totalStaff, color: "from-indigo-500 to-indigo-600", badge: "Active", icon: <Icons.Users className="w-4 h-4 text-indigo-400" /> },
                  { label: "Present Today", value: dashboardMetrics.present, color: "from-emerald-500 to-teal-600", badge: "On Time", icon: <Icons.CheckCircle className="w-4 h-4 text-emerald-400" /> },
                  { label: "Late Arrivals", value: dashboardMetrics.late, color: "from-amber-500 to-orange-600", badge: "Grace 15m", icon: <Icons.Clock className="w-4 h-4 text-amber-400" /> },
                  { label: "On Leave", value: dashboardMetrics.onLeave, color: "from-purple-500 to-indigo-600", badge: "Approved", icon: <Icons.Sun className="w-4 h-4 text-purple-400" /> },
                  { label: "Absent", value: dashboardMetrics.absent, color: "from-rose-500 to-red-600", badge: "Action Req", icon: <Icons.AlertTriangle className="w-4 h-4 text-rose-400" /> },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-smooth relative overflow-hidden group ${
                      isDark
                        ? "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
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
              <div className="grid grid-cols-3 gap-4">
                {/* ── Premium Area Chart with hover tooltips ── */}
                <div className={`${cardCls(isDark)} col-span-2`}>
                  {payrollHistory.length >= 2 && (
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">6-Month Salary Trend</h3>
                        <p className={`text-[10px] mt-0.5 ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>Gross vs Net · hover dots for details</p>
                      </div>
                      <div className="flex items-center gap-4 text-[10px]">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block opacity-80"/>Gross</span>
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
                  <div className={`flex flex-wrap gap-3 mt-4 pt-3 border-t text-[9px] ${isDark?"border-zinc-800":"border-zinc-100"}`}>
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
                      ? "bg-indigo-950/40 border-indigo-800/50 text-indigo-300"
                      : "bg-indigo-50 border-indigo-200 text-indigo-700"
                  }`}>
                    {dashboardMetrics.todayLogs.length} {dashboardMetrics.todayLogs.length === 1 ? "Scan" : "Scans"} Recorded Today
                  </span>
                </div>
                <div className="space-y-2.5">
                  {dashboardMetrics.todayLogs.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No punches recorded today yet. Put your finger on the Hikvision terminal to test live!
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
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 flex items-center justify-center text-white font-black text-sm shadow glow-indigo">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>{empName}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${isDark ? "bg-indigo-950/60 border border-indigo-800/50 text-indigo-300" : "bg-indigo-50 border border-indigo-200 text-indigo-700"}`}>
                                {empRole}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Verified via <strong className="text-slate-300">{log.authMethod || "Fingerprint"}</strong></span>
                              <span>•</span>
                              <span>Terminal: <code className="text-indigo-400 font-mono">DS-K1T320MFWX</code></span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                              In: {log.checkIn}
                            </span>
                            <span className="text-slate-600">→</span>
                            <span className={`px-2.5 py-1 rounded-lg border font-bold ${log.checkOut ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
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
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <select
                    value={attendanceSearch}
                    onChange={e => setAttendanceSearch(e.target.value)}
                    className={`${inputCls(isDark)} w-56 font-semibold`}
                  >
                    <option value="">All Staff Members</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={`${emp.firstName} ${emp.lastName}`}>
                        {emp.firstName} {emp.lastName} ({emp.role} #{emp.biometricId})
                      </option>
                    ))}
                  </select>
                  {monthSelector(selectedMonth, setSelectedMonth)}
                </div>
                <button onClick={downloadAttendanceCSV} className={`px-3 py-1.5 text-xs font-bold rounded border flex items-center gap-1.5 ${isDark?"bg-zinc-850 border-zinc-700 text-zinc-300 hover:bg-zinc-800":"bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                  <Icons.Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
              {/* Status filters */}
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(statusCounts).map(([status,count])=>(
                  <button key={status} onClick={()=>setAttendanceStatusFilter(status)} className={`px-3 py-1 text-xs font-bold rounded-full border transition ${attendanceStatusFilter===status?(isDark?"bg-zinc-700 border-zinc-600 text-white":"bg-zinc-800 border-zinc-800 text-white"):(isDark?"border-zinc-800 text-zinc-400 hover:border-zinc-700":"border-zinc-200 text-zinc-500 hover:border-zinc-300")}`}>
                    {status} <span className="ml-0.5 opacity-60">({count})</span>
                  </button>
                ))}
              </div>
              <p className={`text-[10px] font-mono ${isDark?"text-zinc-500":"text-zinc-400"}`}>Period: {dateRange.startDate} → {dateRange.endDate}</p>
              {/* Table */}
              <div className={`rounded-lg border overflow-hidden ${isDark?"border-zinc-800":"border-zinc-200"}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className={`${isDark?"bg-zinc-900 border-zinc-800":"bg-zinc-50 border-zinc-200"} border-b`}>
                      <tr>
                        {["Date","Employee","Status","Check In","Check Out","OT Hrs","No-Pay Hrs",""].map(h=>(
                          <th key={h} className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-zinc-400 ws-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark?"divide-zinc-800/70":"divide-zinc-100"}`}>
                      {filteredLogs.map(log => {
                        const emp = employees.find(e => e.id === log.employeeId || e.biometricId === log.employeeId || (log.employee && e.biometricId === String(log.employee.biometricId)));
                        const empName = emp ? `${emp.firstName} ${emp.lastName}` : (log.employee ? `${log.employee.firstName} ${log.employee.lastName}` : `Staff #${log.employeeId}`);
                        return (
                          <tr key={log.id} className={`hover:${isDark?"bg-zinc-900/50":"bg-zinc-50/80"} transition`}>
                            <td className="px-4 py-3 font-mono text-zinc-400">{log.date}</td>
                            <td className="px-4 py-3 font-semibold">{empName}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ws-nowrap ${statusColor(log.status,isDark)}`}>{log.status}</span></td>
                            <td className="px-4 py-3 font-mono">{log.checkIn}</td>
                            <td className="px-4 py-3 font-mono">{log.checkOut||"–"}</td>
                            <td className="px-4 py-3 text-center">{log.overtimeHours}</td>
                            <td className="px-4 py-3 text-center">{log.noPayHours}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button onClick={()=>openDrawer(log)} className={`px-2 py-1 rounded text-[10px] font-bold border transition ${isDark?"bg-zinc-850 border-zinc-700 text-zinc-300 hover:bg-zinc-800":"bg-white border-zinc-200 text-zinc-700 shadow-sm hover:bg-zinc-50"}`}>Adjust</button>
                                <button onClick={()=>deleteAttendanceLog(log.id)} className="px-2 py-1 rounded text-[10px] font-bold border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition">Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLogs.length===0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-zinc-500">No records found for this period.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ LEAVE MANAGER ═══════════════ */}
          {activeTab==="leave" && (
            <div className="space-y-5">
              {/* Leave summary cards */}
              <div className="flex items-center justify-between">
                <h2 className={`text-sm font-bold ${isDark?"text-white":"text-zinc-900"}`}>Leave Management</h2>
                <button onClick={()=>{setNewLeave({employeeId:"EMP-001",type:"Annual",startDate:"",endDate:"",status:"Pending",note:""});setShowAddLeaveModal(true);}} className={`px-3 py-1.5 text-xs font-bold rounded shadow transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>+ New Leave Request</button>
              </div>

              {/* Leave balances */}
              <div className={cardCls(isDark)}>
                <h3 className={`text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3`}>Leave Balances</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className={`text-[10px] uppercase tracking-wider text-zinc-400 border-b ${isDark?"border-zinc-800":"border-zinc-200"}`}>
                      <th className="text-left pb-2 pr-4">Employee</th>
                      <th className="text-center pb-2 px-4">Annual</th>
                      <th className="text-center pb-2 px-4">Sick</th>
                      <th className="text-center pb-2 px-4">Casual</th>
                    </tr></thead>
                    <tbody className={`divide-y ${isDark?"divide-zinc-800":"divide-zinc-100"}`}>
                      {activeEmployees.map(emp=>(
                        <tr key={emp.id}>
                          <td className="py-2.5 pr-4 font-semibold">{emp.firstName} {emp.lastName}</td>
                          {(["annual","sick","casual"] as const).map(k=>(
                            <td key={k} className="py-2.5 px-4 text-center">
                              <span className={`text-sm font-bold ${emp.leaveBalances[k]===0?"text-rose-500":isDark?"text-white":"text-zinc-900"}`}>{emp.leaveBalances[k]}</span>
                              <span className="text-zinc-500 text-[10px] ml-0.5">days</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Leave Calendar */}
              <div className={cardCls(isDark)}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Attendance Calendar</h3>
                  {monthSelector(selectedCalMonth, setSelectedCalMonth)}
                </div>
                {(() => {
                  const [y,m] = selectedCalMonth.split("-").map(Number);
                  const firstDay = new Date(y,m-1,1).getDay();
                  const daysInMonth = new Date(y,m,0).getDate();
                  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
                  const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                  return (
                    <div>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {dayLabels.map(d=><div key={d} className="text-[10px] font-bold text-center text-zinc-500 py-1">{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((day,idx)=>{
                          if (!day) return <div key={`empty-${idx}`}/>;
                          const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                          const dayLogs = attendanceLogs.filter(l=>l.date===dateStr);
                          const holiday = publicHolidays.find(h=>h.date===dateStr);
                          const presentCount = dayLogs.filter(l=>["On-Time","Late","Half-Day"].includes(l.status)).length;
                          const leaveCount = dayLogs.filter(l=>l.status==="On-Leave").length;
                          const absentCount = dayLogs.filter(l=>l.status==="Absent").length;
                          const lateCount = dayLogs.filter(l=>l.status==="Late").length;
                          return (
                            <div key={`day-${day}`} className={`rounded p-1.5 text-center text-[10px] min-h-[52px] border ${holiday?(isDark?"border-amber-800/50 bg-amber-950/20":"border-amber-200 bg-amber-50"):(isDark?"border-zinc-800 bg-zinc-900/30":"border-zinc-100 bg-white")}`}>
                              <p className={`font-bold mb-1 ${holiday?"text-amber-500":isDark?"text-zinc-400":"text-zinc-600"}`}>{day}</p>
                              {holiday && <p className="text-[8px] text-amber-500 leading-tight mb-0.5 truncate">{holiday.name.split(" ").slice(0,2).join(" ")}</p>}
                              <div className="flex flex-wrap justify-center gap-0.5">
                                {presentCount>0&&<span className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center text-[7px] text-white font-bold">{presentCount}</span>}
                                {lateCount>0&&<span className="w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center text-[7px] text-white font-bold">{lateCount}</span>}
                                {leaveCount>0&&<span className="w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center text-[7px] text-white font-bold">{leaveCount}</span>}
                                {absentCount>0&&<span className="w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center text-[7px] text-white font-bold">{absentCount}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-4 mt-3 text-[10px]">
                        {[["bg-emerald-500","Present"],["bg-amber-500","Late"],["bg-purple-500","Leave"],["bg-rose-500","Absent"],["bg-amber-400 border border-amber-600","Holiday"]].map(([cls,lbl])=>(
                          <span key={lbl} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${cls} inline-block`}/>{lbl}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Leave requests table */}
              <div className={`rounded-lg border overflow-hidden ${isDark?"border-zinc-800":"border-zinc-200"}`}>
                <table className="w-full text-xs">
                  <thead className={`border-b ${isDark?"bg-zinc-900 border-zinc-800":"bg-zinc-50 border-zinc-200"}`}>
                    <tr>{["Employee","Type","Period","Status","Note","Actions"].map(h=><th key={h} className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-zinc-400">{h}</th>)}</tr>
                  </thead>
                  <tbody className={`divide-y ${isDark?"divide-zinc-800":"divide-zinc-100"}`}>
                    {leaveRequests.map(req=>{
                      const emp=employees.find(e=>e.id===req.employeeId);
                      return (
                        <tr key={req.id} className={`hover:${isDark?"bg-zinc-900/40":"bg-zinc-50"} transition`}>
                          <td className="px-4 py-3 font-semibold">{emp?`${emp.firstName} ${emp.lastName}`:"Unknown"}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isDark?"border-zinc-700 text-zinc-300 bg-zinc-800":"border-zinc-200 text-zinc-600 bg-zinc-50"}`}>{req.type}</span></td>
                          <td className="px-4 py-3 font-mono text-zinc-400">{req.startDate}{req.startDate!==req.endDate?` → ${req.endDate}`:""}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor(req.status,isDark)}`}>{req.status}</span></td>
                          <td className="px-4 py-3 text-zinc-500 italic">{req.note||"—"}</td>
                          <td className="px-4 py-3">
                            {req.status==="Pending"&&(
                              <div className="flex gap-1.5">
                                <button onClick={()=>approveLeave(req.id)} className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition flex items-center gap-1">
                                  <Icons.Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button onClick={()=>rejectLeave(req.id)} className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition flex items-center gap-1">
                                  <Icons.X className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {leaveRequests.length===0&&<tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-zinc-500">No leave requests.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══════════════ PAYROLL ENGINE ═══════════════ */}
          {activeTab==="payroll" && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                {[{label:"Gross Salaries Pool",value:`LKR ${payrollTotals.gross.toLocaleString()}`,color:isDark ? "text-zinc-100" : "text-zinc-900"},{label:"Net Remittances",value:`LKR ${payrollTotals.net.toLocaleString()}`,color:isDark ? "text-indigo-400" : "text-indigo-600"},{label:"EPF (8%+12%)",value:`LKR ${(payrollTotals.epfEmp+payrollTotals.epfEmr).toLocaleString()}`,color:isDark ? "text-zinc-100" : "text-zinc-900"},{label:"APIT Total",value:`LKR ${Math.round(payrollTotals.apit).toLocaleString()}`,color:isDark ? "text-amber-400" : "text-amber-600"}].map(s=>(
                  <div key={s.label} className={cardCls(isDark)}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">{s.label}</p>
                    <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {monthSelector(selectedMonth, setSelectedMonth)}
                  <span className={`text-[10px] font-mono ${isDark?"text-zinc-500":"text-zinc-400"}`}>{dateRange.startDate} → {dateRange.endDate}</span>
                  {isCurrentMonthFinalized && <span className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 ${statusColor("Finalized",isDark)}`}><Icons.LockClosed className="w-3 h-3" /><span>Finalized</span></span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={downloadPayrollCSV} className={`px-3 py-1.5 text-xs font-bold rounded border flex items-center gap-1.5 ${isDark?"bg-zinc-850 border-zinc-700 text-zinc-300 hover:bg-zinc-800":"bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                  {!isCurrentMonthFinalized&&<button onClick={handleFinalizePayroll} className="px-3 py-1.5 text-xs font-bold rounded bg-indigo-600 text-white hover:bg-indigo-700 transition shadow flex items-center gap-1.5"><Icons.LockClosed className="w-3.5 h-3.5" /><span>Finalize Month</span></button>}
                  <button onClick={downloadEpfFormC} className={`px-3 py-1.5 text-xs font-bold rounded border flex items-center gap-1.5 ${isDark?"bg-zinc-850 border-zinc-700 text-zinc-300 hover:bg-zinc-800":"bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>EPF Form C3</span>
                  </button>
                </div>
              </div>

              {/* Payroll table */}
              <div className={`rounded-lg border overflow-hidden ${isDark?"border-zinc-800":"border-zinc-200"}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className={`border-b ${isDark?"bg-zinc-900/60 border-zinc-800":"bg-zinc-50 border-zinc-200"}`}>
                      <tr>{["Staff Name","Pay Basis","Base Earning","OT Earn","Allowances","No-Pay Cut","EPF (8%)","APIT","Net Salary",""].map(h=><th key={h} className="px-5 py-3.5 text-left font-bold text-[10px] uppercase tracking-wider text-zinc-400 ws-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className={`divide-y ${isDark?"divide-zinc-800/70":"divide-zinc-100"}`}>
                      {payrollCalcs.map(c=>(
                        <tr key={c.employee.id} className={`hover:${isDark?"bg-zinc-900/30":"bg-zinc-50"} transition ${isCurrentMonthFinalized?"opacity-80":""}`}>
                          <td className="px-5 py-3.5 ws-nowrap">
                            <p className="font-bold">{c.employee.firstName} {c.employee.lastName}</p>
                            <p className="text-[10px] text-zinc-400">{c.employee.role}</p>
                          </td>
                          <td className="px-5 py-3.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ws-nowrap ${isDark?"bg-zinc-900 border-zinc-700 text-zinc-400":"bg-zinc-50 border-zinc-200 text-zinc-600"}`}>{c.employee.payType}</span></td>
                          <td className="px-5 py-3.5 font-mono font-semibold ws-nowrap">
                            <p>LKR {c.basicEarnings.toLocaleString()}</p>
                            {c.employee.payType==="Session-based"&&<p className="text-[9px] text-indigo-400 mt-0.5">{c.sessionCount} sessions</p>}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-zinc-500 ws-nowrap">LKR {c.otPay.toLocaleString()}</td>
                          <td className="px-5 py-3.5 font-mono text-emerald-500 font-bold ws-nowrap">+LKR {c.totalAllowances.toLocaleString()}</td>
                          <td className="px-5 py-3.5 font-mono text-rose-500 ws-nowrap">{c.noPayDeduction>0?`-LKR ${Math.round(c.noPayDeduction).toLocaleString()}`:"LKR 0"}</td>
                          <td className="px-5 py-3.5 font-mono text-zinc-400 ws-nowrap">{c.employee.epfEligible?`-LKR ${Math.round(c.employeeEpf).toLocaleString()}`:"Exempt"}</td>
                          <td className="px-5 py-3.5 font-mono text-amber-500 ws-nowrap">{c.apitMonthly>0?`-LKR ${Math.round(c.apitMonthly).toLocaleString()}`:"—"}</td>
                          <td className="px-5 py-3.5 font-mono font-extrabold text-indigo-500 ws-nowrap">LKR {Math.round(c.netSalary).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right ws-nowrap space-x-1.5">
                            <button
                              onClick={() => {
                                const adjKey = `${selectedMonth}_${c.employee.id}`;
                                const existing = manualAdjustments[adjKey] || { bonusAmount: 0, deductionAmount: 0, note: "" };
                                setAdjustingPayslipEmpId(c.employee.id);
                                setManualBonusInput(existing.bonusAmount);
                                setManualDeductionInput(existing.deductionAmount);
                                setPayslipNoteInput(existing.note);
                              }}
                              className={`px-2.5 py-1.5 rounded text-[10px] font-bold border transition flex items-center gap-1 ${isDark ? "bg-zinc-800 border-zinc-700 text-indigo-300 hover:bg-zinc-750" : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"}`}
                            >
                              <Icons.Edit className="w-3 h-3" />
                              <span>Adjust</span>
                            </button>
                            <button onClick={()=>setSelectedPaySlip(c.employee.id)} className={`px-2.5 py-1.5 rounded text-[10px] font-bold border transition ${isDark?"bg-zinc-850 border-zinc-700 text-white hover:bg-zinc-800":"bg-white border-zinc-200 text-zinc-700 shadow-sm hover:bg-zinc-50"}`}>Pay Slip</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ REPORTS ═══════════════ */}
          {activeTab==="reports" && (
            <div className="space-y-5">
              <h2 className={`text-sm font-bold ${isDark?"text-white":"text-zinc-900"}`}>Reports & History</h2>
              {/* Payroll history with Year Filter */}
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
                  <div className={cardCls(isDark)}>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Payroll History</h3>
                        <p className="text-[11px] text-zinc-500">Click any period card below to view detailed breakdown &amp; employee statements.</p>
                      </div>

                      {/* Year Filter Tabs */}
                      <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs font-semibold ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`}>
                        {yearOptions.map(yr => (
                          <button
                            key={yr}
                            onClick={() => setSelectedHistoryYear(yr)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                              selectedHistoryYear === yr
                                ? isDark ? "bg-indigo-600 text-white shadow" : "bg-white text-indigo-900 shadow-sm"
                                : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                            }`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {filteredHistory.map(period => (
                        <div
                          key={period.id}
                          onClick={() => setSelectedHistoryPeriodId(period.id)}
                          className={`p-4 rounded-lg border transition-all cursor-pointer group hover:-translate-y-0.5 ${
                            isDark
                              ? "bg-zinc-950/40 border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900"
                              : "bg-zinc-50 border-zinc-200 hover:border-indigo-300 hover:bg-white shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs group-hover:text-indigo-500 transition">{period.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusColor(period.status, isDark)}`}>{period.status}</span>
                              <span className="text-zinc-400 text-[10px]">➜</span>
                            </div>
                          </div>
                          <p className="text-lg font-extrabold text-indigo-500 mb-1">LKR {period.grossSalaryPool.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-500">Net: LKR {period.netRemittances.toLocaleString()}</p>
                          <p className="text-[10px] text-zinc-500">EPF: LKR {period.totalEpf.toLocaleString()} · ETF: LKR {period.totalEtf.toLocaleString()}</p>
                          <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span>Finalized: {period.finalizedAt?.split(" ")[0]}</span>
                            <span className="font-sans text-indigo-500 font-bold group-hover:underline">View Details</span>
                          </div>
                        </div>
                      ))}
                      {filteredHistory.length === 0 && (
                        <p className="col-span-3 py-6 text-center text-xs text-zinc-500">No finalized payroll periods found for {selectedHistoryYear}.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
              {/* Audit Trail & Activity Log Inspector */}
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
                      return isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" : "bg-indigo-50 text-indigo-700 border-indigo-200";
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
                  <div className={cardCls(isDark)}>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Audit Trail &amp; Activity Log Inspector</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>
                            {filteredLogs.length} / {auditLogs.length} Events
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Real-time system events, hardware scans, payroll finalizations, and admin actions.</p>
                      </div>

                      {/* Filter & Search Bar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          placeholder="Search logs (e.g. Ruwan, PIN, Payroll)..."
                          value={auditSearch}
                          onChange={e => setAuditSearch(e.target.value)}
                          className={`${inputCls(isDark)} max-w-[240px] text-xs`}
                        />

                        {/* Action Filter Pills */}
                        <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs font-semibold ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-100 border-zinc-200"}`}>
                          {actionOptions.map(act => (
                            <button
                              key={act}
                              onClick={() => setAuditActionFilter(act)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                auditActionFilter === act
                                  ? isDark ? "bg-indigo-600 text-white shadow" : "bg-white text-indigo-900 shadow-sm"
                                  : isDark ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              {act}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {filteredLogs.map(log => (
                        <div
                          key={log.id}
                          onClick={() => setSelectedAuditLogId(log.id)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer group hover:-translate-y-0.5 ${
                            isDark
                              ? "bg-zinc-950/40 border-zinc-800/80 hover:border-indigo-500/40 hover:bg-zinc-900"
                              : "bg-zinc-50 border-zinc-200/80 hover:border-indigo-300 hover:bg-white shadow-sm"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider border uppercase ${getActionPill(log.action)}`}>
                                {log.action}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-200/60 border-zinc-300 text-zinc-600"}`}>
                                {log.entity}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-400">ID: {log.entityId}</span>
                            </div>

                            <div className="flex items-center gap-3 text-[10px]">
                              {log.actor && (
                                <span className={`font-semibold flex items-center gap-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                                  <Icons.User className="w-3 h-3 text-indigo-400" />
                                  <span>{log.actor}</span>
                                </span>
                              )}
                              {log.ipAddress && (
                                <span className="font-mono text-zinc-500">
                                  IP: {log.ipAddress}
                                </span>
                              )}
                              <span className="font-mono text-zinc-400 flex items-center gap-1">
                                <Icons.Clock className="w-3 h-3 text-emerald-400" />
                                <span>{log.timestamp}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs ${isDark ? "text-zinc-200" : "text-zinc-800"} font-medium`}>
                              {log.details}
                            </p>
                            <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap flex items-center gap-1">
                              <span>Inspect</span>
                              <Icons.Search className="w-3 h-3 text-indigo-400" />
                            </span>
                          </div>
                        </div>
                      ))}

                      {filteredLogs.length === 0 && (
                        <div className="py-8 text-center text-xs text-zinc-500">
                          No audit log events match your search criteria.
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
            <div className="space-y-5 max-w-xl mx-auto">
              {!selfServiceEmp ? (
                <div className={`${cardCls(isDark)} text-center py-12`}>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 ${isDark ? "bg-zinc-800 text-zinc-100" : "bg-indigo-100 text-indigo-700"}`}>👤</div>
                  <h2 className="font-bold text-lg mb-1">Employee Self-Service</h2>
                  <p className="text-xs text-zinc-500 mb-6">Enter your Biometric ID to view your payslip and attendance summary</p>
                  <div className="flex gap-2 max-w-xs mx-auto">
                    <input value={selfServicePin} onChange={e=>setSelfServicePin(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleSelfServicePin();}} placeholder="Biometric ID (e.g. 101)" className={`${inputCls(isDark)} text-center font-mono text-lg`}/>
                    <button onClick={handleSelfServicePin} className={`px-4 py-2 text-xs font-bold rounded shadow transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>Go</button>
                  </div>
                  {selfServiceError&&<p className="text-xs text-rose-500 mt-3">{selfServiceError}</p>}
                  <p className="text-[10px] text-zinc-600 mt-6">Try: 101, 102, 103, 104, or 105</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-lg">{selfServiceEmp.firstName} {selfServiceEmp.lastName}</h2>
                      <p className="text-xs text-zinc-500">{selfServiceEmp.role} · {selfServiceEmp.payType}</p>
                    </div>
                    <button onClick={()=>{setSelfServiceEmp(null);setSelfServicePin("");}} className={`px-3 py-1.5 text-xs font-bold rounded border ${isDark?"border-zinc-700 text-zinc-400 hover:bg-zinc-800":"border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>← Back</button>
                  </div>
                  {/* Leave balances */}
                  <div className={cardCls(isDark)}>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Leave Balances</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(["annual","sick","casual"] as const).map(k=>(
                        <div key={k} className={`p-3 rounded border text-center ${isDark?"bg-zinc-950/40 border-zinc-800":"bg-zinc-50 border-zinc-200"}`}>
                          <p className="text-[10px] text-zinc-500 capitalize mb-1">{k}</p>
                          <p className="text-2xl font-extrabold">{selfServiceEmp.leaveBalances[k]}</p>
                          <p className="text-[10px] text-zinc-500">days left</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* My payslip */}
                  {(() => {
                    const calc = payrollCalcs.find(c=>c.employee.id===selfServiceEmp.id);
                    if (!calc) return null;
                    return (
                      <div className={cardCls(isDark)}>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">My Payslip — {selectedMonth}</h3>
                        <div className="space-y-2 text-xs">
                          {[["Basic Earnings",`LKR ${calc.basicEarnings.toLocaleString()}`],["OT Pay",`LKR ${calc.otPay.toLocaleString()}`],["Allowances",`+LKR ${calc.totalAllowances.toLocaleString()}`],["No-Pay Deduction",calc.noPayDeduction>0?`-LKR ${Math.round(calc.noPayDeduction).toLocaleString()}`:"LKR 0"],["EPF (8%)",calc.employee.epfEligible?`-LKR ${Math.round(calc.employeeEpf).toLocaleString()}`:"Exempt"],["APIT Tax",calc.apitMonthly>0?`-LKR ${Math.round(calc.apitMonthly).toLocaleString()}`:"—"]].map(([lbl,val])=>(
                            <div key={lbl} className={`flex justify-between pb-2 border-b ${isDark?"border-zinc-800":"border-zinc-100"}`}>
                              <span className="text-zinc-500">{lbl}</span><span className="font-mono font-semibold">{val}</span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-1"><span className="font-bold">Net Salary</span><span className="font-extrabold text-indigo-500 text-base">LKR {Math.round(calc.netSalary).toLocaleString()}</span></div>
                        </div>
                      </div>
                    );
                  })()}
                  {/* My attendance */}
                  <div className={cardCls(isDark)}>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">My Attendance — {selectedMonth}</h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {attendanceLogs.filter(l=>l.employeeId===selfServiceEmp.id&&l.date>=dateRange.startDate&&l.date<=dateRange.endDate).sort((a,b)=>b.date.localeCompare(a.date)).map(l=>(
                        <div key={l.id} className={`flex justify-between items-center px-3 py-2 rounded border text-xs ${isDark?"bg-zinc-900/40 border-zinc-800":"bg-zinc-50 border-zinc-100"}`}>
                          <span className="font-mono text-zinc-500">{l.date}</span>
                          <span>{l.checkIn} → {l.checkOut||"–"}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor(l.status,isDark)}`}>{l.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ SETTINGS ═══════════════ */}
          {activeTab==="settings" && (
            <div className={`rounded-xl border overflow-hidden ${isDark?"bg-zinc-900 border-zinc-800":"bg-white border-zinc-200 shadow-sm"}`}>
              <div className={`flex border-b ${isDark?"border-zinc-800":"border-zinc-200"}`}>
                {SETTINGS_TABS.map(t=>(
                  <button key={t.id} onClick={()=>setSettingsTab(t.id as SettingsTabId)} className={`px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${settingsTab===t.id?(isDark?"border-white text-white":"border-zinc-800 text-zinc-900"):"border-transparent text-zinc-400 hover:text-zinc-600"}`}>{t.label}</button>
                ))}
              </div>
              <div className="p-6">

                {/* BIOMETRIC & HIKVISION CLOUD SETTINGS */}
                {settingsTab==="biometric" && (
                  <div className="space-y-6 max-w-2xl">
                    {/* Featured Device Card */}
                    <div className={`p-5 rounded-xl border relative overflow-hidden ${isDark ? "bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-zinc-800" : "bg-gradient-to-br from-zinc-50 via-white to-zinc-100 border-zinc-200 shadow-sm"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-rose-500/10 text-rose-500 rounded border border-rose-500/20">Active Cloud Hardware</span>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">ISUP 5.0 Wi-Fi</span>
                          </div>
                          <h3 className="text-base font-bold mt-2">Hikvision DS-K1T320MFWX Face Terminal</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">Touchless Facial & Biometric Time Attendance — IP: 192.168.8.135</p>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-slate-800/80 border border-slate-700" : "bg-indigo-50 border border-indigo-200 shadow-sm"}`}>
                          <Icons.Camera className={`w-5 h-5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
                        </div>
                      </div>

                      <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t text-xs ${isDark ? "border-zinc-800/40" : "border-zinc-200"}`}>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Authentication</span>
                          <span className="font-semibold">Face / Fingerprint / Card</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Terminal IP</span>
                          <span className="font-semibold text-emerald-500">192.168.8.135 (Online)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Connection</span>
                          <span className="font-semibold text-emerald-400">HTTP Event Push</span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Settings */}
                    <div className={`p-5 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"} space-y-4`}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Cloud Webhook &amp; Listener Endpoint</h4>
                      <div>
                        <label className={labelCls}>Hikvision HTTP Notification / ISUP Server URL</label>
                        <div className="flex gap-2">
                          <input readOnly className={`${inputCls(isDark)} font-mono text-[11px] ${isDark ? "text-emerald-400 bg-zinc-950/80 border-emerald-900/40" : "text-emerald-700 bg-emerald-50/80 border-emerald-300 font-semibold"}`} value="/api/biometric/hikvision" />
                          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/biometric/hikvision`)} className={`px-3 py-1.5 text-xs font-bold rounded whitespace-nowrap flex items-center gap-1.5 transition ${isDark ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm"}`}>
                            <Icons.Clipboard className="w-3.5 h-3.5" />
                            <span>Copy Webhook</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Enter this URL in Hikvision Web Client under <code className={isDark ? "text-zinc-400" : "text-zinc-700 font-semibold"}>Network -&gt; Advanced -&gt; Event Notification</code>.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className={labelCls}>Device Model &amp; Mode</label>
                          <select className={inputCls(isDark)} value={biometricSettings.deviceType} onChange={e => updateBiometricSettings({ deviceType: e.target.value as BiometricSettings["deviceType"] })}>
                            {["Hikvision DS-K1T320EFWX (ISUP 5.0 Cloud)", "ZKTeco TCP", "Cloud ADMS", "Hikvision Web"].map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Sync Protocol</label>
                          <select className={inputCls(isDark)} value={biometricSettings.pollInterval} onChange={e => updateBiometricSettings({ pollInterval: e.target.value as BiometricSettings["pollInterval"] })}>
                            {["Real-time Push (ISUP)", "Every 15 mins", "Hourly", "Daily", "Manual"].map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        {settingsSaveMsg && settingsTab === "biometric" ? (
                          <span className="text-xs font-bold text-emerald-400">{settingsSaveMsg}</span>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsSaveMsg("Biometric settings updated successfully!");
                            setTimeout(() => setSettingsSaveMsg(""), 3000);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow transition"
                        >
                          Save Biometric Settings
                        </button>
                      </div>
                    </div>

                    {/* Hardware Test & Simulation Box */}
                    <div className={`p-5 rounded-xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Live Hardware Simulator</h4>
                          <p className="text-[11px] text-zinc-500">Test incoming face / fingerprint scan payloads as if sent by the Hikvision DS-K1T320EFWX terminal.</p>
                        </div>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded border ${isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>Cloud API Tester</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className={labelCls}>Target Employee (Biometric ID)</label>
                          <select className={inputCls(isDark)} value={selectedSimEmpId} onChange={e => setSelectedSimEmpId(e.target.value)}>
                            {employees.map(e => (
                              <option key={e.id} value={e.biometricId}>
                                #{e.biometricId} - {e.firstName} {e.lastName} ({e.role})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <button
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
                            className="w-full py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold rounded shadow transition flex items-center justify-center gap-1.5"
                          >
                            <Icons.Bolt className="w-4 h-4" />
                            <span>{simulatingScan ? "Processing..." : "Simulate Face Scan"}</span>
                          </button>
                        </div>
                      </div>

                      {simResult && (
                        <div className={`p-2.5 rounded text-xs font-mono border ${isDark ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"}`}>
                          {simResult}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* CLINIC COMPANY PROFILE */}
                {settingsTab === "company" && (
                  <div className="space-y-5 max-w-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Clinic / Organization Details</h3>
                    <p className="text-xs text-zinc-500">These details will appear on all printed Salary Statements, Payslips, and EPF Form C-3 reports.</p>
                    
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className={labelCls}>Clinic / Company Name</label>
                        <input
                          className={inputCls(isDark)}
                          value={companyProfile.clinicName}
                          onChange={e => updateCompanyProfile({ clinicName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Official Address</label>
                        <textarea
                          rows={2}
                          className={inputCls(isDark)}
                          value={companyProfile.address}
                          onChange={e => updateCompanyProfile({ address: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>EPF Registration No.</label>
                          <input
                            className={inputCls(isDark)}
                            value={companyProfile.epfRegNo}
                            onChange={e => updateCompanyProfile({ epfRegNo: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className={labelCls}>ETF Registration No.</label>
                          <input
                            className={inputCls(isDark)}
                            value={companyProfile.etfRegNo}
                            onChange={e => updateCompanyProfile({ etfRegNo: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        {settingsSaveMsg && settingsTab === "company" ? (
                          <span className="text-xs font-bold text-emerald-400">{settingsSaveMsg}</span>
                        ) : <span />}
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsSaveMsg("Clinic profile saved successfully!");
                            setTimeout(() => setSettingsSaveMsg(""), 3000);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow transition"
                        >
                          Save Clinic Profile
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECURITY & ADMIN PIN */}
                {settingsTab === "security" && (
                  <div className="space-y-5 max-w-md">
                    <div className="flex items-center gap-2">
                      <Icons.LockClosed className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Admin Security Settings</h3>
                    </div>
                    <p className="text-xs text-zinc-500">Customize the 4-digit PIN required to unlock sensitive Payroll Engine &amp; System Configuration tabs.</p>

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
                      className={`p-5 rounded-xl border space-y-4 text-xs ${isDark ? "border-zinc-800 bg-zinc-950/40" : "border-zinc-200 bg-white shadow-sm"}`}
                    >
                      <div>
                        <label className={labelCls}>Current Active PIN</label>
                        <input
                          disabled
                          readOnly
                          className={`${inputCls(isDark)} font-mono tracking-widest ${isDark ? "bg-zinc-900 text-zinc-400" : "bg-zinc-100 text-zinc-600"}`}
                          value={`•••• (Active: ${adminPin})`}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>New 4-Digit Security PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="e.g. 5678"
                          className={`${inputCls(isDark)} font-mono text-center tracking-[0.5em] text-base`}
                          value={newPinInput}
                          onChange={e => {
                            setNewPinInput(e.target.value);
                            setPinChangeMsg("");
                          }}
                        />
                      </div>

                      {pinChangeMsg && (
                        <p className={`text-xs font-bold text-center ${pinChangeMsg.startsWith("✓") ? "text-emerald-400" : "text-rose-500"}`}>
                          {pinChangeMsg}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={newPinInput.length !== 4}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded shadow transition"
                      >
                        Update Security PIN
                      </button>
                    </form>
                  </div>
                )}

                {/* EPF / ETF */}
                {settingsTab==="epf" && (
                  <div className="space-y-5 max-w-md">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Statutory Rates</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[["Employee EPF (%)","employeeRate"],["Employer EPF (%)","employerRate"],["ETF (%)","etfRate"]].map(([label,key])=>(
                        <div key={key}><label className={labelCls}>{label}</label><input type="number" className={inputCls(isDark)} value={(epfSettings as unknown as Record<string,number>)[key]} onChange={e=>updateEpfSettings({[key]:parseFloat(e.target.value)||0})}/></div>
                      ))}
                    </div>
                    <div><label className={labelCls}>Working Days / Month</label><input type="number" className={`${inputCls(isDark)} max-w-[120px]`} value={epfSettings.workingDaysPerMonth} onChange={e=>updateEpfSettings({workingDaysPerMonth:parseInt(e.target.value)||26})}/><p className="text-[10px] text-zinc-500 mt-1">Used to calculate daily no-pay rate.</p></div>
                    <div className="pt-4 border-t border-zinc-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Salary Period Cycle</h4>
                      <select className={inputCls(isDark)} value={payrollCycleStartDay} onChange={e=>updatePayrollCycleStartDay(parseInt(e.target.value)||1)}>
                        {Array.from({length:31},(_,i)=>i+1).map(day=>{const s=daySuffix(day);const pd=day-1;const ps=daySuffix(pd);return(<option key={day} value={day}>{day}{s} of month {day===1?"(Standard calendar month)":`(${day}${s} to ${pd}${ps} of next month)`}</option>);})}
                      </select>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      {settingsSaveMsg && settingsTab === "epf" ? (
                        <span className="text-xs font-bold text-emerald-400">{settingsSaveMsg}</span>
                      ) : <span />}
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsSaveMsg("✓ Statutory EPF/ETF settings updated successfully!");
                          setTimeout(() => setSettingsSaveMsg(""), 3000);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow transition"
                      >
                        Save EPF / ETF Settings
                      </button>
                    </div>
                  </div>
                )}

                {/* ALLOWANCES */}
                {settingsTab==="allowances" && (
                  <div className="space-y-4 max-w-2xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Global Allowance Categories</h3>
                    <div className="space-y-2">
                      {allowances.map(al=>(
                        <div key={al.id} className={`flex items-center justify-between p-3 rounded-lg border ${isDark?"bg-zinc-950/40 border-zinc-800":"bg-zinc-50 border-zinc-200"}`}>
                          <div><p className="font-semibold text-xs">{al.name}</p><p className="text-[10px] text-zinc-500">LKR {al.amount.toLocaleString()} · {al.type}{al.epfApplicable?" · EPF Subject":""}</p></div>
                          <button onClick={()=>deleteAllowance(al.id)} className="text-rose-500 hover:underline text-[10px] font-bold">Delete</button>
                        </div>
                      ))}
                    </div>
                    <div className={`p-4 rounded-lg border ${isDark?"border-zinc-800":"border-zinc-200"}`}>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3">Add Allowance</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2"><label className={labelCls}>Name</label><input className={inputCls(isDark)} value={newAllowance.name} onChange={e=>setNewAllowance(p=>({...p,name:e.target.value}))}/></div>
                        <div><label className={labelCls}>Amount (LKR)</label><input type="number" className={inputCls(isDark)} value={newAllowance.amount} onChange={e=>setNewAllowance(p=>({...p,amount:parseFloat(e.target.value)||0}))}/></div>
                        <div><label className={labelCls}>Type</label><select className={inputCls(isDark)} value={newAllowance.type} onChange={e=>setNewAllowance(p=>({...p,type:e.target.value as "Fixed"|"Variable"}))}><option>Fixed</option><option>Variable</option></select></div>
                      </div>
                      <div className="flex items-center gap-5 mt-3">
                        <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={newAllowance.epfApplicable} onChange={e=>setNewAllowance(p=>({...p,epfApplicable:e.target.checked}))} className="rounded"/>EPF Applicable</label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={newAllowance.taxDeductible} onChange={e=>setNewAllowance(p=>({...p,taxDeductible:e.target.checked}))} className="rounded"/>Tax Deductible</label>
                        <button onClick={()=>{if(newAllowance.name.trim()){addAllowance(newAllowance);setNewAllowance({name:"",amount:10000,epfApplicable:false,taxDeductible:true,type:"Fixed"});}}} className={`ml-auto px-4 py-2 text-xs font-bold rounded shadow transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>Add Allowance</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAFF */}
                {settingsTab==="staff" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Staff Directory</h3>
                      <div className="flex gap-2">
                        <button
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
                              shiftId: null,
                              branchId: null,
                              allowanceIds: [],
                              leaveBalances: { annual: 14, sick: 7, casual: 3 },
                            });
                            setShowAddEmpModal(true);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded border shadow transition flex items-center gap-1.5 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700" : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"}`}
                        >
                          <Icons.Refresh className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Import Staff from Terminal</span>
                        </button>
                        <button onClick={()=>{setEditingEmpId(null);setNewEmp({firstName:"",lastName:"",role:"Nurse",payType:"Fixed Monthly",basicSalary:50000,hourlyRate:300,sessionRate:0,commissionRate:0,biometricId:"",epfEligible:true,taxable:false,shiftId:null,branchId:null,allowanceIds:[],leaveBalances:{annual:14,sick:7,casual:3}});setShowAddEmpModal(true);}} className={`px-3 py-1.5 text-xs font-bold rounded shadow transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>+ Register Member</button>
                      </div>
                    </div>
                    <div className="space-y-2 max-w-3xl">
                      {activeEmployees.map(emp=>(
                        <div key={emp.id} className={`flex items-center justify-between p-3.5 rounded-lg border hover:border-zinc-300 dark:hover:border-zinc-700 transition ${isDark?"bg-zinc-950/20 border-zinc-800":"bg-white border-zinc-200"}`}>
                          <div>
                            <p className="font-bold text-xs">{emp.firstName} {emp.lastName}</p>
                            <p className="text-[10px] text-zinc-500">{emp.role} · {emp.payType} · Biometric: {emp.biometricId}</p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {emp.allowanceIds.map(aid=>{const al=allowances.find(a=>a.id===aid);return al?<span key={aid} className={`text-[9px] px-1.5 py-0.5 rounded border ${isDark?"border-zinc-700 text-zinc-500":"border-zinc-200 text-zinc-500"}`}>{al.name}</span>:null;})}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-bold text-xs">{emp.payType==="Fixed Monthly"?`LKR ${emp.basicSalary.toLocaleString()}/mo`:emp.payType==="Session-based"?`LKR ${emp.sessionRate.toLocaleString()}/session`:`LKR ${emp.hourlyRate.toLocaleString()}/hr`}</p>
                              <p className="text-[10px] text-zinc-500">{emp.epfEligible?"EPF Subject":"EPF Exempt"}{emp.taxable?" · APIT":""}</p>
                            </div>
                            <div className="flex items-center gap-1 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                              <button onClick={()=>openEditEmp(emp)} className={`p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-400 hover:text-zinc-800 dark:hover:text-white`} title="Edit">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                              </button>
                              <button onClick={()=>{if(confirm(`Delete ${emp.firstName} ${emp.lastName}?`))deleteEmployee(emp.id);}} className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-zinc-400 hover:text-rose-600" title="Delete">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Machine Enrolled Persons Section */}
                    <div className={`p-5 rounded-xl border mt-6 ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"} space-y-4 max-w-3xl`}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Terminal Enrolled Persons ({machinePersons.length} / 500)</h4>
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Push Connected
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Hardware PUSH listener active — incoming biometric scans &amp; users automatically sync in real-time.</p>
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
                                shiftId: null,
                                branchId: null,
                                allowanceIds: [],
                                leaveBalances: { annual: 14, sick: 7, casual: 3 },
                              });
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow transition flex items-center gap-1.5"
                          >
                            <span>+ Link New Terminal ID</span>
                          </button>
                          <button
                            type="button"
                            disabled={isFetchingPersons}
                            onClick={async () => {
                              await fetchMachinePersons();
                              setSettingsSaveMsg("Enrolled users synced via Hikvision Push protocol!");
                              setTimeout(() => setSettingsSaveMsg(""), 3000);
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition ${isDark ? "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm"}`}
                          >
                            <Icons.Refresh className={`w-3.5 h-3.5 text-indigo-400 ${isFetchingPersons ? "animate-spin" : ""}`} />
                            <span>{isFetchingPersons ? "Syncing..." : "Sync Enrolled Persons"}</span>
                          </button>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg text-xs border ${isDark ? "bg-indigo-950/20 border-indigo-800/40 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-800"}`}>
                        <div className="font-bold flex items-center gap-1.5 mb-1">
                          <Icons.Shield className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Connecting Local Router IP (192.168.8.135) to Cloud App</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Because your Hikvision terminal is on a local private Wi-Fi network (<code>192.168.8.135</code>), cloud servers cannot open inbound HTTP calls to local router IPs directly.
                          <br />
                          <strong>To register new staff added on Hikvision browser:</strong>
                        </p>
                        <ul className="list-disc list-inside text-[11px] mt-1 space-y-0.5 font-medium">
                          <li><strong>Option 1 (Automatic)</strong>: Have the new employee scan their face/finger on the terminal once — our server will auto-register them in real-time!</li>
                          <li><strong>Option 2 (Manual)</strong>: Click <strong>+ Link New Terminal ID</strong> above and enter their Biometric ID (e.g. <code>3</code>, <code>4</code>).</li>
                        </ul>
                      </div>

                      <div className="overflow-x-auto border rounded-lg border-zinc-800/40">
                        <table className="w-full text-xs text-left">
                          <thead className={`text-[10px] font-extrabold uppercase tracking-wider border-b ${isDark ? "bg-zinc-950/60 border-zinc-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
                            <tr>
                              <th className="px-4 py-2.5">User ID</th>
                              <th className="px-4 py-2.5">Name</th>
                              <th className="px-4 py-2.5">Type</th>
                              <th className="px-4 py-2.5">Biometrics Enrolled</th>
                              <th className="px-4 py-2.5 text-right">App Status</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? "divide-zinc-800/40" : "divide-slate-200"}`}>
                            {machinePersons.map(p => {
                              const matchedEmp = employees.find(e => e.biometricId === p.employeeNo);
                              return (
                                <tr key={p.employeeNo} className={isDark ? "hover:bg-zinc-800/30" : "hover:bg-slate-50"}>
                                  <td className="px-4 py-3 font-mono font-bold text-indigo-400">#{p.employeeNo}</td>
                                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                                  <td className="px-4 py-3 text-zinc-400 uppercase text-[10px] font-bold">{p.userType}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex gap-2 text-[10px]">
                                      {p.numOfFace ? <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Face</span> : null}
                                      {p.numOfFingerprint ? <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">Fingerprint</span> : null}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {matchedEmp ? (
                                      <div className="flex items-center justify-end gap-1.5">
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                                          Linked ({matchedEmp.firstName})
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => openEditEmp(matchedEmp)}
                                          className={`px-2 py-0.5 text-[10px] font-bold rounded border transition flex items-center gap-1 ${
                                            isDark ? "bg-zinc-800 border-zinc-700 text-indigo-300 hover:bg-zinc-750" : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                          }`}
                                        >
                                          <Icons.Edit className="w-3 h-3" />
                                          <span>Edit Name</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openEditEmp({ id: "", firstName: p.name, lastName: "", role: "Nurse", payType: "Fixed Monthly", basicSalary: 50000, hourlyRate: 300, sessionRate: 0, commissionRate: 0, biometricId: p.employeeNo, epfEligible: true, taxable: false, active: true, shiftId: null, branchId: null, allowanceIds: [], leaveBalances: { annual: 14, sick: 7, casual: 3 } });
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded hover:bg-amber-500/20"
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

                {/* SHIFTS */}
                {settingsTab==="shifts" && (
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Shift Templates</h3>
                      <button onClick={()=>setShowAddShiftModal(true)} className={`px-3 py-1.5 text-xs font-bold rounded shadow transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>+ New Shift</button>
                    </div>
                    <div className="space-y-2">
                      {shifts.map(s=>{
                        const dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                        const empCount = activeEmployees.filter(e=>e.shiftId===s.id).length;
                        return (
                          <div key={s.id} className={`flex items-center justify-between p-4 rounded-lg border ${isDark?"bg-zinc-950/30 border-zinc-800":"bg-zinc-50 border-zinc-200"}`}>
                            <div>
                              <p className="font-bold text-xs">{s.name}</p>
                              <p className="text-[10px] text-zinc-500">{s.startTime} – {s.endTime} · OT after {s.otThresholdHours}h · {s.otMultiplier}× rate</p>
                              <p className="text-[10px] text-zinc-500">{s.workDays.map(d=>dayNames[d]).join(", ")}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-zinc-500">{empCount} staff</span>
                              <button
                                onClick={() => {
                                  setEditingShiftId(s.id);
                                  setNewShift({ name: s.name, startTime: s.startTime, endTime: s.endTime, workDays: s.workDays, otThresholdHours: s.otThresholdHours, otMultiplier: s.otMultiplier });
                                  setShowAddShiftModal(true);
                                }}
                                className="text-indigo-400 hover:underline text-[10px] font-bold"
                              >
                                Edit
                              </button>
                              <button onClick={()=>deleteShift(s.id)} className="text-rose-500 hover:underline text-[10px] font-bold">Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}



                {/* APIT */}
                {settingsTab==="apit" && (
                  <div className="space-y-4 max-w-lg">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">APIT / PAYE Tax Slabs (Annual Income)</h3>
                    <div className={`rounded-lg border overflow-hidden ${isDark?"border-zinc-800":"border-zinc-200"}`}>
                      <table className="w-full text-xs">
                        <thead className={`border-b ${isDark?"bg-zinc-900 border-zinc-800":"bg-zinc-50 border-zinc-200"}`}>
                          <tr>{["From (LKR)","To (LKR)","Rate (%)"].map(h=><th key={h} className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-zinc-400">{h}</th>)}</tr>
                        </thead>
                        <tbody className={`divide-y ${isDark?"divide-zinc-800":"divide-zinc-100"}`}>
                          {apitSlabs.map((slab,idx)=>(
                            <tr key={idx}>
                              <td className="px-4 py-3 font-mono">LKR {slab.minIncome.toLocaleString()}</td>
                              <td className="px-4 py-3 font-mono">{slab.maxIncome?`LKR ${slab.maxIncome.toLocaleString()}`:"No limit"}</td>
                              <td className="px-4 py-3 font-bold text-amber-500">{slab.rate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-zinc-500">These slabs follow the Sri Lanka Inland Revenue Act. APIT is computed monthly as 1/12 of the projected annual tax on each employee&apos;s annualised net salary.</p>
                  </div>
                )}

                {/* HOLIDAYS */}
                {settingsTab==="holidays" && (
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Sri Lankan Public Holidays 2026</h3>
                      <button onClick={()=>setShowAddHolidayModal(true)} className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded shadow">+ Add Holiday</button>
                    </div>
                    <div className="space-y-1.5">
                      {publicHolidays.map(h=>(
                        <div key={h.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${isDark?"bg-zinc-950/30 border-zinc-800":"bg-zinc-50 border-zinc-200"}`}>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-zinc-500">{h.date}</span>
                            <span className="font-semibold text-xs">{h.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                              <input type="checkbox" checked={h.isDoubleOT} onChange={()=>toggleHolidayDoubleOT(h.id)} className="rounded"/>
                              <span className="text-zinc-500">2× OT</span>
                            </label>
                            <button onClick={()=>deleteHoliday(h.id)} className="text-rose-500 hover:underline text-[10px] font-bold">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </main>

      {/* ═══════════════ SLIDE DRAWER (Attendance Edit) ═══════════════ */}
      <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-300 ${drawerLogId?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={()=>setDrawerLogId(null)}/>
        <div className={`absolute right-0 top-0 h-full w-96 shadow-2xl transition-transform duration-300 ${drawerLogId?"translate-x-0":"translate-x-full"} ${isDark?"bg-zinc-900 border-l border-zinc-800":"bg-white border-l border-zinc-200"}`}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-sm">Adjust Punch Record</h3>
              <button onClick={()=>setDrawerLogId(null)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {[["Check In","checkIn"],["Check Out","checkOut"]].map(([label,field])=>(
                <div key={field}><label className={labelCls}>{label}</label><input className={inputCls(isDark)} value={(punchEdit as Record<string,string|number>)[field] as string} onChange={e=>setPunchEdit(p=>({...p,[field]:e.target.value}))}/></div>
              ))}
              <div><label className={labelCls}>Status</label>
                <select className={inputCls(isDark)} value={punchEdit.status} onChange={e=>setPunchEdit(p=>({...p,status:e.target.value as AttendanceLog["status"]}))}>  
                  {["On-Time","Late","Half-Day","On-Leave","Absent"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>OT Hours</label><input type="number" step="0.5" className={inputCls(isDark)} value={punchEdit.overtimeHours} onChange={e=>setPunchEdit(p=>({...p,overtimeHours:parseFloat(e.target.value)||0}))}/></div>
                <div><label className={labelCls}>No-Pay Hours</label><input type="number" step="0.5" className={inputCls(isDark)} value={punchEdit.noPayHours} onChange={e=>setPunchEdit(p=>({...p,noPayHours:parseFloat(e.target.value)||0}))}/></div>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-800">
              <button onClick={()=>setDrawerLogId(null)} className={`flex-1 py-2 text-xs font-bold rounded border ${isDark?"border-zinc-700 text-zinc-400 hover:bg-zinc-800":"border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>Cancel</button>
              <button onClick={()=>{if(drawerLogId){updateAttendanceLog(drawerLogId,punchEdit);setDrawerLogId(null);}}} className="flex-1 py-2 text-xs font-bold rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow">Save Changes</button>
            </div>
          </div>
        </div>
      </div>

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
                <div><label className={labelCls}>Role</label><select className={inputCls(isDark)} value={newEmp.role} onChange={e=>setNewEmp(p=>({...p,role:e.target.value as Employee["role"]}))}>{["Doctor","Nurse","Receptionist","Admin","Assistant"].map(r=><option key={r}>{r}</option>)}</select></div>
                <div><label className={labelCls}>Pay Type</label><select className={inputCls(isDark)} value={newEmp.payType} onChange={e=>setNewEmp(p=>({...p,payType:e.target.value as Employee["payType"]}))}>{["Fixed Monthly","Session-based","Hourly"].map(r=><option key={r}>{r}</option>)}</select></div>
              </div>
              {newEmp.payType==="Fixed Monthly"&&<div className="grid grid-cols-2 gap-4"><div><label className={labelCls}>Basic Salary (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.basicSalary} onChange={e=>setNewEmp(p=>({...p,basicSalary:parseFloat(e.target.value)||0}))}/></div><div><label className={labelCls}>Hourly Rate (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.hourlyRate} onChange={e=>setNewEmp(p=>({...p,hourlyRate:parseFloat(e.target.value)||0}))}/></div></div>}
              {newEmp.payType==="Session-based"&&<div><label className={labelCls}>Session Rate (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.sessionRate} onChange={e=>setNewEmp(p=>({...p,sessionRate:parseFloat(e.target.value)||0}))}/></div>}
              {newEmp.payType==="Hourly"&&<div><label className={labelCls}>Hourly Rate (LKR)</label><input type="number" className={inputCls(isDark)} value={newEmp.hourlyRate} onChange={e=>setNewEmp(p=>({...p,hourlyRate:parseFloat(e.target.value)||0}))}/></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Biometric ID</label><input required className={inputCls(isDark)} value={newEmp.biometricId} onChange={e=>setNewEmp(p=>({...p,biometricId:e.target.value}))}/></div>
                <div><label className={labelCls}>Shift</label><select className={inputCls(isDark)} value={newEmp.shiftId||""} onChange={e=>setNewEmp(p=>({...p,shiftId:e.target.value||null}))}><option value="">No shift</option>{shifts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>

              <div><label className={labelCls}>Assign Allowances</label><div className="flex flex-wrap gap-2 mt-1">{allowances.map(al=>{const has=newEmp.allowanceIds.includes(al.id);return(<label key={al.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer"><input type="checkbox" checked={has} onChange={()=>setNewEmp(p=>({...p,allowanceIds:has?p.allowanceIds.filter(id=>id!==al.id):[...p.allowanceIds,al.id]}))}/>{al.name}</label>);})}</div></div>
              <div className="flex gap-5">
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={newEmp.epfEligible} onChange={e=>setNewEmp(p=>({...p,epfEligible:e.target.checked}))} className="rounded"/>EPF / ETF Eligible</label>
                <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={newEmp.taxable} onChange={e=>setNewEmp(p=>({...p,taxable:e.target.checked}))} className="rounded"/>APIT Taxable</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={()=>setShowAddEmpModal(false)} className={`px-4 py-2 text-xs font-bold rounded border ${isDark?"border-zinc-700 text-zinc-400":"border-zinc-200 text-zinc-600"}`}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded shadow">{editingEmpId?"Save Changes":"Register Profile"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: ADD LEAVE REQUEST ═══════════════ */}
      {showAddLeaveModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${isDark ? "bg-zinc-950/70" : "bg-slate-900/40"}`}>
          <div className={`w-full max-w-md rounded-xl shadow-2xl border ${isDark?"bg-zinc-900 border-zinc-800":"bg-white border-zinc-200"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">New Leave Request</h3>
              <button onClick={()=>setShowAddLeaveModal(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div><label className={labelCls}>Employee</label><select className={inputCls(isDark)} value={newLeave.employeeId} onChange={e=>setNewLeave(p=>({...p,employeeId:e.target.value}))}>{activeEmployees.map(e=><option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Type</label><select className={inputCls(isDark)} value={newLeave.type} onChange={e=>setNewLeave(p=>({...p,type:e.target.value as LeaveRequest["type"]}))}>{["Annual","Sick","Casual","Unpaid"].map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className={labelCls}>Status</label><select className={inputCls(isDark)} value={newLeave.status} onChange={e=>setNewLeave(p=>({...p,status:e.target.value as LeaveRequest["status"]}))}><option>Pending</option><option>Approved</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Start Date</label><input type="date" className={inputCls(isDark)} value={newLeave.startDate} onChange={e=>setNewLeave(p=>({...p,startDate:e.target.value}))}/></div>
                <div><label className={labelCls}>End Date</label><input type="date" className={inputCls(isDark)} value={newLeave.endDate} onChange={e=>setNewLeave(p=>({...p,endDate:e.target.value}))}/></div>
              </div>
              <div><label className={labelCls}>Note</label><textarea className={`${inputCls(isDark)} h-16 resize-none`} value={newLeave.note} onChange={e=>setNewLeave(p=>({...p,note:e.target.value}))}/></div>
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button onClick={()=>setShowAddLeaveModal(false)} className={`px-4 py-2 text-xs font-bold rounded border ${isDark?"border-zinc-700 text-zinc-400":"border-zinc-200 text-zinc-600"}`}>Cancel</button>
                <button onClick={()=>{if(newLeave.startDate&&newLeave.endDate){addLeaveRequest(newLeave);if(newLeave.status==="Approved")setTimeout(()=>approveLeave(leaveRequests[0]?.id),100);setShowAddLeaveModal(false);}}} className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded shadow">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: ADD/EDIT SHIFT ═══════════════ */}
      {showAddShiftModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${isDark ? "bg-zinc-950/70" : "bg-slate-900/40"}`}>
          <div className={`w-full max-w-md rounded-xl shadow-2xl border ${isDark?"bg-zinc-900 border-zinc-800":"bg-white border-zinc-200"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">{editingShiftId ? "Edit Shift Template" : "New Shift Template"}</h3>
              <button onClick={()=>setShowAddShiftModal(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div><label className={labelCls}>Shift Name</label><input className={inputCls(isDark)} value={newShift.name} onChange={e=>setNewShift(p=>({...p,name:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Start Time</label><input type="time" className={inputCls(isDark)} value={newShift.startTime} onChange={e=>setNewShift(p=>({...p,startTime:e.target.value}))}/></div>
                <div><label className={labelCls}>End Time</label><input type="time" className={inputCls(isDark)} value={newShift.endTime} onChange={e=>setNewShift(p=>({...p,endTime:e.target.value}))}/></div>
              </div>
              <div><label className={labelCls}>Work Days</label>
                <div className="flex gap-1.5 mt-1">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d,i) => {
                  const isActive = newShift.workDays.includes(i);
                  const toggleDay = () => setNewShift(p => {
                    const next = isActive ? p.workDays.filter(x => x !== i) : [...p.workDays, i];
                    return { ...p, workDays: next.slice().sort((a,b) => a - b) };
                  });
                  return (
                    <button key={d} type="button" onClick={toggleDay} className={`px-2 py-1 rounded text-[10px] font-bold border transition ${isActive ? (isDark ? "bg-zinc-700 border-zinc-600 text-white" : "bg-zinc-800 border-zinc-800 text-white") : (isDark ? "border-zinc-700 text-zinc-500" : "border-zinc-200 text-zinc-500")}`}>{d}</button>
                  );
                })}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>OT Threshold (hrs)</label><input type="number" step="0.5" className={inputCls(isDark)} value={newShift.otThresholdHours} onChange={e=>setNewShift(p=>({...p,otThresholdHours:parseFloat(e.target.value)||9}))}/></div>
                <div><label className={labelCls}>OT Multiplier</label><select className={inputCls(isDark)} value={newShift.otMultiplier} onChange={e=>setNewShift(p=>({...p,otMultiplier:parseFloat(e.target.value)}))}><option value="1.5">1.5× (Normal)</option><option value="2">2× (Holiday)</option></select></div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button onClick={()=>setShowAddShiftModal(false)} className={`px-4 py-2 text-xs font-bold rounded border ${isDark?"border-zinc-700 text-zinc-400":"border-zinc-200 text-zinc-600"}`}>Cancel</button>
                <button onClick={()=>{
                  if (newShift.name.trim()) {
                    if (editingShiftId) {
                      updateShift(editingShiftId, newShift);
                    } else {
                      addShift(newShift);
                    }
                    setShowAddShiftModal(false);
                  }
                }} className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded shadow">
                  {editingShiftId ? "Save Changes" : "Create Shift"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ═══════════════ MODAL: ADD HOLIDAY ═══════════════ */}
      {showAddHolidayModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${isDark ? "bg-zinc-950/70" : "bg-slate-900/40"}`}>
          <div className={`w-full max-w-sm rounded-xl shadow-2xl border ${isDark?"bg-zinc-900 border-zinc-800":"bg-white border-zinc-200"}`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Add Public Holiday</h3>
              <button onClick={()=>setShowAddHolidayModal(false)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div><label className={labelCls}>Date</label><input type="date" className={inputCls(isDark)} value={newHoliday.date} onChange={e=>setNewHoliday(p=>({...p,date:e.target.value}))}/></div>
              <div><label className={labelCls}>Holiday Name</label><input className={inputCls(isDark)} value={newHoliday.name} onChange={e=>setNewHoliday(p=>({...p,name:e.target.value}))}/></div>
              <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={newHoliday.isDoubleOT} onChange={e=>setNewHoliday(p=>({...p,isDoubleOT:e.target.checked}))} className="rounded"/>Double OT on this day</label>
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button onClick={()=>setShowAddHolidayModal(false)} className={`px-4 py-2 text-xs font-bold rounded border ${isDark?"border-zinc-700 text-zinc-400":"border-zinc-200 text-zinc-600"}`}>Cancel</button>
                <button onClick={()=>{if(newHoliday.date&&newHoliday.name){addHoliday(newHoliday);setShowAddHolidayModal(false);}}} className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded shadow">Add Holiday</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ PAYSLIP MODAL ═══════════════ */}
      {selectedPaySlip && (() => {
        const calc = payrollCalcs.find(c=>c.employee.id===selectedPaySlip);
        if (!calc) return null;
        const emp = calc.employee;
        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm print:bg-white print:inset-0 ${isDark ? "bg-zinc-950/70" : "bg-slate-900/40"}`}>
            <div className="bg-white text-zinc-900 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl print:shadow-none print:rounded-none">
              <div className="p-6">
                <div className="text-center mb-4 pb-4 border-b-2 border-dashed border-zinc-300">
                  <p className="font-extrabold text-base tracking-wider uppercase text-zinc-900">{companyProfile.clinicName}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{companyProfile.address}</p>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">EPF Reg: {companyProfile.epfRegNo} · Salary Period: {dateRange.startDate} → {dateRange.endDate}</p>
                </div>
                <div className="text-center mb-4">
                  <p className="font-extrabold text-base">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-zinc-500">{emp.role} · Biometric ID: {emp.biometricId}</p>
                </div>
                <div className="space-y-2 text-xs border-t border-dashed border-zinc-300 pt-4 mb-4">
                  {[
                    ["Basic / Session Pay", `LKR ${calc.basicEarnings.toLocaleString()}`],
                    ["Overtime Pay", `LKR ${calc.otPay.toLocaleString()}`],
                    ["Allowances", `LKR ${calc.totalAllowances.toLocaleString()}`],
                    ...(calc.manualBonus > 0 ? [["Manual Addition / Bonus", `+LKR ${calc.manualBonus.toLocaleString()}`]] : []),
                    ["No-Pay Deduction", calc.noPayDeduction > 0 ? `-LKR ${Math.round(calc.noPayDeduction).toLocaleString()}` : "LKR 0"],
                    ...(calc.manualDeduction > 0 ? [["Manual Deduction", `-LKR ${calc.manualDeduction.toLocaleString()}`]] : []),
                    ["EPF Employee 8%", calc.employee.epfEligible ? `-LKR ${Math.round(calc.employeeEpf).toLocaleString()}` : "Exempt"],
                    ["APIT Tax", calc.apitMonthly > 0 ? `-LKR ${Math.round(calc.apitMonthly).toLocaleString()}` : "—"]
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between border-b border-dotted border-zinc-200 pb-1.5">
                      <span className="text-zinc-500">{l}</span>
                      <span className="font-mono font-semibold">{v}</span>
                    </div>
                  ))}
                </div>

                {calc.payslipNote && (
                  <div className="p-2.5 rounded bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-600 mb-4 italic">
                    <span className="font-bold not-italic text-zinc-800">Remark: </span>{calc.payslipNote}
                  </div>
                )}

                <div className="flex justify-between border-t-2 border-dashed border-zinc-300 pt-3 mb-5">
                  <span className="font-extrabold">NET SALARY</span>
                  <span className="font-extrabold text-lg text-indigo-700">LKR {Math.round(calc.netSalary).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 border-t border-dashed border-zinc-200 pt-3">
                  <div><p className="mb-4">___________________</p><p>Authorized Signature</p></div>
                  <div className="text-right"><p className="mb-4">___________________</p><p>Employee Signature</p></div>
                </div>
              </div>
              <div className="flex gap-3 px-6 pb-6">
                <button onClick={() => window.print()} className="flex-1 py-2 text-xs font-bold bg-zinc-900 text-white rounded shadow flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition">
                  <Icons.Printer className="w-4 h-4" />
                  <span>Print Payslip</span>
                </button>
                <button onClick={() => setSelectedPaySlip(null)} className="flex-1 py-2 text-xs font-bold border border-zinc-200 text-zinc-600 rounded hover:bg-zinc-50">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════ MODAL: MANUAL PAYSLIP ADJUSTMENT ═══════════════ */}
      {adjustingPayslipEmpId && (() => {
        const emp = activeEmployees.find(e => e.id === adjustingPayslipEmpId);
        if (!emp) return null;
        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${isDark ? "bg-zinc-950/80" : "bg-slate-900/50"}`}>
            <div className={`w-full max-w-md rounded-xl shadow-2xl border ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Manual Payslip Adjustment</h3>
                  <p className="text-[11px] text-zinc-500">{emp.firstName} {emp.lastName} · {selectedMonth}</p>
                </div>
                <button onClick={() => setAdjustingPayslipEmpId(null)} className="text-zinc-400 hover:text-zinc-800 dark:hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const adjKey = `${selectedMonth}_${emp.id}`;
                  updatePayslipAdjustment(adjKey, {
                    bonusAmount: manualBonusInput,
                    deductionAmount: manualDeductionInput,
                    note: payslipNoteInput.trim(),
                  });
                  setAdjustingPayslipEmpId(null);
                }}
                className="p-6 space-y-4 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Manual Bonus / Addition (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      className={inputCls(isDark)}
                      value={manualBonusInput}
                      onChange={e => setManualBonusInput(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Manual Deduction (LKR)</label>
                    <input
                      type="number"
                      min={0}
                      className={inputCls(isDark)}
                      value={manualDeductionInput}
                      onChange={e => setManualDeductionInput(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Payslip Remark / Reason Note</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Performance Incentive + Cash Advance deduction"
                    className={inputCls(isDark)}
                    value={payslipNoteInput}
                    onChange={e => setPayslipNoteInput(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setAdjustingPayslipEmpId(null)}
                    className={`flex-1 py-2 text-xs font-bold rounded border ${isDark ? "border-zinc-700 text-zinc-400" : "border-zinc-200 text-zinc-600"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded shadow transition"
                  >
                    Save Adjustment
                  </button>
                </div>
              </form>
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
                <Icons.LockClosed className="w-4 h-4 text-indigo-400" />
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
                  className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded shadow transition"
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
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${isDark ? "bg-zinc-950/80" : "bg-slate-900/50"}`}>
            <div className={`w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>Audit Log Event Detail</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"}`}>{log.id}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Recorded on <span className="font-mono text-zinc-400">{log.timestamp}</span></p>
                </div>
                <button onClick={() => setSelectedAuditLogId(null)} className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Action Type</span>
                    <span className="font-bold text-sm text-indigo-500 block mt-0.5">{log.action}</span>
                  </div>
                  <div className={`p-3 rounded-lg border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Target Module</span>
                    <span className={`font-bold text-sm block mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>{log.entity}</span>
                  </div>
                </div>

                <div className={`p-3.5 rounded-lg border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"} space-y-2`}>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Entity ID</span>
                    <span className="font-mono text-indigo-400 font-bold">{log.entityId}</span>
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
                  <div className={`p-3 rounded-lg border font-medium ${isDark ? "bg-zinc-950 border-zinc-800 text-zinc-200" : "bg-zinc-100 border-zinc-200 text-zinc-800"}`}>
                    {log.details}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1.5">Raw Log Event Payload</span>
                  <pre className={`p-3 rounded-lg border font-mono text-[11px] overflow-x-auto ${isDark ? "bg-zinc-950 border-zinc-800 text-emerald-400" : "bg-zinc-900 text-emerald-300 border-zinc-800"}`}>
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
                <button onClick={() => setSelectedAuditLogId(null)} className={`px-4 py-2 text-xs font-bold rounded shadow transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {(() => {
        if (!selectedHistoryPeriodId) return null;
        const period = payrollHistory.find(p => p.id === selectedHistoryPeriodId);
        if (!period) return null;

        return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md ${isDark ? "bg-zinc-950/80" : "bg-slate-900/50"}`}>
            <div className={`w-full max-w-3xl rounded-xl shadow-2xl border overflow-hidden ${isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200"}`}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-extrabold ${isDark ? "text-white" : "text-zinc-900"}`}>{period.label} Payroll Summary</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor(period.status, isDark)}`}>{period.status}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Finalized on <span className="font-mono text-zinc-400">{period.finalizedAt}</span> · {period.employeeCount || activeEmployees.length} Staff Members</p>
                </div>
                <button onClick={() => setSelectedHistoryPeriodId(null)} className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Metrics summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3.5 rounded-lg border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Gross Pool</span>
                    <span className={`text-lg font-extrabold block mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>LKR {period.grossSalaryPool.toLocaleString()}</span>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Net Remittance</span>
                    <span className="text-lg font-extrabold text-indigo-500 block mt-0.5">LKR {period.netRemittances.toLocaleString()}</span>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">EPF (8%+12%)</span>
                    <span className={`text-lg font-extrabold block mt-0.5 ${isDark ? "text-white" : "text-zinc-900"}`}>LKR {period.totalEpf.toLocaleString()}</span>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">ETF (3%)</span>
                    <span className="text-lg font-extrabold text-emerald-500 block mt-0.5">LKR {period.totalEtf.toLocaleString()}</span>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Staff Salary Breakdown</h4>
                  <div className={`rounded-lg border overflow-hidden ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
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
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-500">LKR {net.toLocaleString()}</td>
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
                  <button onClick={downloadPayrollCSV} className={`px-3 py-1.5 text-xs font-bold rounded border flex items-center gap-1.5 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>Export Period CSV</span>
                  </button>
                  <button onClick={downloadEpfFormC} className={`px-3 py-1.5 text-xs font-bold rounded border flex items-center gap-1.5 ${isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700" : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm"}`}>
                    <Icons.Download className="w-3.5 h-3.5" />
                    <span>EPF Form C3</span>
                  </button>
                </div>
                <button onClick={() => setSelectedHistoryPeriodId(null)} className={`px-4 py-2 text-xs font-bold rounded shadow transition ${isDark ? "bg-white text-zinc-900 hover:bg-zinc-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
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
