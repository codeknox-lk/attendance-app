import { describe, it, expect } from "vitest";

/**
 * Pure functions matching MedSync's statutory payroll engine rules
 */
export function calculateEPFEmployee(qualifyingEarnings: number, ratePct = 8): number {
  return Number(((qualifyingEarnings * ratePct) / 100).toFixed(2));
}

export function calculateEPFEmployer(qualifyingEarnings: number, ratePct = 12): number {
  return Number(((qualifyingEarnings * ratePct) / 100).toFixed(2));
}

export function calculateETFEmployer(qualifyingEarnings: number, ratePct = 3): number {
  return Number(((qualifyingEarnings * ratePct) / 100).toFixed(2));
}

export function calculateHourlyOvertimeRate(basicSalary: number, basis = "Basic_200", customHourlyRate = 0): number {
  if (basis === "Profile_Hourly_Rate" && customHourlyRate > 0) {
    return customHourlyRate;
  }
  // Standard statutory formula: Basic / 200 hours
  return Number((basicSalary / 200).toFixed(2));
}

export function calculateOvertimePay(
  hourlyRate: number,
  standardOtHours: number,
  holidayOtHours: number,
  standardMultiplier = 1.5,
  holidayMultiplier = 2.0
): { standardOtPay: number; holidayOtPay: number; totalOtPay: number } {
  const standardOtPay = Number((hourlyRate * standardOtHours * standardMultiplier).toFixed(2));
  const holidayOtPay = Number((hourlyRate * holidayOtHours * holidayMultiplier).toFixed(2));
  const totalOtPay = Number((standardOtPay + holidayOtPay).toFixed(2));
  return { standardOtPay, holidayOtPay, totalOtPay };
}

export function calculateNetSalary(params: {
  basicSalary: number;
  fixedAllowances: number;
  otPay: number;
  workedDayBonus: number;
  punctualBonus: number;
  epfEmployeeDeduction: number;
  otherDeductions: number;
}): { grossSalary: number; totalDeductions: number; netSalary: number } {
  const grossSalary = Number(
    (
      params.basicSalary +
      params.fixedAllowances +
      params.otPay +
      params.workedDayBonus +
      params.punctualBonus
    ).toFixed(2)
  );
  const totalDeductions = Number((params.epfEmployeeDeduction + params.otherDeductions).toFixed(2));
  const netSalary = Number((grossSalary - totalDeductions).toFixed(2));
  return { grossSalary, totalDeductions, netSalary };
}

describe("MedSync Statutory Payroll & Overtime Engine", () => {
  const basicSalary = 100000; // LKR 100,000

  it("calculates statutory EPF employee deduction (8%) correctly", () => {
    const epfEmployee = calculateEPFEmployee(basicSalary, 8);
    expect(epfEmployee).toBe(8000);
  });

  it("calculates statutory EPF employer contribution (12%) correctly", () => {
    const epfEmployer = calculateEPFEmployer(basicSalary, 12);
    expect(epfEmployer).toBe(12000);
  });

  it("calculates statutory ETF employer contribution (3%) correctly", () => {
    const etfEmployer = calculateETFEmployer(basicSalary, 3);
    expect(etfEmployer).toBe(3000);
  });

  it("derives statutory hourly overtime rate based on Basic/200 formula", () => {
    const hourlyRate = calculateHourlyOvertimeRate(basicSalary, "Basic_200");
    expect(hourlyRate).toBe(500); // 100,000 / 200 = 500/hr
  });

  it("computes normal 1.5× and holiday 2.0× double-time overtime accurately", () => {
    const hourlyRate = 500;
    const normalHours = 10;
    const holidayHours = 5;

    const ot = calculateOvertimePay(hourlyRate, normalHours, holidayHours, 1.5, 2.0);

    // Normal: 500 * 10 * 1.5 = 7,500
    expect(ot.standardOtPay).toBe(7500);
    // Holiday (2x): 500 * 5 * 2.0 = 5,000
    expect(ot.holidayOtPay).toBe(5000);
    // Total OT: 12,500
    expect(ot.totalOtPay).toBe(12500);
  });

  it("accurately balances gross additions and net statutory take-home pay", () => {
    const summary = calculateNetSalary({
      basicSalary: 80000,
      fixedAllowances: 10000,
      otPay: 15000,
      workedDayBonus: 5000,
      punctualBonus: 2000,
      epfEmployeeDeduction: 6400, // 8% of 80,000
      otherDeductions: 1000,
    });

    expect(summary.grossSalary).toBe(112000); // 80000 + 10000 + 15000 + 5000 + 2000
    expect(summary.totalDeductions).toBe(7400); // 6400 + 1000
    expect(summary.netSalary).toBe(104600); // 112000 - 7400
  });

  describe("Historical Salary Preservation Engine", () => {
    function resolveEmployeeSalaryForMonth(
      salaryHistory: { effectiveMonth: string; basicSalary: number; hourlyRate?: number }[] | undefined,
      currentSalary: { basicSalary: number; hourlyRate?: number },
      targetMonth: string
    ): { basicSalary: number; hourlyRate: number } {
      if (salaryHistory && salaryHistory.length > 0) {
        const valid = salaryHistory
          .filter(h => h.effectiveMonth <= targetMonth)
          .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
        if (valid.length > 0) {
          return {
            basicSalary: valid[0].basicSalary,
            hourlyRate: valid[0].hourlyRate ?? currentSalary.hourlyRate ?? 0,
          };
        }
        const earliest = [...salaryHistory].sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))[0];
        if (earliest) {
          return {
            basicSalary: earliest.basicSalary,
            hourlyRate: earliest.hourlyRate ?? currentSalary.hourlyRate ?? 0,
          };
        }
      }
      return {
        basicSalary: currentSalary.basicSalary,
        hourlyRate: currentSalary.hourlyRate ?? 0,
      };
    }

    it("preserves past unfinalized months with historical salary when increased in later months", () => {
      // Worker had 15,000 up to September, then updated to 18,000 effective October
      const history = [
        { effectiveMonth: "2026-01", basicSalary: 15000, hourlyRate: 300 },
        { effectiveMonth: "2026-10", basicSalary: 18000, hourlyRate: 350 },
      ];
      const liveEmp = { basicSalary: 18000, hourlyRate: 350 };

      // September 2026 should preserve 15,000
      const sep = resolveEmployeeSalaryForMonth(history, liveEmp, "2026-09");
      expect(sep.basicSalary).toBe(15000);
      expect(sep.hourlyRate).toBe(300);

      // August 2026 should preserve 15,000
      const aug = resolveEmployeeSalaryForMonth(history, liveEmp, "2026-08");
      expect(aug.basicSalary).toBe(15000);

      // October 2026 reflects the new 18,000
      const oct = resolveEmployeeSalaryForMonth(history, liveEmp, "2026-10");
      expect(oct.basicSalary).toBe(18000);
      expect(oct.hourlyRate).toBe(350);

      // November 2026 continues with the 18,000 rate
      const nov = resolveEmployeeSalaryForMonth(history, liveEmp, "2026-11");
      expect(nov.basicSalary).toBe(18000);
    });

    it("falls back gracefully to current salary when no history records exist", () => {
      const liveEmp = { basicSalary: 60000, hourlyRate: 400 };
      const res = resolveEmployeeSalaryForMonth([], liveEmp, "2026-08");
      expect(res.basicSalary).toBe(60000);
      expect(res.hourlyRate).toBe(400);
    });
  });
});
