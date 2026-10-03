import puppeteer from "puppeteer";
import { spawn } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "marketing", "assets", "screenshots");
const APP_URL = "http://localhost:3000";
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pg = null;

async function safeEval(fn, ...args) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await pg.evaluate(fn, ...args);
    } catch (e) {
      if (attempt < 2) {
        await sleep(500);
        continue;
      }
      throw e;
    }
  }
}

async function unlockPinIfNeeded() {
  const pinModalVisible = await pg.evaluate(() =>
    !!document.querySelector("input[type='password'][placeholder='••••']")
  ).catch(() => false);

  if (pinModalVisible) {
    console.log("  🔐  Entering admin PIN 1234...");
    const pinInput = await pg.$("input[type='password'][placeholder='••••']");
    if (pinInput) {
      await pinInput.click({ clickCount: 3 });
      await pinInput.type("1234", { delay: 40 });
    }
    await sleep(300);
    await safeEval(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === "Unlock Access"
      );
      if (btn) btn.click();
    }).catch(() => {});
    await sleep(1500);
  }
}

async function clickNav(label) {
  console.log(`  👉  Navigating to: ${label}`);
  try {
    await pg.waitForFunction(
      (lbl) => {
        const allButtons = [...document.querySelectorAll("button")];
        return allButtons.some(
          (b) =>
            [...b.querySelectorAll("span")].some((s) => s.textContent.trim() === lbl) ||
            b.textContent.replace(/\s+/g, " ").trim().includes(lbl)
        );
      },
      { timeout: 8000 },
      label
    );
  } catch {
    console.warn(`  ⚠  Nav item not found in time: "${label}"`);
  }

  await safeEval((lbl) => {
    const allButtons = [...document.querySelectorAll("button")];
    let el = allButtons.find((b) =>
      [...b.querySelectorAll("span")].some((s) => s.textContent.trim() === lbl)
    );
    if (!el) {
      el = allButtons.find((b) =>
        b.textContent.replace(/\s+/g, " ").trim().includes(lbl)
      );
    }
    if (el) el.click();
  }, label);

  await sleep(1800);
  await unlockPinIfNeeded();
  await sleep(1000);
}

async function clickSettingsSubTab(label) {
  console.log(`    ↳ Settings subtab: ${label}`);
  await safeEval((lbl) => {
    const allButtons = [...document.querySelectorAll("button")];
    const el = allButtons.find((b) =>
      [...b.querySelectorAll("span")].some((s) => s.textContent.trim() === lbl) ||
      b.textContent.replace(/\s+/g, " ").trim().includes(lbl)
    );
    if (el) el.click();
  }, label);
  await sleep(1200);
}

async function takeShot(filename, scrollY = 0) {
  if (scrollY > 0) {
    await pg.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scrollY);
    await sleep(400);
  } else {
    await pg.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await sleep(200);
  }
  const dest = join(OUT_DIR, filename);
  await pg.screenshot({ path: dest });
  console.log(`  📸  Saved ${filename}`);
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // 1. Check if server already running
  let devServer = null;
  let serverRunning = false;
  try {
    const res = await fetch(APP_URL);
    if (res.ok || res.status === 200 || res.status === 307 || res.status === 308) {
      serverRunning = true;
      console.log("✓   Next.js dev server is already running");
    }
  } catch {}

  if (!serverRunning) {
    console.log("▶   Starting Next.js dev server on port 3000...");
    devServer = spawn("npm", ["run", "dev", "--", "--port", "3000"], {
      cwd: ROOT,
      stdio: "pipe",
    });

    await new Promise((res, rej) => {
      const timeout = setTimeout(() => rej(new Error("Dev server timed out")), 90_000);
      const check = (data) => {
        if (data.toString().match(/ready|localhost:3000/i)) {
          clearTimeout(timeout);
          res();
        }
      };
      devServer.stdout.on("data", check);
      devServer.stderr.on("data", check);
    });
    await sleep(2500);
    console.log("✓   Dev server ready");
  }

  // 2. Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "--disable-infobars",
      "--no-default-browser-check",
      "--disable-extensions",
    ],
  });

  try {
    const pages = await browser.pages();
    pg = pages[0] || (await browser.newPage());
    await pg.setViewport(VIEWPORT);

    console.log("🌐  Opening MedSync login page...");
    await pg.goto(APP_URL, { waitUntil: "networkidle2", timeout: 45_000 });
    await sleep(1000);

    // Save Login Screenshot
    await takeShot("login.png");

    // Click demo login button
    const demoBtn = await pg.$("button[title*='Demo']") ??
      (await pg
        .evaluateHandle(() =>
          [...document.querySelectorAll("button")].find(
            (b) =>
              b.textContent.includes("Quick Demo Login") ||
              b.textContent.includes("Demo")
          )
        )
        .then((h) => h.asElement())
        .catch(() => null));

    if (demoBtn) {
      await demoBtn.click();
      await sleep(600);
    }

    // Click SIGN IN
    await safeEval(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) =>
          b.textContent.trim() === "SIGN IN" ||
          (b.textContent.includes("SIGN") && b.textContent.includes("IN"))
      );
      if (btn) btn.click();
    });

    // Wait for Dashboard to mount
    await pg.waitForFunction(
      () =>
        [...document.querySelectorAll("button")].some((b) =>
          [...b.querySelectorAll("span")].some((s) => s.textContent.trim() === "Attendance")
        ),
      { timeout: 25_000 }
    );
    await sleep(3500); // let charts & summary load

    // 1. Dashboard Screenshot
    console.log("📸  Capturing Dashboard...");
    await takeShot("dashboard.png");

    // 2. Attendance Screenshot
    await clickNav("Attendance");
    await sleep(1500);
    console.log("📸  Capturing Attendance...");
    await takeShot("attendance.png");

    // 3. Leave Manager Screenshot
    await clickNav("Leave Manager");
    await sleep(1500);
    console.log("📸  Capturing Leave Manager...");
    await takeShot("leave.png");

    // 4. Payroll Engine (Draft month)
    await clickNav("Payroll Engine");
    await sleep(2000);
    console.log("📸  Capturing Payroll Engine (Draft Calculation)...");
    await takeShot("payroll_draft.png");

    // Click "Finalize Month" button!
    console.log("⚡  Finalizing Payroll Month...");
    const finalized = await safeEval(() => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent.includes("Finalize Month")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`  Finalize clicked: ${finalized}`);
    await sleep(2500);

    // 5. Payroll Finalized Screenshot
    console.log("📸  Capturing Payroll Engine (Finalized)...");
    await takeShot("payroll_finalized.png");

    // 6. Reports Screenshot (now showing finalized month history!)
    await clickNav("Reports");
    await sleep(2000);
    console.log("📸  Capturing Reports...");
    await takeShot("reports.png");

    // 7. Settings: Salary & EPF
    await clickNav("Settings");
    await sleep(1500);
    await clickSettingsSubTab("Salary & Dynamic Bonuses");
    console.log("📸  Capturing Settings (Salary & Dynamic Bonuses)...");
    await takeShot("settings_salary.png");

    // 8. Settings: Operating Hours
    await clickSettingsSubTab("Operating Hours");
    console.log("📸  Capturing Settings (Operating Hours)...");
    await takeShot("settings_operating_hours.png");

    // 9. Settings: Biometric & AI Services
    await clickSettingsSubTab("Biometric & AI Services");
    console.log("📸  Capturing Settings (Biometric Terminal)...");
    await takeShot("settings_biometric.png");

    // 10. Self-Service
    await clickNav("Self-Service");
    await sleep(1500);
    console.log("📸  Capturing Self-Service Portal...");
    await takeShot("self_service.png");

    // ════════════════════════════════════════════════════════════════════════
    // ☀️ LIGHT MODE SCREENSHOTS
    // ════════════════════════════════════════════════════════════════════════
    console.log("\n☀️  Switching to Light Mode...");
    await safeEval(() => {
      const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Light Mode"));
      if (btn) btn.click();
    });
    await sleep(2000);

    // Light Dashboard
    await clickNav("Dashboard");
    await sleep(1500);
    console.log("📸  Capturing Light Dashboard...");
    await takeShot("dashboard_light.png");

    // Light Attendance
    await clickNav("Attendance");
    await sleep(1500);
    console.log("📸  Capturing Light Attendance...");
    await takeShot("attendance_light.png");

    // Light Leave
    await clickNav("Leave Manager");
    await sleep(1500);
    console.log("📸  Capturing Light Leave Manager...");
    await takeShot("leave_light.png");

    // Light Payroll Finalized
    await clickNav("Payroll Engine");
    await sleep(1500);
    console.log("📸  Capturing Light Payroll Engine...");
    await takeShot("payroll_finalized_light.png");

    // Light Reports
    await clickNav("Reports");
    await sleep(1500);
    console.log("📸  Capturing Light Reports...");
    await takeShot("reports_light.png");

    // Light Settings: Salary
    await clickNav("Settings");
    await sleep(1500);
    await clickSettingsSubTab("Salary & Dynamic Bonuses");
    console.log("📸  Capturing Light Settings (Salary)...");
    await takeShot("settings_salary_light.png");

    // Light Settings: Operating Hours
    await clickSettingsSubTab("Operating Hours");
    console.log("📸  Capturing Light Settings (Hours)...");
    await takeShot("settings_operating_hours_light.png");

    // Light Settings: Biometric
    await clickSettingsSubTab("Biometric & AI Services");
    console.log("📸  Capturing Light Settings (Biometric)...");
    await takeShot("settings_biometric_light.png");

    // Light Self-Service
    await clickNav("Self-Service");
    await sleep(1500);
    console.log("📸  Capturing Light Self-Service...");
    await takeShot("self_service_light.png");

    console.log("\n🎉  All dark & light mode screenshots captured successfully!");
  } finally {
    await browser.close();
    if (devServer) {
      devServer.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error("❌  Capture failed:", err);
  process.exit(1);
});
