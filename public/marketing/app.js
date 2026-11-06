// MedSync Clinic OS — Bespoke Editorial Site Interactions

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. Hero Interactive Clinic Ledger (Sri Lankan Clinic Simulation)
  // =========================================================================
  const staffData = {
    matron: {
      name: "Sister Nirmala Jayasinghe",
      role: "Head Matron · EPF #SUN-004 · Hikvision Face ID #104",
      status: "100% PUNCTUAL · 22/22 DAYS",
      basic: "LKR 95,000.00",
      ot: "+ LKR 12,468.75",
      allowance: "+ LKR 8,500.00",
      epf: "- LKR 7,600.00",
      apit: "- LKR 1,850.00",
      net: "LKR 106,518.75",
      employerEpf: "LKR 11,400.00",
      employerEtf: "LKR 2,850.00"
    },
    doctor: {
      name: "Dr. V. Jayasuriya, MBBS, MS",
      role: "Consultant Surgeon · Visiting OPD · Registration #SLMC-18294",
      status: "14 SURGICAL SESSIONS · 0 ABSENCES",
      basic: "LKR 240,000.00",
      ot: "+ LKR 45,000.00 (Emergency Callouts)",
      allowance: "+ LKR 15,000.00 (Theatre Allowance)",
      epf: "- LKR 19,200.00",
      apit: "- LKR 18,500.00 (Inland Revenue APIT)",
      net: "LKR 262,300.00",
      employerEpf: "LKR 28,800.00",
      employerEtf: "LKR 7,200.00"
    },
    reception: {
      name: "T. Fernando",
      role: "Dispensary & Reception Lead · EPF #SUN-009 · Fingerprint #202",
      status: "18/18 WEEKDAYS · 4/4 SATURDAY HALF-DAYS",
      basic: "LKR 65,000.00",
      ot: "+ LKR 5,200.00 (Saturday Evening)",
      allowance: "+ LKR 4,000.00 (Attendance Bonus)",
      epf: "- LKR 5,200.00",
      apit: "LKR 0.00 (Below APIT Threshold)",
      net: "LKR 69,000.00",
      employerEpf: "LKR 7,800.00",
      employerEtf: "LKR 1,950.00"
    }
  };

  const staffPillBtns = document.querySelectorAll('.staff-pill-btn');
  const heroStaffName = document.getElementById('heroStaffName');
  const heroStaffRole = document.getElementById('heroStaffRole');
  const heroAttendanceStatus = document.getElementById('heroAttendanceStatus');
  const heroMathBasic = document.getElementById('heroMathBasic');
  const heroMathOT = document.getElementById('heroMathOT');
  const heroMathAllowance = document.getElementById('heroMathAllowance');
  const heroMathEPF = document.getElementById('heroMathEPF');
  const heroMathAPIT = document.getElementById('heroMathAPIT');
  const heroMathNet = document.getElementById('heroMathNet');
  const heroLockStamp = document.getElementById('heroLockStamp');
  const simulateFinalizeBtn = document.getElementById('simulateFinalizeBtn');
  const resetLedgerBtn = document.getElementById('resetLedgerBtn');

  let currentRole = 'matron';

  function renderStaffData(roleKey) {
    const data = staffData[roleKey];
    if (!data) return;

    heroStaffName.textContent = data.name;
    heroStaffRole.textContent = data.role;
    heroAttendanceStatus.textContent = data.status;
    heroMathBasic.textContent = data.basic;
    heroMathOT.textContent = data.ot;
    heroMathAllowance.textContent = data.allowance;
    heroMathEPF.textContent = data.epf;
    heroMathAPIT.textContent = data.apit;
    heroMathNet.textContent = data.net;
  }

  staffPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      staffPillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRole = btn.getAttribute('data-role');
      renderStaffData(currentRole);
    });
  });

  if (simulateFinalizeBtn) {
    simulateFinalizeBtn.addEventListener('click', () => {
      isFinalized = true;
      heroLockStamp.textContent = "FINALIZED & LOCKED";
      heroLockStamp.style.background = "#E6F0ED";
      heroLockStamp.style.color = "#0C4E44";
      heroLockStamp.style.borderColor = "#BCD8D0";
      simulateFinalizeBtn.style.display = 'none';
      if (resetLedgerBtn) resetLedgerBtn.style.display = 'inline-flex';
    });
  }

  if (resetLedgerBtn) {
    resetLedgerBtn.addEventListener('click', () => {
      isFinalized = false;
      heroLockStamp.textContent = "DRAFT AUDIT";
      heroLockStamp.style.background = "#FEF3C7";
      heroLockStamp.style.color = "#92400E";
      heroLockStamp.style.borderColor = "#FDE68A";
      simulateFinalizeBtn.style.display = 'inline-flex';
      resetLedgerBtn.style.display = 'none';
    });
  }

  // =========================================================================
  // 2. Unfiltered System Tour (Real Light Mode Screenshots)
  // =========================================================================
  const screenData = {
    payroll: {
      title: "Automated Sri Lankan Payroll & Audit Locking",
      badge: "STATUTORY AUDIT ENGINE",
      url: "medsync.app/payroll · Finalized Payroll Period",
      img: "assets/screenshots/payroll_finalized_light.png",
      text: "MedSync aggregates raw terminal logs, calculates base pay, overtime, punctuality bonuses, and calculates Employee EPF (8%), Employer EPF (12%), and Employer ETF (3%). Clicking 'Finalize Month' permanently seals the period with cryptographic protection.",
      callouts: [
        { title: "Permanent Lock State", desc: "Prevents post-payout edits or accidental spreadsheet corruption." },
        { title: "Central Bank Validated", desc: "Generates official C3 remittance files with one click." },
        { title: "Itemized Payslips", desc: "Complete wage statements formatted for print and direct staff download." }
      ]
    },
    reports: {
      title: "Audit Statements, Payslips & Central Bank C3",
      badge: "HISTORICAL ARCHIVE & C3",
      url: "medsync.app/reports · Statutory Reports & Export",
      img: "assets/screenshots/reports_light.png",
      text: "Every finalized month produces an immutable compliance archive. Generate individual PDF payslips with official clinic stamp, export the Central Bank EPF Form C3, and view multi-month salary comparisons.",
      callouts: [
        { title: "Electronic Form C3", desc: "Meets exact specifications of Sri Lankan commercial bank portals." },
        { title: "Clinical Payslip Format", desc: "Includes basic, allowances, OT hours, EPF/ETF splits, and net remittance." },
        { title: "Department of Labour Ready", desc: "Complete audit logs ready for any labour officer inspection." }
      ]
    },
    attendance: {
      title: "Real-Time Biometric Punch Stream",
      badge: "TERMINAL SYNCHRONIZATION",
      url: "medsync.app/attendance · Live Biometric Stream",
      img: "assets/screenshots/attendance_light.png",
      text: "Punches from your Hikvision and ZKTeco terminals stream in directly over your local clinic network. The system automatically tags punctuality status, calculates overtime hours, and records verification methods (Face, Fingerprint, RFID).",
      callouts: [
        { title: "Hardware Verification Type", desc: "Distinguishes facial scan, fingerprint, and card punch." },
        { title: "Automated Status Tagging", desc: "On-Time, Late, Half-Day, or Absent calculated against clinic shift times." },
        { title: "Zero Manual Re-typing", desc: "Eliminates USB flash drives and manual Excel data entry entirely." }
      ]
    },
    dashboard: {
      title: "Live Clinic Command & Shift Roster",
      badge: "CLINIC COMMAND",
      url: "medsync.app/dashboard · Live Operational Overview",
      img: "assets/screenshots/dashboard_light.png",
      text: "Gain complete visibility over your clinical staff at a glance. See who is currently on-duty, who is on approved leave, and monitor monthly payroll pool projections in real time.",
      callouts: [
        { title: "Live Roster Headcount", desc: "Instant visibility of nurses, doctors, and dispensary staff on shift." },
        { title: "Punctuality Analytics", desc: "Monthly punctuality percentage and attendance rate tracking." },
        { title: "Leave Conflict Detection", desc: "Prevents understaffing critical emergency and outpatient stations." }
      ]
    },
    salary: {
      title: "Statutory EPF, ETF & Overtime Multipliers",
      badge: "COMPLIANCE CONFIGURATION",
      url: "medsync.app/settings · Salary & Statutory Rules",
      img: "assets/screenshots/settings_salary_light.png",
      text: "Configure statutory rates to match Sri Lankan legal requirements. Set EPF to employee 8% / employer 12%, ETF to 3%, define overtime grace windows, and set custom hourly divisors.",
      callouts: [
        { title: "Statutory 8/12/3 Engine", desc: "Strict adherence to Central Bank and Labour Department formulas." },
        { title: "Overtime Grace Windows", desc: "Set 15 or 30-minute buffers before overtime starts counting." },
        { title: "Poya & Holiday Rates", desc: "Automated 1.5x and 2.0x multipliers for gazetted public holidays." }
      ]
    },
    biometric: {
      title: "Hikvision DS-K1T Terminal Configuration",
      badge: "HARDWARE FLEET",
      url: "medsync.app/settings · Biometric Device Fleet",
      img: "assets/screenshots/settings_biometric_light.png",
      text: "Manage all wall-mounted terminals across your practice. Enter the local IP address, port, and credentials. MedSync connects over local LAN to pull punch records and push staff biometric IDs.",
      callouts: [
        { title: "Local LAN ISAPI Streaming", desc: "Direct HTTP event streaming without intermediary cloud latency." },
        { title: "Multi-Terminal Support", desc: "Coordinate devices at main entrance, operation theatre, and pharmacy." },
        { title: "Offline Resilience Buffer", desc: "Terminals preserve punches in internal memory during power drops." }
      ]
    }
  };

  const tourNavItems = document.querySelectorAll('.tour-nav-item');
  const tourMainImage = document.getElementById('tourMainImage');
  const tourCaptionTitle = document.getElementById('tourCaptionTitle');
  const tourCaptionBadge = document.getElementById('tourCaptionBadge');
  const tourCaptionText = document.getElementById('tourCaptionText');
  const tourScreenTitle = document.getElementById('tourScreenTitle');
  const tourCalloutGrid = document.getElementById('tourCalloutGrid');

  tourNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const screenKey = item.getAttribute('data-screen');
      const data = screenData[screenKey];
      if (!data) return;

      tourNavItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      tourMainImage.src = data.img;
      tourCaptionTitle.textContent = data.title;
      tourCaptionBadge.textContent = data.badge;
      tourCaptionText.textContent = data.text;
      tourScreenTitle.textContent = data.url;

      tourCalloutGrid.innerHTML = data.callouts.map(c => `
        <div class="tour-callout-item">
          <strong>${c.title}</strong>
          <p>${c.desc}</p>
        </div>
      `).join('');
    });
  });

  // =========================================================================
  // 3. Consultation & Walkthrough Modal
  // =========================================================================
  const demoModal = document.getElementById('demoModal');
  const openModalBtns = document.querySelectorAll('.open-demo-modal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const demoForm = document.getElementById('demoRequestForm');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      demoModal.classList.add('active');
    });
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      demoModal.classList.remove('active');
    });
  }

  if (demoModal) {
    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) demoModal.classList.remove('active');
    });
  }

  if (demoForm) {
    demoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const clinicName = document.getElementById('modalClinicName').value;
      alert(`Thank you. A Code Knox clinical systems specialist has received your request for "${clinicName}". We will contact you within 2 business hours to schedule your live walkthrough.`);
      demoModal.classList.remove('active');
      demoForm.reset();
    });
  }
});
