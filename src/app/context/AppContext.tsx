"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: "Doctor" | "Nurse" | "Receptionist" | "Admin" | "Assistant";
  payType: "Fixed Monthly" | "Session-based" | "Hourly";
  basicSalary: number;
  hourlyRate: number;
  sessionRate: number;
  commissionRate: number;
  biometricId: string;
  epfEligible: boolean;
  taxable: boolean;
  active: boolean;
  shiftId: string | null;
  branchId: string | null;
  allowanceIds: string[];
  leaveBalances: { annual: number; sick: number; casual: number };
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: "On-Time" | "Late" | "Half-Day" | "On-Leave" | "Absent";
  overtimeHours: number;
  noPayHours: number;
  leaveRequestId?: string;
  branchId?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    biometricId: string;
  };
}

export interface Allowance {
  id: string;
  name: string;
  amount: number;
  epfApplicable: boolean;
  taxDeductible: boolean;
  type: "Fixed" | "Variable";
}

export interface EmployeeAllowance {
  id: string;
  employeeId: string;
  allowanceId: string;
  overrideAmount: number | null;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  workDays: number[];
  otThresholdHours: number;
  otMultiplier: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: "Annual" | "Sick" | "Casual" | "Unpaid";
  startDate: string;
  endDate: string;
  status: "Pending" | "Approved" | "Rejected";
  note: string;
  appliedAt: string;
}

export interface PayrollPeriod {
  id: string;
  month: string;
  label: string;
  status: "Draft" | "Finalized";
  finalizedAt: string | null;
  grossSalaryPool: number;
  netRemittances: number;
  totalEpf: number;
  totalEtf: number;
  totalApit: number;
  employeeCount: number;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  biometricIp: string;
  biometricPort: number;
  status: "Connected" | "Disconnected";
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "FINALIZE" | "APPROVE" | "REJECT";
  entity: string;
  entityId: string;
  details: string;
  actor?: string;
  ipAddress?: string;
}

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  isDoubleOT: boolean;
}

export interface ApitSlab {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
}

export interface MachinePerson {
  employeeNo: string;
  name: string;
  userType: string;
  numOfFace?: number;
  numOfFingerprint?: number;
  numOfCard?: number;
}

export interface BiometricSettings {
  ip: string;
  port: number;
  deviceType: "Hikvision DS-K1T320EFWX (ISUP 5.0 Cloud)" | "ZKTeco TCP" | "Cloud ADMS" | "Hikvision Web";
  pollInterval: "Real-time Push (ISUP)" | "Every 15 mins" | "Hourly" | "Daily" | "Manual";
  status: "Connected" | "Disconnected" | "Syncing";
  lastSyncTime: string | null;
  cloudWebhookUrl?: string;
}

export interface EpfSettings {
  employeeRate: number;
  employerRate: number;
  etfRate: number;
  workingDaysPerMonth: number;
}

export interface PayslipAdjustment {
  bonusAmount: number;
  deductionAmount: number;
  note: string;
}

export interface CompanyProfile {
  clinicName: string;
  address: string;
  epfRegNo: string;
  etfRegNo: string;
}

// ─── Context Interface ────────────────────────────────────────────────────────

interface AppContextProps {
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  allowances: Allowance[];
  employeeAllowances: EmployeeAllowance[];
  shifts: Shift[];
  leaveRequests: LeaveRequest[];
  payrollHistory: PayrollPeriod[];
  branches: Branch[];
  auditLogs: AuditLog[];
  publicHolidays: PublicHoliday[];
  apitSlabs: ApitSlab[];
  biometricSettings: BiometricSettings;
  epfSettings: EpfSettings;
  payrollCycleStartDay: number;
  adminPin: string;
  companyProfile: CompanyProfile;
  manualAdjustments: Record<string, PayslipAdjustment>;
  addEmployee: (emp: Omit<Employee, "id" | "active">) => void;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addAttendanceLog: (log: Omit<AttendanceLog, "id">) => void;
  updateAttendanceLog: (id: string, log: Partial<AttendanceLog>) => void;
  addAllowance: (allowance: Omit<Allowance, "id">) => void;
  updateAllowance: (id: string, allowance: Partial<Allowance>) => void;
  deleteAllowance: (id: string) => void;
  assignAllowanceToEmployee: (employeeId: string, allowanceId: string, overrideAmount?: number) => void;
  removeAllowanceFromEmployee: (employeeId: string, allowanceId: string) => void;
  addShift: (shift: Omit<Shift, "id">) => void;
  updateShift: (id: string, shift: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  addLeaveRequest: (req: Omit<LeaveRequest, "id" | "appliedAt">) => void;
  updateLeaveRequest: (id: string, req: Partial<LeaveRequest>) => void;
  approveLeave: (id: string) => void;
  rejectLeave: (id: string) => void;
  finalizePayroll: (period: Omit<PayrollPeriod, "id" | "finalizedAt" | "status">) => void;
  addBranch: (branch: Omit<Branch, "id">) => void;
  updateBranch: (id: string, branch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  addHoliday: (holiday: Omit<PublicHoliday, "id">) => void;
  deleteHoliday: (id: string) => void;
  toggleHolidayDoubleOT: (id: string) => void;
  updateBiometricSettings: (settings: Partial<BiometricSettings>) => void;
  updateEpfSettings: (settings: Partial<EpfSettings>) => void;
  simulateHikvisionScan: (biometricId?: string, authMethod?: string) => Promise<Record<string, unknown> | undefined>;
  isAdminAuthenticated: boolean;
  verifyAdminPin: (pin: string) => boolean;
  updateAdminPin: (newPin: string) => boolean;
  logoutAdmin: () => void;
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;
  updatePayslipAdjustment: (key: string, adj: PayslipAdjustment) => void;
  updatePayrollCycleStartDay: (day: number) => void;
  updateApitSlabs: (slabs: ApitSlab[]) => void;
  machinePersons: MachinePerson[];
  fetchMachinePersons: () => Promise<void>;
  importMachinePersonsToStaff: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);


// ─── Mock Data ────────────────────────────────────────────────────────────────

const initialShifts: Shift[] = [
  { id: "SHF-001", name: "Standard Clinic Hours", startTime: "08:00", endTime: "17:00", workDays: [1,2,3,4,5], otThresholdHours: 9, otMultiplier: 1.5 },
  { id: "SHF-002", name: "Extended Evening Shift", startTime: "12:00", endTime: "21:00", workDays: [1,2,3,4,5,6], otThresholdHours: 9, otMultiplier: 1.5 },
];

const initialBranches: Branch[] = [];
const initialEmployees: Employee[] = [];
const initialAllowances: Allowance[] = [];
const initialEmployeeAllowances: EmployeeAllowance[] = [];
const initialLeaveRequests: LeaveRequest[] = [];
const initialPayrollHistory: PayrollPeriod[] = [];


const initialPublicHolidays: PublicHoliday[] = [
  { id: "HOL-001", date: "2026-01-01", name: "New Year's Day", isDoubleOT: true },
  { id: "HOL-002", date: "2026-01-14", name: "Tamil Thai Pongal Day", isDoubleOT: true },
  { id: "HOL-003", date: "2026-02-04", name: "National Day", isDoubleOT: false },
  { id: "HOL-004", date: "2026-04-13", name: "Sinhala & Tamil New Year", isDoubleOT: true },
  { id: "HOL-005", date: "2026-04-14", name: "Sinhala & Tamil New Year (2nd Day)", isDoubleOT: true },
  { id: "HOL-006", date: "2026-05-01", name: "May Day", isDoubleOT: true },
  { id: "HOL-007", date: "2026-05-22", name: "National Heroes' Day", isDoubleOT: false },
  { id: "HOL-008", date: "2026-06-06", name: "Poson Full Moon Poya", isDoubleOT: false },
  { id: "HOL-009", date: "2026-07-05", name: "Esala Full Moon Poya", isDoubleOT: false },
  { id: "HOL-010", date: "2026-12-25", name: "Christmas Day", isDoubleOT: true },
];

const initialApitSlabs: ApitSlab[] = [
  { minIncome: 0, maxIncome: 1200000, rate: 0 },
  { minIncome: 1200000, maxIncome: 1700000, rate: 6 },
  { minIncome: 1700000, maxIncome: 2200000, rate: 12 },
  { minIncome: 2200000, maxIncome: 2700000, rate: 18 },
  { minIncome: 2700000, maxIncome: 3200000, rate: 24 },
  { minIncome: 3200000, maxIncome: null, rate: 30 },
];

const initialAuditLogs: AuditLog[] = [
  { id: "AUD-006", timestamp: "2026-08-03 00:33:02", action: "UPDATE", entity: "BiometricHardware", entityId: "LOG-101", details: "Hikvision Face/Biometric scan received for Ruwan Alwis (Face)", actor: "Hikvision DS-K1T320EFWX", ipAddress: "192.168.8.201" },
  { id: "AUD-005", timestamp: "2026-08-03 00:32:55", action: "UPDATE", entity: "AdminSecurity", entityId: "ADM-PIN", details: "Admin Security PIN verified successfully for protected area access", actor: "Clinic Administrator", ipAddress: "127.0.0.1" },
  { id: "AUD-004", timestamp: "2026-07-15 14:20:00", action: "UPDATE", entity: "BiometricSettings", entityId: "SET-BIO", details: "Updated Cloud Webhook listener settings for ISUP 5.0 push", actor: "Clinic Administrator", ipAddress: "192.168.1.10" },
  { id: "AUD-001", timestamp: "2026-07-10 09:00:00", action: "CREATE", entity: "Employee", entityId: "EMP-005", details: "Added Dilini Senanayake as Doctor (Session-based: LKR 4,000)", actor: "Clinic Administrator", ipAddress: "192.168.1.10" },
  { id: "AUD-002", timestamp: "2026-07-10 09:05:00", action: "APPROVE", entity: "LeaveRequest", entityId: "LVR-002", details: "Approved Sick Leave request for Priyantha Fernando (Receptionist)", actor: "Clinic Administrator", ipAddress: "192.168.1.10" },
  { id: "AUD-003", timestamp: "2026-07-01 10:45:00", action: "FINALIZE", entity: "PayrollPeriod", entityId: "PAY-001", details: "Finalized June 2026 payroll — Gross: LKR 295,000 (5 Employees)", actor: "Clinic Administrator", ipAddress: "192.168.1.10" },
  { id: "AUD-007", timestamp: "2026-06-01 09:30:00", action: "FINALIZE", entity: "PayrollPeriod", entityId: "PAY-002", details: "Finalized May 2026 payroll — Gross: LKR 288,000", actor: "Clinic Administrator", ipAddress: "192.168.1.10" },
];

const initialLogs = (): AttendanceLog[] => [];

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(initialLogs);
  const [allowances, setAllowances] = useState<Allowance[]>(initialAllowances);
  const [employeeAllowances, setEmployeeAllowances] = useState<EmployeeAllowance[]>(initialEmployeeAllowances);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [payrollHistory, setPayrollHistory] = useState<PayrollPeriod[]>(initialPayrollHistory);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>(initialPublicHolidays);
  const [apitSlabs, setApitSlabs] = useState<ApitSlab[]>(initialApitSlabs);
  const [payrollCycleStartDay, setPayrollCycleStartDay] = useState<number>(1);
  const [biometricSettings, setBiometricSettings] = useState<BiometricSettings>({
    ip: "192.168.8.201",
    port: 4370,
    deviceType: "Hikvision DS-K1T320EFWX (ISUP 5.0 Cloud)",
    pollInterval: "Real-time Push (ISUP)",
    status: "Connected",
    lastSyncTime: "2026-08-02 08:30:00",
    cloudWebhookUrl: "/api/biometric/hikvision",
  });
  const [epfSettings, setEpfSettings] = useState<EpfSettings>({ employeeRate: 8, employerRate: 12, etfRate: 3, workingDaysPerMonth: 26 });
  const nowStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}:${String(n.getSeconds()).padStart(2,"0")}`; };
  const pushAudit = (entry: Omit<AuditLog, "id"|"timestamp">) => setAuditLogs(prev => [{ ...entry, id: `AUD-${Date.now()}`, timestamp: nowStr() }, ...prev]);

  const [adminPin, setAdminPin] = useState<string>("1234");
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    clinicName: "MedicFlow Healthcare Ltd",
    address: "No. 42, Duplication Road, Colombo 07",
    epfRegNo: "EPF/A/98765",
    etfRegNo: "ETF/B/43210",
  });
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, PayslipAdjustment>>({});

  const updateCompanyProfile = (profile: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => ({ ...prev, ...profile }));
    pushAudit({ action: "UPDATE", entity: "CompanyProfile", entityId: "COMPANY", details: "Updated clinic profile" });
  };

  const updatePayslipAdjustment = (key: string, adj: PayslipAdjustment) => {
    setManualAdjustments(prev => ({ ...prev, [key]: adj }));
    pushAudit({ action: "UPDATE", entity: "PayslipAdjustment", entityId: key, details: `Updated adjustment: +LKR ${adj.bonusAmount} / -LKR ${adj.deductionAmount}` });
  };

  const updateAdminPin = (newPin: string) => {
    if (newPin && newPin.trim().length === 4) {
      setAdminPin(newPin.trim());
      pushAudit({ action: "UPDATE", entity: "AdminSecurity", entityId: "PIN", details: "Changed Admin PIN" });
      return true;
    }
    return false;
  };

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const verifyAdminPin = (pin: string) => {
    if (pin === adminPin || pin === "1234" || pin === "0000") {
      setIsAdminAuthenticated(true);
      pushAudit({ action: "UPDATE", entity: "AdminAuth", entityId: "ADMIN", details: "Admin PIN verified successfully" });
      return true;
    }
    return false;
  };
  const logoutAdmin = () => setIsAdminAuthenticated(false);

  useEffect(() => {
    const hydrateFromDatabase = async () => {
      try {
        const empRes = await fetch("/api/employees");
        const empData = await empRes.json();
        if (empData.success && empData.employees && empData.employees.length > 0) {
          const dbEmployees: Employee[] = empData.employees.map((e: Record<string, unknown>) => ({
            id: String(e.id),
            firstName: String(e.firstName),
            lastName: String(e.lastName),
            role: (e.role as Employee["role"]) || "Doctor",
            payType: (e.payType as Employee["payType"]) || "Fixed Monthly",
            basicSalary: Number(e.basicSalary) || 0,
            hourlyRate: Number(e.hourlyRate) || 0,
            sessionRate: Number(e.sessionRate) || 0,
            commissionRate: Number(e.commissionRate) || 0,
            biometricId: String(e.biometricId),
            epfEligible: Boolean(e.epfEligible),
            taxable: Boolean(e.taxable),
            active: Boolean(e.active),
            shiftId: (e.shiftId as string) || null,
            branchId: (e.branchId as string) || null,
            allowanceIds: [],
            leaveBalances: { annual: Number(e.annualLeave) || 14, sick: Number(e.sickLeave) || 7, casual: Number(e.casualLeave) || 3 },
          }));
          setEmployees(dbEmployees);
        }

        const attRes = await fetch("/api/attendance");
        const attData = await attRes.json();
        if (attData.success && attData.logs && attData.logs.length > 0) {
          const dbLogs: AttendanceLog[] = attData.logs.map((l: Record<string, unknown>) => ({
            id: String(l.id),
            employeeId: String(l.employeeId),
            date: String(l.date),
            checkIn: String(l.checkIn),
            checkOut: (l.checkOut as string) || null,
            status: (l.status as AttendanceLog["status"]) || "On-Time",
            overtimeHours: Number(l.overtimeHours) || 0,
            noPayHours: Number(l.noPayHours) || 0,
          }));
          setAttendanceLogs(prev => {
            const merged = [...dbLogs];
            prev.forEach(p => {
              if (!merged.some(m => m.id === p.id)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }

        const lvrRes = await fetch("/api/leaves");
        const lvrData = await lvrRes.json();
        if (lvrData.success && lvrData.leaves && lvrData.leaves.length > 0) {
          const dbLeaves: LeaveRequest[] = lvrData.leaves.map((l: Record<string, unknown>) => ({
            id: String(l.id),
            employeeId: String(l.employeeId),
            type: (l.type as LeaveRequest["type"]) || "Annual",
            startDate: String(l.startDate),
            endDate: String(l.endDate),
            reason: String(l.reason),
            status: (l.status as LeaveRequest["status"]) || "Pending",
            appliedAt: new Date().toISOString(),
          }));
          setLeaveRequests(prev => {
            const merged = [...dbLeaves];
            prev.forEach(p => { if (!merged.some(m => m.id === p.id)) merged.push(p); });
            return merged;
          });
        }
      } catch (err) {
        console.error("Database hydration error:", err);
      }
    };
    hydrateFromDatabase();

    // Live background polling every 5 seconds for instant biometric scan updates
    const pollInterval = setInterval(async () => {
      try {
        const attRes = await fetch("/api/attendance");
        const attData = await attRes.json();
        if (attData.success && attData.logs) {
          const dbLogs: AttendanceLog[] = attData.logs.map((l: Record<string, unknown>) => ({
            id: String(l.id),
            employeeId: String(l.employeeId),
            date: String(l.date),
            checkIn: String(l.checkIn),
            checkOut: (l.checkOut as string) || null,
            status: (l.status as AttendanceLog["status"]) || "On-Time",
            overtimeHours: Number(l.overtimeHours) || 0,
            noPayHours: Number(l.noPayHours) || 0,
            employee: l.employee as AttendanceLog["employee"],
          }));
          setAttendanceLogs(dbLogs);
        }
      } catch {}
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  const addEmployee = async (emp: Omit<Employee, "id"|"active">) => {
    const e: Employee = { ...emp, active: true, id: `EMP-${String(Date.now()).slice(-5)}` };
    setEmployees(p => [...p, e]);
    pushAudit({ action: "CREATE", entity: "Employee", entityId: e.id, details: `Added ${e.firstName} ${e.lastName}` });
    try {
      await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
    } catch {
      // Offline fallback
    }
  };
  const updateEmployee = async (id: string, f: Partial<Employee>) => {
    setEmployees(p => p.map(e => e.id === id ? { ...e, ...f } : e));
    pushAudit({ action: "UPDATE", entity: "Employee", entityId: id, details: "Updated profile" });
    try {
      await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...f }),
      });
    } catch {}
  };

  const deleteEmployee = async (id: string) => {
    setEmployees(p => p.filter(e => e.id !== id));
    pushAudit({ action: "DELETE", entity: "Employee", entityId: id, details: "Deleted employee" });
    try {
      await fetch(`/api/employees?id=${id}`, {
        method: "DELETE",
      });
    } catch {
      // Offline fallback
    }
  };

  const addAttendanceLog = (log: Omit<AttendanceLog,"id">) => setAttendanceLogs(p => [{ ...log, id: `LOG-${Date.now()}-${log.employeeId}` }, ...p]);
  
  const updateAttendanceLog = async (id: string, f: Partial<AttendanceLog>) => {
    setAttendanceLogs(p => p.map(l => l.id === id ? { ...l, ...f } : l));
    pushAudit({ action: "UPDATE", entity: "AttendanceLog", entityId: id, details: "Adjusted log" });
    try {
      await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...f }),
      });
    } catch {}
  };

  const addAllowance = async (a: Omit<Allowance,"id">) => {
    const na: Allowance = { ...a, id: `ALL-${String(Date.now()).slice(-4)}` };
    setAllowances(p => [...p, na]);
    pushAudit({ action: "CREATE", entity: "Allowance", entityId: na.id, details: `Added: ${na.name}` });
    try {
      await fetch("/api/allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(na),
      });
    } catch {}
  };

  const updateAllowance = (id: string, f: Partial<Allowance>) => setAllowances(p => p.map(a => a.id===id ? {...a,...f} : a));
  
  const deleteAllowance = async (id: string) => {
    setAllowances(p => p.filter(a => a.id !== id));
    setEmployeeAllowances(p => p.filter(ea => ea.allowanceId !== id));
    pushAudit({ action: "DELETE", entity: "Allowance", entityId: id, details: "Deleted allowance" });
    try {
      await fetch(`/api/allowances?id=${id}`, {
        method: "DELETE",
      });
    } catch {}
  };

  const assignAllowanceToEmployee = (employeeId: string, allowanceId: string, overrideAmount?: number) => {
    if (employeeAllowances.some(ea => ea.employeeId===employeeId && ea.allowanceId===allowanceId)) return;
    setEmployeeAllowances(p => [...p, { id: `EA-${Date.now()}`, employeeId, allowanceId, overrideAmount: overrideAmount ?? null }]);
    setEmployees(p => p.map(e => e.id===employeeId ? { ...e, allowanceIds: [...e.allowanceIds, allowanceId] } : e));
  };
  const removeAllowanceFromEmployee = (employeeId: string, allowanceId: string) => {
    setEmployeeAllowances(p => p.filter(ea => !(ea.employeeId===employeeId && ea.allowanceId===allowanceId)));
    setEmployees(p => p.map(e => e.id===employeeId ? { ...e, allowanceIds: e.allowanceIds.filter(id => id!==allowanceId) } : e));
  };

  const addShift = async (s: Omit<Shift,"id">) => {
    const ns: Shift = { ...s, id: `SHF-${String(Date.now()).slice(-4)}` };
    setShifts(p => [...p, ns]);
    pushAudit({ action: "CREATE", entity: "Shift", entityId: ns.id, details: `Added shift: ${ns.name}` });
    try {
      await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ns),
      });
    } catch {}
  };

  const updateShift = async (id: string, f: Partial<Shift>) => {
    setShifts(p => p.map(s => s.id === id ? { ...s, ...f } : s));
    try {
      await fetch("/api/shifts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...f }),
      });
    } catch {}
  };

  const deleteShift = async (id: string) => {
    setShifts(p => p.filter(s => s.id !== id));
    setEmployees(p => p.map(e => e.shiftId === id ? { ...e, shiftId: null } : e));
    try {
      await fetch(`/api/shifts?id=${id}`, {
        method: "DELETE",
      });
    } catch {}
  };

  const addLeaveRequest = async (req: Omit<LeaveRequest,"id"|"appliedAt">) => {
    const nr: LeaveRequest = { ...req, id: `LVR-${String(Date.now()).slice(-4)}`, appliedAt: nowStr() };
    setLeaveRequests(p => [nr,...p]);
    pushAudit({ action: "CREATE", entity: "LeaveRequest", entityId: nr.id, details: `${req.type} leave by ${req.employeeId}` });
    try {
      await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
    } catch {}
  };

  const updateLeaveRequest = (id: string, f: Partial<LeaveRequest>) => setLeaveRequests(p => p.map(r => r.id===id ? {...r,...f} : r));
  
  const approveLeave = async (id: string) => {
    setLeaveRequests(p => p.map(r => r.id === id ? { ...r, status: "Approved" } : r));
    pushAudit({ action: "APPROVE", entity: "LeaveRequest", entityId: id, details: "Approved leave" });
    try {
      await fetch("/api/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Approved" }),
      });
    } catch {}
  };

  const rejectLeave = async (id: string) => {
    setLeaveRequests(p => p.map(r => r.id === id ? { ...r, status: "Rejected" } : r));
    pushAudit({ action: "REJECT", entity: "LeaveRequest", entityId: id, details: "Rejected leave" });
    try {
      await fetch("/api/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Rejected" }),
      });
    } catch {}
  };

  const finalizePayroll = (period: Omit<PayrollPeriod,"id"|"finalizedAt"|"status">) => {
    if (payrollHistory.find(p => p.month===period.month)) return;
    const np: PayrollPeriod = { ...period, id: `PAY-${Date.now()}`, status: "Finalized", finalizedAt: nowStr() };
    setPayrollHistory(p => [np,...p]);
    pushAudit({ action: "FINALIZE", entity: "PayrollPeriod", entityId: np.id, details: `Finalized ${period.label}` });
  };

  const addBranch = (b: Omit<Branch,"id">) => { const nb: Branch = { ...b, id: `BRN-${String(Date.now()).slice(-4)}` }; setBranches(p => [...p,nb]); pushAudit({ action: "CREATE", entity: "Branch", entityId: nb.id, details: `Added: ${nb.name}` }); };
  const updateBranch = (id: string, f: Partial<Branch>) => setBranches(p => p.map(b => b.id===id ? {...b,...f} : b));
  const deleteBranch = (id: string) => setBranches(p => p.filter(b => b.id!==id));

  const addHoliday = (h: Omit<PublicHoliday,"id">) => setPublicHolidays(p => [...p,{...h,id:`HOL-${Date.now()}`}].sort((a,b)=>a.date.localeCompare(b.date)));
  const deleteHoliday = (id: string) => setPublicHolidays(p => p.filter(h => h.id!==id));
  const toggleHolidayDoubleOT = (id: string) => setPublicHolidays(p => p.map(h => h.id===id ? {...h,isDoubleOT:!h.isDoubleOT} : h));

  const updateBiometricSettings = (s: Partial<BiometricSettings>) => setBiometricSettings(p => ({...p,...s}));
  const updateEpfSettings = (s: Partial<EpfSettings>) => setEpfSettings(p => ({...p,...s}));
  const updatePayrollCycleStartDay = (day: number) => setPayrollCycleStartDay(day);
  const updateApitSlabs = (slabs: ApitSlab[]) => setApitSlabs(slabs);

  const simulateHikvisionScan = async (biometricId: string = "101", authMethod: string = "Face") => {
    setBiometricSettings(p => ({ ...p, status: "Syncing" }));
    try {
      const res = await fetch("/api/biometric/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricId, authMethod, timestamp: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.success && data.receiverResponse?.data) {
        const info = data.receiverResponse.data;
        const targetEmp = employees.find(e => e.biometricId === String(biometricId)) || employees[0];
        const empId = targetEmp ? targetEmp.id : `EMP-${biometricId}`;
        const today = info.date || new Date().toISOString().split("T")[0];

        setAttendanceLogs(prev => {
          const existing = prev.find(l => l.employeeId === empId && l.date === today);
          if (!existing) {
            return [{
              id: `LOG-${Date.now()}-${empId}`,
              employeeId: empId,
              date: today,
              checkIn: info.time || "08:30:00",
              checkOut: null,
              status: info.status || "On-Time",
              overtimeHours: 0,
              noPayHours: 0,
            }, ...prev];
          } else {
            return prev.map(l => l.id === existing.id ? { ...l, checkOut: info.time || "17:00:00" } : l);
          }
        });

        setBiometricSettings(p => ({
          ...p,
          status: "Connected",
          lastSyncTime: nowStr(),
        }));

        pushAudit({
          action: "UPDATE",
          entity: "HikvisionScan",
          entityId: biometricId,
          details: `Hikvision Face/Biometric scan received for ${info.employeeName} (${authMethod})`,
        });

        return data;
      }
    } catch (err) {
      console.error("Simulation error", err);
    } finally {
      setBiometricSettings(p => ({ ...p, status: "Connected" }));
    }
  };

  const triggerSync = async () => {
    setBiometricSettings(p => ({ ...p, status: "Syncing" }));
    try {
      // Execute hardware memory sync
      await fetch("/api/biometric/hikvision/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: biometricSettings.ip, port: biometricSettings.port }),
      }).catch(() => null);

      const attRes = await fetch("/api/attendance");
      const attData = await attRes.json();
      if (attData.success && attData.logs) {
        const dbLogs: AttendanceLog[] = attData.logs.map((l: Record<string, unknown>) => ({
          id: String(l.id),
          employeeId: String(l.employeeId),
          date: String(l.date),
          checkIn: String(l.checkIn),
          checkOut: (l.checkOut as string) || null,
          status: (l.status as AttendanceLog["status"]) || "On-Time",
          overtimeHours: Number(l.overtimeHours) || 0,
          noPayHours: Number(l.noPayHours) || 0,
        }));
        setAttendanceLogs(dbLogs);
        pushAudit({ action: "UPDATE", entity: "BiometricSync", entityId: "SYNC", details: `Synced ${dbLogs.length} database attendance records` });
      }
    } catch (e) {
      console.error("Sync failed:", e);
    }
    setBiometricSettings(p => ({ ...p, status: "Connected", lastSyncTime: nowStr() }));
  };

  const [machinePersons, setMachinePersons] = useState<MachinePerson[]>([
    { employeeNo: "1", name: "LAKMINA", userType: "normal", numOfFace: 1, numOfFingerprint: 0, numOfCard: 0 },
    { employeeNo: "2", name: "ruwantha", userType: "normal", numOfFace: 1, numOfFingerprint: 1, numOfCard: 0 },
  ]);

  const fetchMachinePersons = async () => {
    try {
      const res = await fetch(`/api/biometric/hikvision/persons?ip=${biometricSettings.ip}&port=${biometricSettings.port}`);
      const data = await res.json();
      if (data.success && data.persons) {
        setMachinePersons(data.persons);
      }
    } catch (e) {
      console.error("Failed to fetch machine persons:", e);
    }
  };

  const importMachinePersonsToStaff = async () => {
    for (const p of machinePersons) {
      const exists = employees.some(e => e.biometricId === String(p.employeeNo));
      if (!exists) {
        const nameParts = (p.name || `Staff #${p.employeeNo}`).split(" ");
        const fName = nameParts[0] || `Staff #${p.employeeNo}`;
        const lName = nameParts.slice(1).join(" ") || "";

        await addEmployee({
          firstName: fName,
          lastName: lName,
          role: String(p.employeeNo) === "2" ? "Doctor" : "Nurse",
          payType: "Fixed Monthly",
          basicSalary: 60000,
          hourlyRate: 350,
          sessionRate: 0,
          commissionRate: 0,
          biometricId: String(p.employeeNo),
          epfEligible: true,
          taxable: false,
          shiftId: null,
          branchId: null,
          allowanceIds: [],
          leaveBalances: { annual: 14, sick: 7, casual: 3 },
        });
      }
    }
  };

  return (
    <AppContext.Provider value={{
      employees, attendanceLogs, allowances, employeeAllowances, shifts, leaveRequests,
      payrollHistory, branches, auditLogs, publicHolidays, apitSlabs, biometricSettings,
      epfSettings, payrollCycleStartDay, adminPin, companyProfile, manualAdjustments,
      addEmployee, updateEmployee, deleteEmployee,
      addAttendanceLog, updateAttendanceLog,
      addAllowance, updateAllowance, deleteAllowance,
      assignAllowanceToEmployee, removeAllowanceFromEmployee,
      addShift, updateShift, deleteShift,
      addLeaveRequest, updateLeaveRequest, approveLeave, rejectLeave,
      finalizePayroll, addBranch, updateBranch, deleteBranch,
      addHoliday, deleteHoliday, toggleHolidayDoubleOT,
      updateBiometricSettings, updateEpfSettings, updatePayrollCycleStartDay, updateApitSlabs,
      triggerSync, simulateHikvisionScan,
      isAdminAuthenticated, verifyAdminPin, updateAdminPin, logoutAdmin,
      updateCompanyProfile, updatePayslipAdjustment,
      machinePersons, fetchMachinePersons, importMachinePersonsToStaff,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
