/**
 * seed-demo-clinic.mjs
 * Creates / refreshes the "SUNRISE" demo clinic on the remote Neon DB.
 * Usage:  node scripts/seed-demo-clinic.mjs
 * IDEMPOTENT — wipes old demo clinic and re-creates everything fresh.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

// Load .env.local so DATABASE_URL is available
config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });


const DEMO_CLINIC_CODE = "SUNRISE";
const DEMO_ADMIN_USER  = "admin";
const DEMO_ADMIN_PASS  = "admin";

const today = new Date();
const dateStr = (offset = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
};
const monthStr = (offset = 0) => {
  const d = new Date(today);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const STAFF = [
  { firstName: "Nimal",    lastName: "Perera",      role: "Receptionist",   bio: "101", salary: 52000,  epf: true,  taxable: false },
  { firstName: "Kumari",   lastName: "Silva",       role: "Nurse",          bio: "102", salary: 68000,  epf: true,  taxable: false },
  { firstName: "Sampath",  lastName: "Fernando",    role: "Doctor",         bio: "103", salary: 185000, epf: false, taxable: true  },
  { firstName: "Dilani",   lastName: "Jayasinghe",  role: "Nurse",          bio: "104", salary: 72000,  epf: true,  taxable: false },
  { firstName: "Roshan",   lastName: "Wickrama",    role: "Lab Technician", bio: "105", salary: 88000,  epf: true,  taxable: false },
  { firstName: "Thilini",  lastName: "Rathnayake",  role: "Pharmacist",     bio: "106", salary: 95000,  epf: true,  taxable: false },
  { firstName: "Ajith",    lastName: "Bandara",     role: "Cleaner",        bio: "107", salary: 38000,  epf: true,  taxable: false },
  { firstName: "Priyanka", lastName: "Mendis",      role: "Nurse",          bio: "108", salary: 71000,  epf: true,  taxable: false },
  { firstName: "Harsha",   lastName: "Gunawardena", role: "Medical Officer", bio: "109", salary: 210000, epf: false, taxable: true  },
  { firstName: "Malini",   lastName: "Dissanayake", role: "Receptionist",   bio: "110", salary: 49000,  epf: true,  taxable: false },
];

const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const timeStr  = (h, m) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;

function generateShift(status, dayOfWeek) {
  const isSat = dayOfWeek === 6;
  const shiftEnd = isSat ? { h: 14, m: 0 } : { h: 17, m: 0 };

  if (status === "Absent" || status === "On-Leave") return { checkIn: null, checkOut: null };

  let inH = 8, inM = 30;
  let outH = shiftEnd.h, outM = shiftEnd.m;

  if (status === "Late") {
    const lateMin = randInt(16, 45);
    inM += lateMin;
    if (inM >= 60) { inH++; inM -= 60; }
  } else if (status === "On-Time") {
    const delta = randInt(-5, 10);
    inM += delta;
    if (inM < 0)  { inH--; inM += 60; }
    if (inM >= 60){ inH++; inM -= 60; }
  } else if (status === "Half-Day") {
    const lateMin = randInt(180, 240);
    inH = 8 + Math.floor((30 + lateMin) / 60);
    inM = (30 + lateMin) % 60;
  }

  const outDelta = randInt(-10, 60);
  outM += outDelta;
  if (outM < 0)  { outH--; outM += 60; }
  if (outM >= 60){ outH++; outM -= 60; }
  outH = Math.max(shiftEnd.h, outH);

  return { checkIn: timeStr(inH, inM), checkOut: timeStr(outH, Math.min(outM, 59)) };
}

async function main() {
  console.log("🌱  Seeding SUNRISE demo clinic...\n");

  const hashedPass = await bcrypt.hash(DEMO_ADMIN_PASS, 10);

  // Wipe existing demo clinic
  const existing = await db.clinic.findFirst({
    where: { clinicCode: { equals: DEMO_CLINIC_CODE, mode: "insensitive" } },
  });
  if (existing) {
    console.log("   ⚠  Existing demo clinic found — wiping for fresh seed...");
    await db.clinic.delete({ where: { id: existing.id } });
  }

  // 1. Create Clinic
  const clinic = await db.clinic.create({
    data: {
      clinicCode:           DEMO_CLINIC_CODE,
      name:                 "Sunrise Medical Centre",
      address:              "No. 45, Galle Road, Colombo 03, Sri Lanka",
      phone:                "+94 11 234 5678",
      email:                "info@sunrisemedical.lk",
      epfRegNo:             "EPF/2019/COL/00847",
      etfRegNo:             "ETF/2019/COL/00391",
      epfEmployeeRate:      8,
      epfEmployerRate:      12,
      etfRate:              3,
      workingDaysPerMonth:  24,
      globalWorkedDayBonus: 500,
      globalPunctualBonus:  300,
      globalIncomeBonusPct: 0,
      otCalculationType:    "Grace Period",
      otGracePeriodMinutes: 30,
      otRateBasis:          "Basic_200",
      otMultiplier:         1.5,
      punctualGraceType:    "Grace Period",
      punctualGraceMinutes: 15,
    },
  });
  console.log(`   ✓  Clinic: ${clinic.name} [${clinic.clinicCode}]`);

  // 2. Admin user
  await db.adminUser.create({
    data: {
      clinicId: clinic.id,
      username: DEMO_ADMIN_USER,
      password: hashedPass,
      name:     "Dr. Admin Perera",
      role:     "Admin",
    },
  });
  console.log(`   ✓  Admin: ${DEMO_ADMIN_USER} / ${DEMO_ADMIN_PASS}`);

  // 3. Operating Hours
  await db.clinicOperatingHours.createMany({
    data: [
      { clinicId: clinic.id, dayOfWeek: 0, isOpen: false, startTime: "08:30", endTime: "17:00" },
      { clinicId: clinic.id, dayOfWeek: 1, isOpen: true,  startTime: "08:30", endTime: "17:00" },
      { clinicId: clinic.id, dayOfWeek: 2, isOpen: true,  startTime: "08:30", endTime: "17:00" },
      { clinicId: clinic.id, dayOfWeek: 3, isOpen: true,  startTime: "08:30", endTime: "17:00" },
      { clinicId: clinic.id, dayOfWeek: 4, isOpen: true,  startTime: "08:30", endTime: "17:00" },
      { clinicId: clinic.id, dayOfWeek: 5, isOpen: true,  startTime: "08:30", endTime: "17:00" },
      { clinicId: clinic.id, dayOfWeek: 6, isOpen: true,  startTime: "08:30", endTime: "14:00" },
    ],
  });
  console.log(`   ✓  Operating hours configured`);

  // 4. Public Holidays
  const holidays = [
    { date: dateStr(-45), name: "National Day",         isDoubleOT: true  },
    { date: dateStr(-30), name: "Poya Day",             isDoubleOT: true  },
    { date: dateStr(-15), name: "Vesak Full Moon Poya", isDoubleOT: true  },
    { date: dateStr(10),  name: "Deepawali",            isDoubleOT: false },
    { date: dateStr(25),  name: "Christmas Day",        isDoubleOT: false },
  ];
  await db.publicHoliday.createMany({
    data: holidays.map(h => ({ clinicId: clinic.id, ...h })),
  });
  console.log(`   ✓  ${holidays.length} public holidays`);

  // 5. Allowances
  const transAllowance   = await db.allowance.create({ data: { clinicId: clinic.id, name: "Transport Allowance", amount: 3000, type: "Monthly", isTaxable: false, epfApplicable: false } });
  const mealAllowance    = await db.allowance.create({ data: { clinicId: clinic.id, name: "Meal Allowance",      amount: 5000, type: "Monthly", isTaxable: false, epfApplicable: false } });
  const uniformAllowance = await db.allowance.create({ data: { clinicId: clinic.id, name: "Uniform Allowance",   amount: 1500, type: "Monthly", isTaxable: false, epfApplicable: false } });
  console.log(`   ✓  3 allowances`);

  // 6. Biometric Device
  await db.biometricDevice.create({
    data: {
      clinicId:     clinic.id,
      name:         "Main Entrance Terminal",
      model:        "DS-K1T320MFWX",
      serialNumber: "SUN-BIO-001-2024",
      location:     "Reception Lobby",
      status:       "Connected",
      protocol:     "HTTP Event Push",
      ipAddress:    "192.168.1.200",
      lastSyncTime: new Date(),
    },
  });
  console.log(`   ✓  Biometric device registered`);

  // 7. Employees
  const clinicalRoles = ["Nurse","Doctor","Medical Officer","Pharmacist","Lab Technician"];
  const createdEmployees = [];
  for (const s of STAFF) {
    const emp = await db.employee.create({
      data: {
        clinicId:             clinic.id,
        firstName:            s.firstName,
        lastName:             s.lastName,
        role:                 s.role,
        payType:              "Fixed Monthly",
        basicSalary:          s.salary,
        hourlyRate:           Math.round(s.salary / 176),
        biometricId:          s.bio,
        portalPin:            "1234",
        epfEligible:          s.epf,
        taxable:              s.taxable,
        active:               true,
        attendanceBonusRate:  500,
        punctualBonusRate:    300,
        incomeBonusPercentage:0,
      },
    });
    const links = [
      { employeeId: emp.id, allowanceId: transAllowance.id },
      { employeeId: emp.id, allowanceId: mealAllowance.id  },
    ];
    if (clinicalRoles.includes(s.role)) {
      links.push({ employeeId: emp.id, allowanceId: uniformAllowance.id });
    }
    await db.employeeAllowance.createMany({ data: links });
    createdEmployees.push(emp);
  }
  console.log(`   ✓  ${createdEmployees.length} employees`);

  // 8. 90 days of attendance logs
  console.log(`   ⏳ Generating attendance logs (90 days)...`);
  const statusPool  = ["On-Time","On-Time","On-Time","On-Time","On-Time","On-Time","On-Time","Late","Late","Half-Day","Absent"];
  const authMethods = ["Face","Face","Fingerprint","Card","Manual"];
  let totalLogs = 0;

  for (let offset = -89; offset <= 0; offset++) {
    const dateKey = dateStr(offset);
    const dow = new Date(dateKey + "T00:00:00").getDay();
    if (dow === 0) continue; // closed Sunday
    if (holidays.some(h => h.date === dateKey)) continue; // public holiday

    for (const emp of createdEmployees) {
      const rand = Math.random();
      let status = rand < 0.03 ? "Absent" : rand < 0.06 ? "On-Leave" : randItem(statusPool);

      const { checkIn, checkOut } = generateShift(status, dow);
      if (!checkIn) continue;

      const isSat = dow === 6;
      const shiftEndMin = isSat ? 14*60 : 17*60;
      const [outH, outM] = checkOut.split(":").map(Number);
      const overtimeHours = (outH*60 + outM) > shiftEndMin
        ? Math.round(((outH*60 + outM - shiftEndMin) / 60) * 100) / 100
        : 0;

      await db.attendanceLog.create({
        data: { clinicId: clinic.id, employeeId: emp.id, date: dateKey, checkIn, checkOut, status, overtimeHours, noPayHours: 0, authMethod: randItem(authMethods) },
      });
      totalLogs++;
    }
  }
  console.log(`   ✓  ${totalLogs} attendance logs`);

  // 9. Leave Requests
  const leaveTypePool   = ["Annual","Sick","Casual"];
  const leaveStatusPool = ["Approved","Approved","Approved","Pending","Rejected"];
  const leaveReasons    = ["Medical appointment","Family emergency","Personal reasons","Annual vacation","Sick - fever"];
  const leaveData = [];
  for (const emp of createdEmployees.slice(0, 7)) {
    const count = randInt(1, 2);
    for (let i = 0; i < count; i++) {
      const startOff = randInt(-60, -5);
      const dur      = randInt(1, 3);
      leaveData.push({
        clinicId: clinic.id, employeeId: emp.id,
        type: randItem(leaveTypePool), startDate: dateStr(startOff), endDate: dateStr(startOff + dur - 1),
        reason: randItem(leaveReasons), status: randItem(leaveStatusPool),
      });
    }
  }
  // 2 live pending requests for today
  leaveData.push({ clinicId: clinic.id, employeeId: createdEmployees[7].id, type: "Sick",   startDate: dateStr(0), endDate: dateStr(1), reason: "Fever and cold",  status: "Pending" });
  leaveData.push({ clinicId: clinic.id, employeeId: createdEmployees[9].id, type: "Casual", startDate: dateStr(3), endDate: dateStr(3), reason: "Personal matter", status: "Pending" });
  await db.leaveRequest.createMany({ data: leaveData });
  console.log(`   ✓  ${leaveData.length} leave requests`);

  // 10. Payroll History (3 months finalized + current Draft)
  const payrollData = [];
  for (let i = -3; i <= -1; i++) {
    const m = monthStr(i);
    const gross = randInt(920000, 1050000);
    payrollData.push({ clinicId: clinic.id, month: m, label: `Payroll ${m}`, status: "Finalized",
      grossSalaryPool: gross, netRemittances: Math.round(gross * 0.86),
      totalEpf: Math.round(gross * 0.08), totalEtf: Math.round(gross * 0.03), totalApit: Math.round(gross * 0.02),
      employeeCount: STAFF.length });
  }
  payrollData.push({ clinicId: clinic.id, month: monthStr(0), label: `Payroll ${monthStr(0)}`, status: "Draft",
    grossSalaryPool: 0, netRemittances: 0, totalEpf: 0, totalEtf: 0, totalApit: 0, employeeCount: STAFF.length });
  await db.payrollPeriod.createMany({ data: payrollData });
  console.log(`   ✓  ${payrollData.length} payroll periods`);

  console.log(`\n🎉  Done!\n`);
  console.log(`   Clinic Code : ${DEMO_CLINIC_CODE}`);
  console.log(`   Login       : ${DEMO_ADMIN_USER} / ${DEMO_ADMIN_PASS}`);
  console.log(`   Staff       : ${STAFF.length} employees`);
  console.log(`   Logs        : ${totalLogs} attendance records\n`);
}

main()
  .catch(e => { console.error("❌  Seed failed:", e.message); process.exit(1); })
  .finally(async () => { await db.$disconnect(); await pool.end(); });
