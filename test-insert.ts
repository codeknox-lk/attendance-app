import { db } from './src/lib/db.js';

async function main() {
  const emp = await db.employee.findFirst({ where: { firstName: "Deshani" } });
  console.log("Found Employee:", emp);
  if (!emp) return;

  try {
    const log = await db.attendanceLog.create({
      data: {
        employeeId: emp.id,
        date: "2026-08-19",
        checkIn: "17:36:59",
        status: "Late",
        authMethod: "Face",
        deviceId: "SIM-001"
      }
    });
    console.log("Success Insert:", log);
  } catch (err) {
    console.error("Insert Error:", err);
  }
}

main().catch(console.error).finally(() => db.$disconnect());
