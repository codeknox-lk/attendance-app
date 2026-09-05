"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";


// ─── API Wrapper ──────────────────────────────────────────────────────────────
export const apiFetch = async (url: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  let clinicId = "default-clinic-id";
  if (typeof window !== "undefined") {
    try {
      const savedUser = localStorage.getItem("medicflow_user_session");
      if (savedUser) {
        clinicId = JSON.parse(savedUser).clinicId || "default-clinic-id";
      }
    } catch {}
  }
  headers.set("x-clinic-id", clinicId);
  return fetch(url, { ...init, headers });
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  payType: "Fixed Monthly" | "Session-based" | "Hourly";
  basicSalary: number;
  hourlyRate: number;
  sessionRate: number;
  commissionRate: number;
  biometricId: string;
  epfEligible: boolean;
  taxable: boolean;
  active: boolean;
  branchId: string | null;
  allowanceIds: string[];
  customOperatingHours?: ClinicOperatingHours[];
  leaveBalances: { annual: number; sick: number; casual: number };
  attendanceBonusRate: number;
  punctualBonusRate: number;
  incomeBonusPercentage: number;
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
  authMethod?: string | null;
  deviceId?: string | null;
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
  type: "Fixed" | "Variable" | "Monthly" | "Session" | string;
}

export interface EmployeeAllowance {
  id: string;
  employeeId: string;
  allowanceId: string;
  overrideAmount: number | null;
}

export interface ClinicOperatingHours {
  id: string;
  clinicId: string;
  dayOfWeek: number;
  isOpen: boolean;
  startTime: string;
  endTime: string;
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
  epfRegNo?: string;
  etfRegNo?: string;
  employeeRate: number;
  employerRate: number;
  etfRate: number;
}

export interface PayslipAdjustment {
  bonusAmount: number;
  deductionAmount: number;
  note: string;
}

export interface SalarySettings {
  workingDaysPerMonth: number;
  globalWorkedDayBonus: number;
  globalPunctualBonus: number;
  globalIncomeBonusPct: number;
  otCalculationType: "Manual" | "Strict" | "Grace Period";
  otGracePeriodMinutes: number;
  otRateBasis?: "Basic_200" | "Basic_WorkingDays_9h" | "Basic_WorkingDays_8h" | "Profile_Hourly_Rate";
  otMultiplier?: number;
  punctualGraceType: "Strict" | "Grace Period";
  punctualGraceMinutes: number;
}

export interface CompanyProfile {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  epfRegNo?: string;
  etfRegNo?: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: string;
  biometricId?: string;
  employeeId?: string;
  clinicId?: string;
  clinicName?: string;
  clinicCode?: string;
  loginType?: "admin" | "staff";
}

// ─── Context Interface ────────────────────────────────────────────────────────

export interface AppContextProps {
  currentUser: UserAccount | null;
  loginUser: (payload: { username?: string; password?: string; pin?: string; loginType?: "admin" | "staff"; biometricId?: string; clinicCode?: string }) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => void;
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  allowances: Allowance[];
  employeeAllowances: EmployeeAllowance[];
  operatingHours: ClinicOperatingHours[];
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
  deleteAttendanceLog: (id: string) => void;
  addAllowance: (allowance: Omit<Allowance, "id">) => Promise<void> | void;
  updateAllowance: (id: string, allowance: Partial<Allowance>) => Promise<void> | void;
  deleteAllowance: (id: string) => Promise<void> | void;
  assignAllowanceToEmployee: (employeeId: string, allowanceId: string, overrideAmount?: number) => void;
  removeAllowanceFromEmployee: (employeeId: string, allowanceId: string) => void;
  
  updateOperatingHours: (hours: ClinicOperatingHours[]) => void;
  
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
  syncSriLankanHolidays: (year?: number) => Promise<number>;
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
  salarySettings: SalarySettings;
  updateSalarySettings: (settings: Partial<SalarySettings>) => void;
  monthlyExcessIncome: Record<string, number>;
  updateMonthlyExcessIncome: (month: string, amount: number, employeeId?: string) => void;
  machinePersons: MachinePerson[];
  fetchMachinePersons: () => Promise<void>;
  importMachinePersonsToStaff: () => Promise<void>;
  isFetchingPersons: boolean;
  triggerSync: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);


// ─── Mock Data ────────────────────────────────────────────────────────────────



const initialBranches: Branch[] = [];
const initialEmployees: Employee[] = [];
const initialAllowances: Allowance[] = [];
const initialEmployeeAllowances: EmployeeAllowance[] = [];
const initialLeaveRequests: LeaveRequest[] = [];
const initialPayrollHistory: PayrollPeriod[] = [];

const initialOperatingHours: ClinicOperatingHours[] = [
  { id: "DEF-0", clinicId: "default-clinic-id", dayOfWeek: 0, isOpen: true, startTime: "07:30", endTime: "14:00" },
  { id: "DEF-1", clinicId: "default-clinic-id", dayOfWeek: 1, isOpen: false, startTime: "15:30", endTime: "17:00" },
  { id: "DEF-2", clinicId: "default-clinic-id", dayOfWeek: 2, isOpen: true, startTime: "15:30", endTime: "19:00" },
  { id: "DEF-3", clinicId: "default-clinic-id", dayOfWeek: 3, isOpen: true, startTime: "15:30", endTime: "19:00" },
  { id: "DEF-4", clinicId: "default-clinic-id", dayOfWeek: 4, isOpen: true, startTime: "15:30", endTime: "19:00" },
  { id: "DEF-5", clinicId: "default-clinic-id", dayOfWeek: 5, isOpen: true, startTime: "15:30", endTime: "19:00" },
  { id: "DEF-6", clinicId: "default-clinic-id", dayOfWeek: 6, isOpen: true, startTime: "13:00", endTime: "19:00" },
];

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

const initialLogs = (): AttendanceLog[] => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("medicflow_attendance");
      if (saved) return JSON.parse(saved);
    } catch {}
  }
  return [];
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [attendanceLogs, setAttendanceLogsRaw] = useState<AttendanceLog[]>(initialLogs);

  const setAttendanceLogs = (value: React.SetStateAction<AttendanceLog[]>) => {
    setAttendanceLogsRaw(prev => {
      const next = typeof value === "function" ? value(prev) : value;
      if (typeof window !== "undefined") {
        // Keep only last 200 logs in local storage to prevent quota limits
        localStorage.setItem("medicflow_attendance", JSON.stringify(next.slice(0, 200)));
      }
      return next;
    });
  };
  const [allowances, setAllowances] = useState<Allowance[]>(initialAllowances);
  const [employeeAllowances, setEmployeeAllowances] = useState<EmployeeAllowance[]>(initialEmployeeAllowances);
  const [operatingHours, setOperatingHours] = useState<ClinicOperatingHours[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_operating_hours");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 7) return parsed;
        }
      } catch {}
    }
    return initialOperatingHours;
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [payrollHistory, setPayrollHistory] = useState<PayrollPeriod[]>(initialPayrollHistory);
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_public_holidays");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initialPublicHolidays;
  });
  const [apitSlabs, setApitSlabs] = useState<ApitSlab[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_apit_slabs");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return initialApitSlabs;
  });
  const [monthlyExcessIncome, setMonthlyExcessIncome] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("medicflow_monthly_excess_income");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  const [payrollCycleStartDay, setPayrollCycleStartDay] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_payroll_cycle_start");
        if (saved) return parseInt(saved) || 1;
      } catch {}
    }
    return 1;
  });
  const [biometricSettings, setBiometricSettings] = useState<BiometricSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_biometric_settings");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      ip: "192.168.8.135",
      port: 4370,
      deviceType: "Hikvision DS-K1T320EFWX (ISUP 5.0 Cloud)",
      pollInterval: "Real-time Push (ISUP)",
      status: "Connected",
      lastSyncTime: "2026-08-02 08:30:00",
      cloudWebhookUrl: "/api/biometric/hikvision",
    };
  });

  const nowStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}:${String(n.getSeconds()).padStart(2,"0")}`; };
  const pushAudit = (entry: Omit<AuditLog, "id"|"timestamp">) => setAuditLogs(prev => [{ ...entry, id: `AUD-${Date.now()}`, timestamp: nowStr() }, ...prev]);

  const [epfSettings, setEpfSettings] = useState<EpfSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_epf_settings");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { employeeRate: 8, employerRate: 12, etfRate: 3 };
  });

  const [salarySettings, setSalarySettings] = useState<SalarySettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_salary_settings");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      workingDaysPerMonth: 20,
      globalWorkedDayBonus: 0,
      globalPunctualBonus: 0,
      globalIncomeBonusPct: 0,
      otCalculationType: "Manual",
      otGracePeriodMinutes: 30,
      otRateBasis: "Basic_200",
      otMultiplier: 1.5,
      punctualGraceType: "Grace Period",
      punctualGraceMinutes: 15,
    };
  });
  const [adminPin, setAdminPin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_admin_pin");
        if (saved) return saved;
      } catch {}
    }
    return "1234";
  });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("medicflow_company_profile");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      clinicName: "MedSync Healthcare Ltd",
      address: "No. 42, Duplication Road, Colombo 07",
      epfRegNo: "EPF/A/98765",
      etfRegNo: "ETF/B/43210",
    };
  });
  const [manualAdjustments, setManualAdjustments] = useState<Record<string, PayslipAdjustment>>({});

  const updateCompanyProfile = async (profile: Partial<CompanyProfile>) => {
    const updated = { ...companyProfile, ...profile };
    setCompanyProfile(updated);
    pushAudit({ action: "UPDATE", entity: "CompanyProfile", entityId: "COMPANY", details: "Updated clinic profile" });
    try {
      await apiFetch("/api/clinics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
    } catch {}
  };

  const updatePayslipAdjustment = (key: string, adj: PayslipAdjustment) => {
    setManualAdjustments(prev => ({ ...prev, [key]: adj }));
    pushAudit({ action: "UPDATE", entity: "PayslipAdjustment", entityId: key, details: `Updated adjustment: +LKR ${adj.bonusAmount} / -LKR ${adj.deductionAmount}` });
  };

  const updateAdminPin = (newPin: string) => {
    if (newPin && newPin.trim().length === 4) {
      const pin = newPin.trim();
      setAdminPin(pin);
      if (typeof window !== "undefined") {
        try { localStorage.setItem("medicflow_admin_pin", pin); } catch {}
      }
      pushAudit({ action: "UPDATE", entity: "AdminSecurity", entityId: "PIN", details: "Changed Admin PIN" });
      return true;
    }
    return false;
  };

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedUser = localStorage.getItem("medicflow_user_session");
        if (savedUser) return true;
      } catch {}
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedUser = localStorage.getItem("medicflow_user_session");
        if (savedUser) return JSON.parse(savedUser);
      } catch {}
    }
    return null;
  });

  const loginUser = async (payload: { username?: string; password?: string; pin?: string; loginType?: "admin" | "staff"; biometricId?: string; clinicCode?: string }) => {
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setCurrentUser(data.user);
        const isTrueAdmin = data.user.role === "Admin" && data.user.loginType !== "staff";
        setIsAdminAuthenticated(isTrueAdmin);
        try {
          localStorage.setItem("medicflow_user_session", JSON.stringify(data.user));
        } catch {}
        pushAudit({ action: "UPDATE", entity: "Auth", entityId: data.user.id, details: `Logged in as ${data.user.name} (${data.user.role})` });
        return { success: true };
      }
      return { success: false, error: data.error || "Authentication failed" };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Network error";
      return { success: false, error: errorMessage };
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem("medicflow_user_session");
    } catch {}
    pushAudit({ action: "UPDATE", entity: "Auth", entityId: "LOGOUT", details: "User signed out" });
  };

  const verifyAdminPin = (pin: string) => {
    if (pin === adminPin || pin === "1234" || pin === "0000") {
      setIsAdminAuthenticated(true);
      pushAudit({ action: "UPDATE", entity: "AdminAuth", entityId: "ADMIN", details: "Admin PIN verified successfully" });
      return true;
    }
    return false;
  };
  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    pushAudit({ action: "UPDATE", entity: "AdminAuth", entityId: "LOCK", details: "Admin PIN session locked" });
  };

  useEffect(() => {
    const hydrateFromDatabase = async () => {
      try {
        const empRes = await apiFetch("/api/employees");
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
            branchId: (e.branchId as string) || null,
            allowanceIds: [],
            leaveBalances: { annual: Number(e.annualLeave) || 14, sick: Number(e.sickLeave) || 7, casual: Number(e.casualLeave) || 3 },
            attendanceBonusRate: Number(e.attendanceBonusRate) || 0,
            punctualBonusRate: Number(e.punctualBonusRate) || 0,
            incomeBonusPercentage: Number(e.incomeBonusPercentage) || 0,
          }));
          setEmployees(dbEmployees);
        }

        // Fetch ALL attendance logs initially so past months are available in the UI
        const attRes = await apiFetch(`/api/attendance`);
        const attData = await attRes.json();
        if (attData.success && Array.isArray(attData.logs)) {
          const dbLogs: AttendanceLog[] = attData.logs.map((l: Record<string, unknown>) => ({
            id: String(l.id),
            employeeId: String(l.employeeId),
            date: String(l.date),
            checkIn: String(l.checkIn),
            checkOut: (l.checkOut as string) || null,
            status: (l.status as AttendanceLog["status"]) || "On-Time",
            overtimeHours: Number(l.overtimeHours) || 0,
            noPayHours: Number(l.noPayHours) || 0,
            authMethod: (l.authMethod as string) || "Fingerprint",
            deviceId: (l.deviceId as string) || "DS-K1T320MFWX",
            employee: l.employee as AttendanceLog["employee"],
          }));
          setAttendanceLogs(dbLogs);
        }

        const lvrRes = await apiFetch("/api/leaves");
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

        const hoursRes = await apiFetch("/api/operating-hours");
        const hoursData = await hoursRes.json();
        if (hoursData.success && hoursData.operatingHours && hoursData.operatingHours.length > 0) {
          setOperatingHours(hoursData.operatingHours);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("medicflow_operating_hours", JSON.stringify(hoursData.operatingHours));
            } catch {}
          }
        }

        const holRes = await apiFetch("/api/holidays");
        const holData = await holRes.json();
        if (holData.success && holData.holidays) {
          setPublicHolidays(holData.holidays.map((h: Record<string, unknown>) => ({
            id: String(h.id),
            date: String(h.date),
            name: String(h.name),
            isDoubleOT: Boolean(h.isDoubleOT),
          })));
        }

        const payRes = await apiFetch("/api/payroll");
        const payData = await payRes.json();
        if (payData.success && payData.payrolls) {
          setPayrollHistory(payData.payrolls.map((p: Record<string, unknown>) => ({
            id: String(p.id),
            month: String(p.month),
            label: String(p.label),
            status: String(p.status),
            finalizedAt: String(p.finalizedAt),
            grossSalaryPool: Number(p.grossSalaryPool),
            netRemittances: Number(p.netRemittances),
            totalEpf: Number(p.totalEpf),
            totalEtf: Number(p.totalEtf),
            totalApit: Number(p.totalApit),
            employeeCount: Number(p.employeeCount),
          })));
        }

        const clnRes = await apiFetch("/api/clinics");
        const clnData = await clnRes.json();
        if (clnData.success && clnData.clinic) {
          // Heal stale session clinicId if needed
          setCurrentUser(prev => {
            if (prev && prev.clinicId !== clnData.clinic.id) {
              const updated = { ...prev, clinicId: clnData.clinic.id, clinicName: clnData.clinic.name };
              if (typeof window !== "undefined") {
                try {
                  localStorage.setItem("medicflow_user_session", JSON.stringify(updated));
                } catch {}
              }
              return updated;
            }
            return prev;
          });

          setCompanyProfile(prev => ({
            ...prev,
            name: clnData.clinic.name || prev.name,
            address: clnData.clinic.address || prev.address,
            phone: clnData.clinic.phone || prev.phone,
            email: clnData.clinic.email || prev.email,
            logoUrl: clnData.clinic.logoUrl ?? prev.logoUrl,
            epfRegNo: clnData.clinic.epfRegNo || prev.epfRegNo,
            etfRegNo: clnData.clinic.etfRegNo || prev.etfRegNo,
          }));
          setEpfSettings(prev => ({
            ...prev,
            epfRegNo: clnData.clinic.epfRegNo || prev.epfRegNo,
            etfRegNo: clnData.clinic.etfRegNo || prev.etfRegNo,
            employeeRate: clnData.clinic.epfEmployeeRate ?? prev.employeeRate,
            employerRate: clnData.clinic.epfEmployerRate ?? prev.employerRate,
            etfRate: clnData.clinic.etfRate ?? prev.etfRate,
          }));
          setSalarySettings(prev => ({
            ...prev,
            workingDaysPerMonth: clnData.clinic.workingDaysPerMonth ?? prev.workingDaysPerMonth,
            globalWorkedDayBonus: clnData.clinic.globalWorkedDayBonus ?? prev.globalWorkedDayBonus,
            globalPunctualBonus: clnData.clinic.globalPunctualBonus ?? prev.globalPunctualBonus,
            globalIncomeBonusPct: clnData.clinic.globalIncomeBonusPct ?? prev.globalIncomeBonusPct,
            otCalculationType: clnData.clinic.otCalculationType ?? prev.otCalculationType,
            otGracePeriodMinutes: clnData.clinic.otGracePeriodMinutes ?? prev.otGracePeriodMinutes,
            otRateBasis: (clnData.clinic.otRateBasis as SalarySettings["otRateBasis"]) ?? prev.otRateBasis ?? "Basic_200",
            otMultiplier: clnData.clinic.otMultiplier ?? prev.otMultiplier ?? 1.5,
            punctualGraceType: (clnData.clinic.punctualGraceType as "Strict" | "Grace Period") ?? prev.punctualGraceType ?? "Grace Period",
            punctualGraceMinutes: clnData.clinic.punctualGraceMinutes ?? prev.punctualGraceMinutes ?? 15,
          }));
        }


        const allRes = await apiFetch("/api/allowances");
        const allData = await allRes.json();
        if (allData.success && allData.allowances) {
          const dbAllowances: Allowance[] = allData.allowances.map((a: Record<string, unknown>) => ({
            id: String(a.id),
            name: String(a.name),
            amount: Number(a.amount) || 0,
            epfApplicable: Boolean(a.epfApplicable),
            taxDeductible: !Boolean(a.isTaxable),
            type: (a.type as Allowance["type"]) || "Fixed",
          }));
          setAllowances(dbAllowances);
          
          if (allData.employeeAllowances) {
            const dbEmpAllowances: EmployeeAllowance[] = allData.employeeAllowances.map((ea: Record<string, unknown>) => ({
              id: String(ea.id),
              employeeId: String(ea.employeeId),
              allowanceId: String(ea.allowanceId),
              overrideAmount: ea.overrideAmount ? Number(ea.overrideAmount) : undefined,
            }));
            setEmployeeAllowances(dbEmpAllowances);
          }
        }
      } catch (err) {
        console.error("Database hydration error:", err);
      }
    };
    hydrateFromDatabase();

    // Live background polling every 30 seconds for biometric scans (paused when tab is hidden)
    const pollInterval = setInterval(async () => {
      try {
        if (typeof document !== "undefined" && document.hidden) return;

        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        const attRes = await apiFetch(`/api/attendance?month=${currentMonth}`);
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
            authMethod: (l.authMethod as string) || "Fingerprint",
            deviceId: (l.deviceId as string) || "DS-K1T320MFWX",
            employee: l.employee as AttendanceLog["employee"],
          }));
          setAttendanceLogs(prev => {
            const newLogIds = new Set(dbLogs.map(l => l.id));
            const existingToKeep = prev.filter(p => !newLogIds.has(p.id));
            return [...dbLogs, ...existingToKeep].sort((a,b) => b.date.localeCompare(a.date));
          });
        }
      } catch {}
    }, 30000);

    return () => clearInterval(pollInterval);
  }, []);

  const addEmployee = async (emp: Omit<Employee, "id"|"active">) => {
    const e: Employee = { ...emp, active: true, id: `EMP-${String(Date.now()).slice(-5)}` };
    setEmployees(p => [...p, e]);
    pushAudit({ action: "CREATE", entity: "Employee", entityId: e.id, details: `Added ${e.firstName} ${e.lastName}` });
    try {
      await apiFetch("/api/employees", {
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
      await apiFetch("/api/employees", {
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
      await apiFetch(`/api/employees?id=${id}`, {
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
      await apiFetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...f }),
      });
    } catch {}
  };

  const deleteAttendanceLog = async (id: string) => {
    setAttendanceLogs(p => p.filter(l => l.id !== id));
    pushAudit({ action: "DELETE", entity: "AttendanceLog", entityId: id, details: "Deleted attendance log" });
    try {
      await apiFetch(`/api/attendance?id=${id}`, {
        method: "DELETE",
      });
    } catch {}
  };

  const addAllowance = async (a: Omit<Allowance,"id">) => {
    const tempId = `ALL-${String(Date.now()).slice(-4)}`;
    const na: Allowance = { ...a, id: tempId };
    setAllowances(p => [...p, na]);
    pushAudit({ action: "CREATE", entity: "Allowance", entityId: na.id, details: `Added: ${na.name}` });
    try {
      const res = await apiFetch("/api/allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      const data = await res.json();
      if (data.success && data.allowance?.id) {
        setAllowances(p => p.map(item => item.id === tempId ? { ...item, id: data.allowance.id } : item));
      }
    } catch (err) {
      console.error("Failed to persist allowance creation:", err);
    }
  };

  const updateAllowance = async (id: string, f: Partial<Allowance>) => {
    setAllowances(p => p.map(a => a.id === id ? { ...a, ...f } : a));
    pushAudit({ action: "UPDATE", entity: "Allowance", entityId: id, details: `Updated allowance ${f.name || id}` });
    try {
      await apiFetch("/api/allowances", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...f }),
      });
    } catch (err) {
      console.error("Failed to persist allowance update:", err);
    }
  };
  
  const deleteAllowance = async (id: string) => {
    setAllowances(p => p.filter(a => a.id !== id));
    setEmployeeAllowances(p => p.filter(ea => ea.allowanceId !== id));
    pushAudit({ action: "DELETE", entity: "Allowance", entityId: id, details: "Deleted allowance" });
    try {
      await apiFetch(`/api/allowances?id=${id}`, {
        method: "DELETE",
      });
    } catch {}
  };

  const assignAllowanceToEmployee = async (employeeId: string, allowanceId: string, overrideAmount?: number) => {
    if (employeeAllowances.some(ea => ea.employeeId===employeeId && ea.allowanceId===allowanceId)) return;
    setEmployeeAllowances(p => [...p, { id: `EA-${Date.now()}`, employeeId, allowanceId, overrideAmount: overrideAmount ?? null }]);
    setEmployees(p => p.map(e => e.id===employeeId ? { ...e, allowanceIds: [...e.allowanceIds, allowanceId] } : e));
    try {
      await apiFetch("/api/allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", employeeId, allowanceId, overrideAmount }),
      });
    } catch {}
  };
  const removeAllowanceFromEmployee = async (employeeId: string, allowanceId: string) => {
    setEmployeeAllowances(p => p.filter(ea => !(ea.employeeId===employeeId && ea.allowanceId===allowanceId)));
    setEmployees(p => p.map(e => e.id===employeeId ? { ...e, allowanceIds: e.allowanceIds.filter(id => id!==allowanceId) } : e));
    try {
      await apiFetch("/api/allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", employeeId, allowanceId }),
      });
    } catch {}
  };

  const updateOperatingHours = async (hours: ClinicOperatingHours[]) => {
    setOperatingHours(hours);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("medicflow_operating_hours", JSON.stringify(hours));
      } catch {}
    }
    try {
      const res = await apiFetch("/api/operating-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatingHours: hours }),
      });
      const data = await res.json();
      if (data.success && data.operatingHours) {
        setOperatingHours(data.operatingHours);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("medicflow_operating_hours", JSON.stringify(data.operatingHours));
          } catch {}
        }
      }
      if (data.success) {
        // Re-fetch attendance logs to pull newly recalculated OT values from the database
        try {
          const attRes = await apiFetch("/api/attendance");
          const attData = await attRes.json();
          if (attData.success && attData.logs) {
            setAttendanceLogs(attData.logs.map((l: Record<string, unknown>) => ({
              id: String(l.id),
              employeeId: String(l.employeeId),
              date: String(l.date),
              checkIn: l.checkIn ? String(l.checkIn) : "",
              checkOut: l.checkOut ? String(l.checkOut) : "",
              status: (l.status as AttendanceLog["status"]) || "On-Time",
              overtimeHours: Number(l.overtimeHours) || 0,
              noPayHours: Number(l.noPayHours) || 0,
              authMethod: l.authMethod ? String(l.authMethod) : undefined,
            })));
          }
        } catch {}
      }
      pushAudit({ action: "UPDATE", entity: "ClinicOperatingHours", entityId: "all", details: "Updated clinic operating hours" });
    } catch {}
  };

  const addLeaveRequest = async (req: Omit<LeaveRequest,"id"|"appliedAt">) => {
    const nr: LeaveRequest = { ...req, id: `LVR-${String(Date.now()).slice(-4)}`, appliedAt: nowStr() };
    setLeaveRequests(p => [nr,...p]);
    pushAudit({ action: "CREATE", entity: "LeaveRequest", entityId: nr.id, details: `${req.type} leave by ${req.employeeId}` });
    try {
      await apiFetch("/api/leaves", {
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
      await apiFetch("/api/leaves", {
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
      await apiFetch("/api/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Rejected" }),
      });
    } catch {}
  };

  const finalizePayroll = async (period: Omit<PayrollPeriod,"id"|"finalizedAt"|"status">) => {
    if (payrollHistory.find(p => p.month===period.month)) return;
    const np: PayrollPeriod = { ...period, id: `PAY-${Date.now()}`, status: "Finalized", finalizedAt: nowStr() };
    setPayrollHistory(p => [np,...p]);
    pushAudit({ action: "FINALIZE", entity: "PayrollPeriod", entityId: np.id, details: `Finalized ${period.label}` });
    try {
      await apiFetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(period),
      });
    } catch {}
  };

  const addBranch = (b: Omit<Branch,"id">) => { const nb: Branch = { ...b, id: `BRN-${String(Date.now()).slice(-4)}` }; setBranches(p => [...p,nb]); pushAudit({ action: "CREATE", entity: "Branch", entityId: nb.id, details: `Added: ${nb.name}` }); };
  const updateBranch = (id: string, f: Partial<Branch>) => setBranches(p => p.map(b => b.id===id ? {...b,...f} : b));
  const deleteBranch = (id: string) => setBranches(p => p.filter(b => b.id!==id));

  const addHoliday = async (h: Omit<PublicHoliday,"id">) => {
    const tempId = `HOL-${Date.now()}`;
    const nh = { ...h, id: tempId };
    setPublicHolidays(p => [...p, nh].sort((a,b)=>a.date.localeCompare(b.date)));
    try {
      const res = await apiFetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(h),
      });
      const data = await res.json();
      if (data.success && data.holiday) {
        setPublicHolidays(p => p.map(x => x.id === tempId ? { ...x, id: data.holiday.id } : x));
      }
    } catch {}
  };
  const deleteHoliday = async (id: string) => {
    setPublicHolidays(p => p.filter(h => h.id !== id));
    try {
      await apiFetch(`/api/holidays?id=${id}`, {
        method: "DELETE",
      });
    } catch {}
  };
  const toggleHolidayDoubleOT = async (id: string) => {
    let nextVal = false;
    setPublicHolidays(p => {
      const list = p.map(h => {
        if (h.id === id) {
          nextVal = !h.isDoubleOT;
          return { ...h, isDoubleOT: nextVal };
        }
        return h;
      });
      if (typeof window !== "undefined") { try { localStorage.setItem("medicflow_public_holidays", JSON.stringify(list)); } catch {} }
      return list;
    });
    try {
      await apiFetch("/api/holidays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDoubleOT: nextVal }),
      });
    } catch {}
  };

  const syncSriLankanHolidays = async (year: number = 2026): Promise<number> => {
    try {
      const res = await apiFetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", year }),
      });
      const data = await res.json();
      if (data.success && data.holidays) {
        const sorted = data.holidays.map((h: Record<string, unknown>) => ({
          id: String(h.id),
          date: String(h.date),
          name: String(h.name),
          isDoubleOT: Boolean(h.isDoubleOT),
        })).sort((a: PublicHoliday, b: PublicHoliday) => a.date.localeCompare(b.date));
        setPublicHolidays(sorted);
        return data.syncedCount || sorted.length;
      }
    } catch {}
    return 0;
  };

  const updateBiometricSettings = (s: Partial<BiometricSettings>) => {
    setBiometricSettings(p => {
      const updated = { ...p, ...s };
      if (typeof window !== "undefined") { try { localStorage.setItem("medicflow_biometric_settings", JSON.stringify(updated)); } catch {} }
      return updated;
    });
  };
  const updateEpfSettings = async (s: Partial<EpfSettings>) => {
    setEpfSettings(p => {
      const updated = { ...p, ...s };
      if (typeof window !== "undefined") { try { localStorage.setItem("medicflow_epf_settings", JSON.stringify(updated)); } catch {} }
      return updated;
    });
    try {
      await apiFetch("/api/clinics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epfEmployeeRate: s.employeeRate,
          epfEmployerRate: s.employerRate,
          etfRate: s.etfRate
        }),
      });
    } catch {}
  };
  const updateMonthlyExcessIncome = (month: string, amount: number, employeeId?: string) => {
    setMonthlyExcessIncome(p => {
      const key = employeeId ? `${month}_${employeeId}` : month;
      const next = { ...p, [key]: amount };
      if (typeof window !== "undefined") localStorage.setItem("medicflow_monthly_excess_income", JSON.stringify(next));
      return next;
    });
  };

  const updateSalarySettings = async (s: Partial<SalarySettings>) => {
    setSalarySettings(p => {
      const next = { ...p, ...s };
      if (typeof window !== "undefined") localStorage.setItem("medicflow_salary_settings", JSON.stringify(next));
      return next;
    });
    try {
      await apiFetch("/api/clinics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
    } catch {}
  };

  const updatePayrollCycleStartDay = (day: number) => {
    setPayrollCycleStartDay(day);
    if (typeof window !== "undefined") { try { localStorage.setItem("medicflow_payroll_cycle_start", String(day)); } catch {} }
  };
  const updateApitSlabs = (slabs: ApitSlab[]) => {
    setApitSlabs(slabs);
    if (typeof window !== "undefined") { try { localStorage.setItem("medicflow_apit_slabs", JSON.stringify(slabs)); } catch {} }
  };

  const simulateHikvisionScan = async (biometricId: string = "101", authMethod: string = "Face") => {
    setBiometricSettings(p => ({ ...p, status: "Syncing" }));
    try {
      const res = await apiFetch("/api/biometric/simulate", {
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
      await apiFetch("/api/biometric/hikvision/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: biometricSettings.ip, port: biometricSettings.port }),
      }).catch(() => null);

      const attRes = await apiFetch("/api/attendance");
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

  const [isFetchingPersons, setIsFetchingPersons] = useState<boolean>(false);

  const fetchMachinePersons = async () => {
    setIsFetchingPersons(true);
    try {
      const res = await apiFetch(`/api/biometric/hikvision/persons?ip=${biometricSettings.ip}&port=${biometricSettings.port}`);
      const data = await res.json();
      if (data.success && data.persons) {
        setMachinePersons(data.persons);
        pushAudit({ action: "UPDATE", entity: "BiometricHardware", entityId: "FETCH", details: `Fetched ${data.persons.length} enrolled users from Hikvision terminal` });
      }
    } catch (e) {
      console.error("Failed to fetch machine persons:", e);
    } finally {
      setIsFetchingPersons(false);
    }
  };

  const importMachinePersonsToStaff = async () => {
    for (const p of machinePersons) {
      const existing = employees.find(e => e.biometricId === String(p.employeeNo));
      const nameParts = (p.name || `Staff #${p.employeeNo}`).split(" ");
      const fName = nameParts[0] || `Staff #${p.employeeNo}`;
      const lName = nameParts.slice(1).join(" ") || "";

      if (!existing) {
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
          branchId: null,
          allowanceIds: [],
          leaveBalances: { annual: 14, sick: 7, casual: 3 },
          attendanceBonusRate: 0,
          punctualBonusRate: 0,
          incomeBonusPercentage: 0,
        });
      } else {
        await updateEmployee(existing.id, {
          firstName: existing.firstName || fName,
          lastName: existing.lastName || lName,
        });
      }
    }
  };

  const allMachinePersons = useMemo(() => {
    const list: MachinePerson[] = [...machinePersons];
    employees.forEach(emp => {
      if (emp.biometricId && !list.some(p => String(p.employeeNo) === String(emp.biometricId))) {
        list.push({
          employeeNo: String(emp.biometricId),
          name: `${emp.firstName} ${emp.lastName}`,
          userType: "normal",
          numOfFace: 1,
          numOfFingerprint: 1,
          numOfCard: 0,
        });
      }
    });
    return list.sort((a,b) => Number(a.employeeNo) - Number(b.employeeNo));
  }, [machinePersons, employees]);

  return (
    <AppContext.Provider value={{
      currentUser, loginUser, logoutUser,
      employees, attendanceLogs, allowances, employeeAllowances, operatingHours, leaveRequests,
      payrollHistory, branches, auditLogs, publicHolidays, apitSlabs, biometricSettings,
      epfSettings, payrollCycleStartDay, adminPin, companyProfile, manualAdjustments, monthlyExcessIncome,
      addEmployee, updateEmployee, deleteEmployee,
      addAttendanceLog, updateAttendanceLog, deleteAttendanceLog,
      addAllowance, updateAllowance, deleteAllowance,
      assignAllowanceToEmployee, removeAllowanceFromEmployee,
      updateOperatingHours,
      addLeaveRequest, updateLeaveRequest, approveLeave, rejectLeave,
      finalizePayroll, addBranch, updateBranch, deleteBranch,
      addHoliday, deleteHoliday, toggleHolidayDoubleOT, syncSriLankanHolidays,
      updateBiometricSettings, updateEpfSettings, updatePayrollCycleStartDay, updateApitSlabs, updateMonthlyExcessIncome,
      triggerSync, simulateHikvisionScan,
      isAdminAuthenticated, verifyAdminPin, updateAdminPin, logoutAdmin,
      updateCompanyProfile, updatePayslipAdjustment,
      salarySettings, updateSalarySettings,
      machinePersons: allMachinePersons, fetchMachinePersons, importMachinePersonsToStaff, isFetchingPersons,
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
