import { db } from './src/lib/db.js';

async function main() {
  const emp = await db.employee.findFirst({ where: { firstName: "NIKILA" } });
  console.log("Found Employee:", emp);
  if (!emp) return;

  try {
    const log = await db.attendanceLog.create({
      data: {
        employeeId: emp.id,
        date: "2026-08-19",
        checkIn: "08:30:00",
        checkOut: "17:00:00",
        status: "On-Time",
        authMethod: "Face",
        deviceId: "DS-K1T320MFWX"
      }
    });
    console.log("Success Insert Nikila:", log);
  } catch (err) {
    console.error("Insert Error:", err);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
