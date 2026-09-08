import { db } from "../src/lib/db";

async function duplicateClinic() {
  console.log("Fetching source clinic (default-clinic-id)...");
  const source = await db.clinic.findUnique({
    where: { id: "default-clinic-id" },
    include: {
      adminUsers: true,
      operatingHours: true,
      allowances: {
        include: {
          employees: true,
        },
      },
      employees: {
        include: {
          allowances: true,
          customOperatingHours: true,
        },
      },
      attendanceLogs: true,
      publicHolidays: true,
      devices: true,
      leaveRequests: true,
    },
  });

  if (!source) {
    throw new Error("Source clinic 'default-clinic-id' not found in database!");
  }

  const targetClinicId = "local-dev-clinic-id";
  const targetClinicCode = "MEDSYNC_DEV";
  const targetClinicName = "SMILE HUB PREMIUM DENTAL CARE (LOCAL TEST)";

  console.log(`Cloning clinic into '${targetClinicId}' (${targetClinicName})...`);

  // 1. Upsert Target Clinic
  const targetClinic = await db.clinic.upsert({
    where: { id: targetClinicId },
    create: {
      id: targetClinicId,
      clinicCode: targetClinicCode,
      name: targetClinicName,
      address: source.address,
      phone: source.phone,
      email: source.email,
      logoUrl: source.logoUrl,
      epfRegNo: source.epfRegNo,
      etfRegNo: source.etfRegNo,
      epfEmployeeRate: source.epfEmployeeRate,
      epfEmployerRate: source.epfEmployerRate,
      etfRate: source.etfRate,
      workingDaysPerMonth: source.workingDaysPerMonth,
      globalWorkedDayBonus: source.globalWorkedDayBonus,
      globalPunctualBonus: source.globalPunctualBonus,
      globalIncomeBonusPct: source.globalIncomeBonusPct,
      otCalculationType: source.otCalculationType,
      otGracePeriodMinutes: source.otGracePeriodMinutes,
      otRateBasis: source.otRateBasis,
      otMultiplier: source.otMultiplier,
      punctualGraceType: source.punctualGraceType,
      punctualGraceMinutes: source.punctualGraceMinutes,
    },
    update: {
      clinicCode: targetClinicCode,
      name: targetClinicName,
      address: source.address,
      phone: source.phone,
      email: source.email,
      logoUrl: source.logoUrl,
      epfRegNo: source.epfRegNo,
      etfRegNo: source.etfRegNo,
      epfEmployeeRate: source.epfEmployeeRate,
      epfEmployerRate: source.epfEmployerRate,
      etfRate: source.etfRate,
      workingDaysPerMonth: source.workingDaysPerMonth,
      globalWorkedDayBonus: source.globalWorkedDayBonus,
      globalPunctualBonus: source.globalPunctualBonus,
      globalIncomeBonusPct: source.globalIncomeBonusPct,
      otCalculationType: source.otCalculationType,
      otGracePeriodMinutes: source.otGracePeriodMinutes,
      otRateBasis: source.otRateBasis,
      otMultiplier: source.otMultiplier,
      punctualGraceType: source.punctualGraceType,
      punctualGraceMinutes: source.punctualGraceMinutes,
    },
  });
  console.log("✓ Clinic cloned:", targetClinic.id, targetClinic.name);

  // 2. Clone Admin User
  for (const admin of source.adminUsers) {
    await db.adminUser.upsert({
      where: {
        clinicId_username: {
          clinicId: targetClinicId,
          username: admin.username,
        },
      },
      create: {
        clinicId: targetClinicId,
        username: admin.username,
        password: admin.password,
        name: `${admin.name} (Dev)`,
        role: admin.role,
      },
      update: {
        password: admin.password,
        name: `${admin.name} (Dev)`,
        role: admin.role,
      },
    });
  }
  console.log(`✓ Cloned ${source.adminUsers.length} admin user(s)`);

  // 3. Clone Clinic Operating Hours
  for (const op of source.operatingHours) {
    await db.clinicOperatingHours.upsert({
      where: {
        clinicId_dayOfWeek: {
          clinicId: targetClinicId,
          dayOfWeek: op.dayOfWeek,
        },
      },
      create: {
        clinicId: targetClinicId,
        dayOfWeek: op.dayOfWeek,
        isOpen: op.isOpen,
        startTime: op.startTime,
        endTime: op.endTime,
      },
      update: {
        isOpen: op.isOpen,
        startTime: op.startTime,
        endTime: op.endTime,
      },
    });
  }
  console.log(`✓ Cloned ${source.operatingHours.length} operating hours`);

  // 4. Clone Allowances
  const allowanceMap = new Map<string, string>(); // oldId -> newId
  for (const al of source.allowances) {
    let targetAl = await db.allowance.findFirst({
      where: { clinicId: targetClinicId, name: al.name },
    });
    if (!targetAl) {
      targetAl = await db.allowance.create({
        data: {
          clinicId: targetClinicId,
          name: al.name,
          description: al.description,
          amount: al.amount,
          type: al.type,
          isTaxable: al.isTaxable,
          epfApplicable: al.epfApplicable,
        },
      });
    }
    allowanceMap.set(al.id, targetAl.id);
  }
  console.log(`✓ Cloned ${source.allowances.length} allowance(s)`);

  // 5. Clone Employees
  const employeeMap = new Map<string, string>(); // oldId -> newId
  for (const emp of source.employees) {
    let targetEmp = await db.employee.findFirst({
      where: { clinicId: targetClinicId, biometricId: emp.biometricId },
    });

    if (!targetEmp) {
      targetEmp = await db.employee.create({
        data: {
          clinicId: targetClinicId,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone,
          role: emp.role,
          payType: emp.payType,
          basicSalary: emp.basicSalary,
          hourlyRate: emp.hourlyRate,
          sessionRate: emp.sessionRate,
          commissionRate: emp.commissionRate,
          biometricId: emp.biometricId,
          epfEligible: emp.epfEligible,
          taxable: emp.taxable,
          active: emp.active,
          attendanceBonusRate: emp.attendanceBonusRate,
          punctualBonusRate: emp.punctualBonusRate,
          incomeBonusPercentage: emp.incomeBonusPercentage,
        },
      });
    }

    employeeMap.set(emp.id, targetEmp.id);

    // Clone custom operating hours
    for (const customOp of emp.customOperatingHours) {
      await db.employeeOperatingHours.upsert({
        where: {
          employeeId_dayOfWeek: {
            employeeId: targetEmp.id,
            dayOfWeek: customOp.dayOfWeek,
          },
        },
        create: {
          employeeId: targetEmp.id,
          dayOfWeek: customOp.dayOfWeek,
          isOpen: customOp.isOpen,
          startTime: customOp.startTime,
          endTime: customOp.endTime,
        },
        update: {
          isOpen: customOp.isOpen,
          startTime: customOp.startTime,
          endTime: customOp.endTime,
        },
      });
    }

    // Clone assigned employee allowances
    for (const ea of emp.allowances) {
      const mappedAllowanceId = allowanceMap.get(ea.allowanceId);
      if (mappedAllowanceId) {
        const existingEA = await db.employeeAllowance.findFirst({
          where: { employeeId: targetEmp.id, allowanceId: mappedAllowanceId },
        });
        if (!existingEA) {
          await db.employeeAllowance.create({
            data: {
              employeeId: targetEmp.id,
              allowanceId: mappedAllowanceId,
              overrideAmount: ea.overrideAmount,
            },
          });
        }
      }
    }
  }
  console.log(`✓ Cloned ${source.employees.length} employee(s) with allowances & schedules`);

  // 6. Clone Attendance Logs
  let logsCloned = 0;
  for (const log of source.attendanceLogs) {
    const targetEmpId = employeeMap.get(log.employeeId);
    if (!targetEmpId) continue;

    const existingLog = await db.attendanceLog.findFirst({
      where: {
        clinicId: targetClinicId,
        employeeId: targetEmpId,
        date: log.date,
      },
    });

    if (!existingLog) {
      await db.attendanceLog.create({
        data: {
          clinicId: targetClinicId,
          employeeId: targetEmpId,
          date: log.date,
          checkIn: log.checkIn,
          checkOut: log.checkOut,
          status: log.status,
          overtimeHours: log.overtimeHours,
          noPayHours: log.noPayHours,
          authMethod: log.authMethod,
          deviceId: log.deviceId,
        },
      });
      logsCloned++;
    }
  }
  console.log(`✓ Cloned ${logsCloned} attendance log(s)`);

  // 7. Clone Public Holidays
  for (const hol of source.publicHolidays) {
    const existingHol = await db.publicHoliday.findFirst({
      where: { clinicId: targetClinicId, date: hol.date, name: hol.name },
    });
    if (!existingHol) {
      await db.publicHoliday.create({
        data: {
          clinicId: targetClinicId,
          date: hol.date,
          name: hol.name,
          isDoubleOT: hol.isDoubleOT,
        },
      });
    }
  }
  console.log(`✓ Cloned ${source.publicHolidays.length} public holiday(s)`);

  // 8. Clone Biometric Devices
  for (const dev of source.devices) {
    const devSerial = `${dev.serialNumber}-DEV`;
    await db.biometricDevice.upsert({
      where: { serialNumber: devSerial },
      create: {
        clinicId: targetClinicId,
        name: `${dev.name} (Dev)`,
        model: dev.model,
        serialNumber: devSerial,
        location: `${dev.location} [Dev Mode]`,
        status: dev.status,
        protocol: dev.protocol,
        ipAddress: dev.ipAddress,
      },
      update: {
        clinicId: targetClinicId,
        name: `${dev.name} (Dev)`,
        status: dev.status,
        ipAddress: dev.ipAddress,
      },
    });
  }
  console.log(`✓ Cloned ${source.devices.length} biometric device(s)`);

  console.log("\n=======================================================");
  console.log("🎉 SUCCESS: Hosted clinic duplicated successfully!");
  console.log(`Clinic ID: ${targetClinicId}`);
  console.log(`Clinic Name: ${targetClinicName}`);
  console.log(`Admin Login: username="admin", password="admin123"`);
  console.log("=======================================================");
}

duplicateClinic()
  .catch((err) => {
    console.error("Duplication failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
