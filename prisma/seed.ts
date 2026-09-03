import { db } from "../src/lib/db";

async function main() {
  // Create Default Admin User
  await db.adminUser.upsert({
    where: { clinicId_username: { clinicId: "default-clinic-id", username: "admin" } },
    update: { password: "admin123" },
    create: {
      username: "admin",
      password: "admin123",
      name: "Clinic Administrator",
      role: "Admin",
    },
  });

  // Create Staff #1 Lakmina
  await db.employee.upsert({
    where: { clinicId_biometricId: { clinicId: "default-clinic-id", biometricId: "1" } },
    update: { firstName: "LAKMINA", lastName: "EKANAYAKE" },
    create: {
      firstName: "LAKMINA",
      lastName: "EKANAYAKE",
      biometricId: "1",
      role: "Admin",
      payType: "Fixed Monthly",
      basicSalary: 85000,
      hourlyRate: 500,
      epfEligible: true,
      taxable: false,
    },
  });

  // Create Staff #2 Ruwantha
  await db.employee.upsert({
    where: { clinicId_biometricId: { clinicId: "default-clinic-id", biometricId: "2" } },
    update: { firstName: "ruwantha", lastName: "Alwis" },
    create: {
      firstName: "ruwantha",
      lastName: "Alwis",
      biometricId: "2",
      role: "Doctor",
      payType: "Session-based",
      basicSalary: 150000,
      sessionRate: 3500,
      epfEligible: false,
      taxable: true,
    },
  });

  console.log("Database seeded with Admin User and Enrolled Staff!");
}

main().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
