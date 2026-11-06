// MedSync Clinic OS — Interactive Marketing Engine
// Built for Smile Hub Dental Practice Architecture

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. Interactive Smile Hub Clinical Team Simulator
  // =========================================================================
  const dentalStaffData = {
    assistant: {
      name: "Dilani D.",
      role: "Dental Chairside Assistant · Station #Chair-2",
      bioId: "Face ID #SH005 (Hikvision DS-K1T)",
      shifts: "22 Working Days · Split Morning/Evening Shift",
      hours: "08:00 AM – 01:30 PM & 04:00 PM – 07:30 PM",
      basic: "LKR 60,000.00",
      ot: "+ LKR 7,850.00 (14 hrs Evening OT @ 1.5x)",
      allowance: "+ LKR 5,000.00 (Sterilization Hazard)",
      puncBonus: "+ LKR 4,400.00 (22 Days Punctual)",
      epf: "- LKR 4,800.00",
      apit: "LKR 0.00 (Below APIT Threshold)",
      net: "LKR 72,450.00",
      employerEpf: "LKR 7,200.00 (12%)",
      employerEtf: "LKR 1,800.00 (3%)",
      c3Status: "CBSL Certified Match",
      recentPunch: "07:53:12 AM · Facial Recognition (Terminal 01 - Reception)"
    },
    nurse: {
      name: "Deshani T.",
      role: "Lead Dental Nurse & Clinical Coordinator",
      bioId: "Fingerprint ID #SH001 (Hikvision DS-K1T)",
      shifts: "24 Working Days · Full Day & Ortho Surgery Assist",
      hours: "08:00 AM – 06:00 PM (Clinical Operations)",
      basic: "LKR 75,000.00",
      ot: "+ LKR 12,450.00 (18 hrs Post-Shift Surgery OT)",
      allowance: "+ LKR 9,000.00 (Clinical Lead & Inventory)",
      puncBonus: "+ LKR 4,800.00 (24 Days Punctual)",
      epf: "- LKR 6,000.00",
      apit: "- LKR 1,250.00 (Withholding APIT)",
      net: "LKR 94,000.00",
      employerEpf: "LKR 9,000.00 (12%)",
      employerEtf: "LKR 2,250.00 (3%)",
      c3Status: "CBSL Certified Match",
      recentPunch: "07:48:05 AM · Fingerprint Scan (Terminal 02 - Staff Lobby)"
    },
    doctor: {
      name: "Dr. Jayasuriya, BDS, MD",
      role: "Consultant Orthodontist & Dental Surgeon",
      bioId: "SLMC Reg #D-9402 · RFID Card #SH101",
      shifts: "16 Scheduled Clinic Sessions · 4 Surgical Callouts",
      hours: "Consulting & Minor Surgery Appointments",
      basic: "LKR 220,000.00",
      ot: "+ LKR 36,000.00 (Sunday Emergency Clinic Callout)",
      allowance: "+ LKR 15,000.00 (Implant Surgery Allowance)",
      puncBonus: "LKR 0.00 (Consultant Exemption)",
      epf: "- LKR 17,600.00",
      apit: "- LKR 14,800.00 (Inland Revenue APIT Slabs)",
      net: "LKR 238,600.00",
      employerEpf: "LKR 26,400.00 (12%)",
      employerEtf: "LKR 6,600.00 (3%)",
      c3Status: "CBSL Certified Match",
      recentPunch: "08:15:20 AM · RFID Keycard (Terminal 01 - Reception)"
    },
    reception: {
      name: "Nikila S.",
      role: "Front Desk & Patient Care Coordinator",
      bioId: "Face ID #SH002 (Hikvision DS-K1T)",
      shifts: "22 Days Full-Shift · 4 Saturday Appointments",
      hours: "07:45 AM – 05:00 PM (Reception Desk)",
      basic: "LKR 55,000.00",
      ot: "+ LKR 5,725.00 (Saturday Evening Overtime)",
      allowance: "+ LKR 3,000.00 (Cash Handling Allowance)",
      puncBonus: "+ LKR 4,400.00 (22 Days Punctual)",
      epf: "- LKR 4,400.00",
      apit: "LKR 0.00 (Below APIT Threshold)",
      net: "LKR 63,725.00",
      employerEpf: "LKR 6,600.00 (12%)",
      employerEtf: "LKR 1,650.00 (3%)",
      c3Status: "CBSL Certified Match",
      recentPunch: "07:42:55 AM · Facial Recognition (Terminal 01 - Reception)"
    }
  };

  const staffPillBtns = document.querySelectorAll('.staff-pill-btn');
  const simStaffName = document.getElementById('simStaffName');
  const simStaffRole = document.getElementById('simStaffRole');
  const simBioId = document.getElementById('simBioId');
  const simShiftHours = document.getElementById('simShiftHours');
  const simRecentPunch = document.getElementById('simRecentPunch');
  const simMathBasic = document.getElementById('simMathBasic');
  const simMathOT = document.getElementById('simMathOT');
  const simMathAllowance = document.getElementById('simMathAllowance');
  const simMathPunc = document.getElementById('simMathPunc');
  const simMathEPF = document.getElementById('simMathEPF');
  const simMathAPIT = document.getElementById('simMathAPIT');
  const simMathNet = document.getElementById('simMathNet');
  const simEmployerEpf = document.getElementById('simEmployerEpf');
  const simEmployerEtf = document.getElementById('simEmployerEtf');
  const simFinalizeBtn = document.getElementById('simFinalizeBtn');
  const simLockBadge = document.getElementById('simLockBadge');
  const simResetBtn = document.getElementById('simResetBtn');

  function renderStaffData(key) {
    const d = dentalStaffData[key];
    if (!d) return;

    if (simStaffName) simStaffName.textContent = d.name;
    if (simStaffRole) simStaffRole.textContent = d.role;
    if (simBioId) simBioId.textContent = d.bioId;
    if (simShiftHours) simShiftHours.textContent = d.hours;
    if (simRecentPunch) simRecentPunch.textContent = d.recentPunch;
    if (simMathBasic) simMathBasic.textContent = d.basic;
    if (simMathOT) simMathOT.textContent = d.ot;
    if (simMathAllowance) simMathAllowance.textContent = d.allowance;
    if (simMathPunc) simMathPunc.textContent = d.puncBonus;
    if (simMathEPF) simMathEPF.textContent = d.epf;
    if (simMathAPIT) simMathAPIT.textContent = d.apit;
    if (simMathNet) simMathNet.textContent = d.net;
    if (simEmployerEpf) simEmployerEpf.textContent = d.employerEpf;
    if (simEmployerEtf) simEmployerEtf.textContent = d.employerEtf;
  }

  staffPillBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      staffPillBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const role = btn.getAttribute('data-role');
      renderStaffData(role);
    });
  });

  if (simFinalizeBtn) {
    simFinalizeBtn.addEventListener('click', () => {
      simLockBadge.textContent = "FINALIZED & IMMUTABLE";
      simLockBadge.style.background = "#D1FAE5";
      simLockBadge.style.color = "#065F46";
      simLockBadge.style.borderColor = "#A7F3D0";
      simFinalizeBtn.style.display = "none";
      if (simResetBtn) simResetBtn.style.display = "inline-flex";
    });
  }

  if (simResetBtn) {
    simResetBtn.addEventListener('click', () => {
      simLockBadge.textContent = "ACTIVE CYCLE (DRAFT)";
      simLockBadge.style.background = "#FEF3C7";
      simLockBadge.style.color = "#92400E";
      simLockBadge.style.borderColor = "#FDE68A";
      simFinalizeBtn.style.display = "inline-flex";
      simResetBtn.style.display = "none";
    });
  }

  // =========================================================================
  // 2. Interactive System Tour (Screenshots Showcase)
  // =========================================================================
  const tourScreens = {
    payroll: {
      title: "Statutory Payroll Engine & Frozen Wage Ledger",
      badge: "FINALIZED CYCLE · OCT 2026",
      img: "/marketing/assets/screenshots/payroll_finalized_light.png",
      desc: "Aggregates raw Hikvision punches, calculates statutory employee EPF (8%), employer EPF (12%), employer ETF (3%), and APIT withholding tax. Sealing the month permanently locks individual salary slips against retroactive changes.",
      features: [
        "Historical Salary Preservation (Past unfinalized and finalized records protected)",
        "Zero-Pay & Punctuality Bonus Automation (LKR 200/day punctuality allowance)",
        "Individual Payslip PDF Generation with Official Clinic Seal"
      ]
    },
    attendance: {
      title: "Real-Time Biometric Punch Stream",
      badge: "HIKVISION LAN & ISUP PUSH",
      img: "/marketing/assets/screenshots/attendance_light.png",
      desc: "Live stream of incoming clock-ins from wall-mounted terminals at the dental reception and staff room. Automatic status detection (On-Time, Late, Half-Day) against custom clinic shifts.",
      features: [
        "180ms Latency Hardware Push directly over clinic LAN (No USB flash drives)",
        "Biometric Method Tagging (Facial recognition, fingerprint, RFID card)",
        "Auto-calculation of overtime hours and grace period compliance"
      ]
    },
    reports: {
      title: "Central Bank EPF Form C3 & Regulatory Archive",
      badge: "EPF FORM C3 & ETF 3%",
      img: "/marketing/assets/screenshots/reports_light.png",
      desc: "Produce Central Bank of Sri Lanka EPF Form C3 electronic submission files compatible with Commercial Bank, BOC, and Sampath Bank corporate payment portals.",
      features: [
        "Certified 8% + 12% EPF and 3% ETF statutory mathematical formatting",
        "Multi-period historical wage comparisons and staff headcount audits",
        "Full tamper-proof audit trails for Department of Labour inspections"
      ]
    },
    dashboard: {
      title: "Live Dental Surgery Command Dashboard",
      badge: "CLINIC COMMAND",
      img: "/marketing/assets/screenshots/dashboard_light.png",
      desc: "Instant operational command over all clinical staff, on-duty surgeons, chairside assistants, and approved leaves across your practice.",
      features: [
        "Live on-duty status indicators for dental assistants and receptionists",
        "Monthly punctuality rate tracking and real-time biometric heartbeat",
        "Statutory payroll pool projections updated with every incoming punch"
      ]
    },
    hours: {
      title: "Split-Shift & Weekend Clinic Rostering",
      badge: "OPERATING HOURS ENGINE",
      img: "/marketing/assets/screenshots/settings_operating_hours_light.png",
      desc: "Configure morning OPD sessions, evening doctor appointments, and Sunday emergency clinics. Set personalized schedules for part-time specialists and visiting surgeons.",
      features: [
        "Independent weekday, Saturday, and Sunday shift operating windows",
        "15-minute punctuality grace periods before overtime counts",
        "Per-employee custom schedule overrides for visiting consultants"
      ]
    },
    salary: {
      title: "Statutory Sri Lankan Rates & EPF Configuration",
      badge: "CENTRAL BANK COMPLIANCE",
      img: "/marketing/assets/screenshots/settings_salary_light.png",
      desc: "Centralized statutory rules strictly adherent to Sri Lankan labour laws. Configure employee EPF rate (8%), employer EPF rate (12%), ETF rate (3%), and gazetted holiday multipliers.",
      features: [
        "Pre-loaded Sri Lankan Poya Days & Gazette Mercantile Holidays",
        "Automatic 1.5x regular overtime and 2.0x holiday emergency rates",
        "Inland Revenue APIT withholding slabs calculation"
      ]
    }
  };

  const tourTabBtns = document.querySelectorAll('.tour-tab-btn');
  const tourTitle = document.getElementById('tourTitle');
  const tourBadge = document.getElementById('tourBadge');
  const tourImg = document.getElementById('tourImg');
  const tourDesc = document.getElementById('tourDesc');
  const tourFeatureList = document.getElementById('tourFeatureList');

  function renderTour(key) {
    const s = tourScreens[key];
    if (!s) return;

    if (tourTitle) tourTitle.textContent = s.title;
    if (tourBadge) tourBadge.textContent = s.badge;
    if (tourDesc) tourDesc.textContent = s.desc;
    if (tourImg) {
      tourImg.style.opacity = '0';
      setTimeout(() => {
        tourImg.src = s.img;
        tourImg.style.opacity = '1';
      }, 150);
    }
    if (tourFeatureList) {
      tourFeatureList.innerHTML = s.features.map(f => `
        <li class="tour-feature-item">
          <svg class="tour-check-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
          <span>${f}</span>
        </li>
      `).join('');
    }
  }

  tourTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tourTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const screenKey = btn.getAttribute('data-screen');
      renderTour(screenKey);
    });
  });

  // =========================================================================
  // 3. Demo Walkthrough Modal
  // =========================================================================
  const openModalBtns = document.querySelectorAll('.open-demo-modal');
  const modalOverlay = document.getElementById('demoModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const demoForm = document.getElementById('demoAuditForm');
  const modalSuccessMsg = document.getElementById('modalSuccessMsg');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modalOverlay) modalOverlay.classList.add('active');
    });
  });

  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });
  }

  if (demoForm) {
    demoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      demoForm.style.display = 'none';
      if (modalSuccessMsg) modalSuccessMsg.style.display = 'block';
    });
  }

  // Default initialization
  renderStaffData('assistant');
  renderTour('payroll');
});
