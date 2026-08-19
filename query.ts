import { db } from './src/lib/db.js';

async function main() {
  const employees = await db.employee.findMany();
  console.log("EMPLOYEES:", JSON.stringify(employees, null, 2));

  const logs = await db.attendanceLog.findMany();
  console.log("LOGS:", JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => db.$disconnect());
