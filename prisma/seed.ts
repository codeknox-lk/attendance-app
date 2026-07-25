import { db } from "../src/lib/db";

async function main() {
  const emp1 = await db.employee.upsert({
    where: { biometricId: "101" },
    update: {},
    create: {
      firstName: "Ruwan",
      lastName: "Alwis",
      role: "Doctor",
      payType: "Session-based",
      basicSalary: 150000,
      sessionRate: 3500,
      biometricId: "101",
      epfEligible: false,
      taxable: true,
    },
  });

  const emp2 = await db.employee.upsert({
    where: { biometricId: "102" },
    update: {},
    create: {
      firstName: "Nimali",
      lastName: "Perera",
      role: "Nurse",
      payType: "Fixed Monthly",
      basicSalary: 75000,
      hourlyRate: 500,
      biometricId: "102",
      epfEligible: true,
      taxable: false,
    },
  });

  console.log("Database seeded successfully:", emp1.firstName, emp2.firstName);
}

main().catch(console.error);
