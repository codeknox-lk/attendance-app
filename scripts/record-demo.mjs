/**
 * MedSync – Automated Demo Video Recorder (v2 – stable)
 * -------------------------------------------------------
 * • Uses explicit per-step screenshots (no setInterval) → no detached-frame crashes
 * • Each "scene" calls captureFrames(N, fps) which takes N frames synchronously
 * • Stitches PNGs → H.264 MP4 with ffmpeg
 *
 * Output : demo-output/medsync-demo.mp4
 * Usage  : npm run demo:record
 */

import puppeteer from "puppeteer";
import { spawn }  from "child_process";
import { existsSync, mkdirSync, unlinkSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

config({ path: ".env.local" });

const __dirname  = fileURLToPath(new URL(".", import.meta.url));
const ROOT       = resolve(__dirname, "..");
const OUT_DIR    = join(ROOT, "demo-output");
const FRAMES_DIR = join(OUT_DIR, "frames");
const OUTPUT_MP4 = join(OUT_DIR, "medsync-demo.mp4");
const APP_URL    = "http://localhost:3000";
const VIEWPORT   = { width: 1440, height: 900 };
const FPS        = 24;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Global page ref ─────────────────────────────────────────────────────────
let pg  = null;   // current puppeteer Page
let idx = 0;      // global frame counter

/**
 * Safe wrapper around pg.evaluate() — retries up to 3 times on
 * "detached frame" / "Target closed" errors with 600ms backoff.
 * This is the #1 cause of crashes in SPA Puppeteer automation.
 */
async function safeEval(fn, ...args) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await pg.evaluate(fn, ...args);
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("detached") || msg.includes("Target closed") || msg.includes("Session closed")) {
        if (attempt < 2) {
          await sleep(600);
          continue;
        }
      }
      // Non-retryable error — rethrow
      throw e;
    }
  }
}

/** Take `count` frames over `durationMs` milliseconds */
async function captureFrames(count, durationMs = 0) {
  const delay = durationMs > 0 ? durationMs / count : 0;
  for (let i = 0; i < count; i++) {
    try {
      const pad = String(idx).padStart(6, "0");
      await pg.screenshot({ path: join(FRAMES_DIR, `frame_${pad}.png`), type: "png" });
      idx++;
    } catch { /* frame transitioning – skip */ }
    if (delay > 0) await sleep(delay);
  }
}

/** Shorthand: capture N seconds of frames */
const captureSecs = (secs, extra = 0) => captureFrames(Math.round(FPS * secs), extra > 0 ? extra : secs * 1000);

// ─── UI helpers ──────────────────────────────────────────────────────────────

async function smoothScroll(toY, steps = 25) {
  const fromY = await safeEval(() => window.scrollY).catch(() => 0);
  const delta = toY - fromY;
  for (let i = 1; i <= steps; i++) {
    await safeEval(y => window.scrollTo({ top: y }), fromY + (delta * i / steps)).catch(() => {});
    await sleep(28);
  }
}

/** Click a nav button by its visible label text — waits for sidebar to render first */
async function clickNav(label) {
  // Wait up to 8s for the nav sidebar button with this label to appear in the DOM
  try {
    await pg.waitForFunction(
      (lbl) => {
        const allButtons = [...document.querySelectorAll("button")];
        return allButtons.some(b =>
          [...b.querySelectorAll("span")].some(s => s.textContent.trim() === lbl) ||
          b.textContent.replace(/\s+/g, " ").trim().includes(lbl)
        );
      },
      { timeout: 8000 },
      label
    );
  } catch {
    console.warn(`  ⚠  Nav item not ready after 8s: "${label}"`);
  }

  const clicked = await safeEval((lbl) => {
    // Strategy 1: find a <span> whose trimmed text exactly matches the label
    const allButtons = [...document.querySelectorAll("button")];
    let el = allButtons.find(b =>
      [...b.querySelectorAll("span")].some(s => s.textContent.trim() === lbl)
    );
    // Strategy 2: span includes (handles truncation)
    if (!el) el = allButtons.find(b =>
      [...b.querySelectorAll("span")].some(s => s.textContent.includes(lbl))
    );
    // Strategy 3: button full textContent includes label (strip whitespace)
    if (!el) el = allButtons.find(b =>
      b.textContent.replace(/\s+/g, " ").trim().includes(lbl)
    );
    // Strategy 4: any clickable element
    if (!el) {
      const all = [...document.querySelectorAll("button, a, [role='button']")];
      el = all.find(e => e.textContent.replace(/\s+/g, " ").includes(lbl));
    }
    if (el) { el.click(); return true; }
    return false;
  }, label);

  if (!clicked) console.warn(`  ⚠  Could not find nav: "${label}"`);
  // Wait for the new view to render and data to load
  await sleep(2800);

  // Handle admin PIN modal if it appears (Payroll / Settings are protected)
  const pinModalVisible = await pg.evaluate(() =>
    !!document.querySelector("input[type='password'][placeholder='••••']")
  ).catch(() => false);

  if (pinModalVisible) {
    console.log("  🔐  PIN modal — entering 1234");
    const pinInput = await pg.$("input[type='password'][placeholder='••••']");
    if (pinInput) {
      await pinInput.click({ clickCount: 3 });
      await pinInput.type("1234", { delay: 60 });
    }
    await sleep(400);
    await safeEval(() => {
      const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim() === "Unlock Access");
      if (btn) btn.click();
    }).catch(() => {});
    await sleep(1800);
  }
}


/** Inject a floating bottom-centre annotation banner */
async function showAnnotation(title, sub = "", holdMs = 3000) {
  // Inject
  await safeEval((t, s) => {
    document.getElementById("__ann__")?.remove();
    const el = document.createElement("div");
    el.id = "__ann__";
    el.innerHTML = `
      <style>
        @keyframes annIn  { from{opacity:0;transform:translateX(-50%) translateY(14px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes annOut { from{opacity:1;transform:translateX(-50%) translateY(0)} to{opacity:0;transform:translateX(-50%) translateY(8px)} }
      </style>
      <div style="position:fixed;bottom:36px;left:50%;transform:translateX(-50%);
        background:rgba(8,12,24,0.93);backdrop-filter:blur(14px);
        border:1px solid rgba(255,255,255,0.13);border-radius:14px;
        padding:13px 30px;z-index:2147483647;text-align:center;
        font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
        box-shadow:0 8px 32px rgba(0,0,0,0.55);
        animation:annIn 0.32s cubic-bezier(0.16,1,0.3,1) both;" id="__ann_inner__">
        <div style="color:#fff;font-size:15px;font-weight:700;letter-spacing:-0.2px;">${t}</div>
        ${s ? `<div style="color:rgba(255,255,255,0.52);font-size:12px;margin-top:3px;font-weight:500;">${s}</div>` : ""}
      </div>`;
    document.body.appendChild(el);
  }, title, sub);

  // Hold for (holdMs - fade-out time)
  const holdFrames = Math.max(1, Math.round(FPS * (holdMs - 380) / 1000));
  await captureFrames(holdFrames, holdMs - 380);

  // Fade out
  await safeEval(() => {
    const inner = document.getElementById("__ann_inner__");
    if (inner) inner.style.animation = "annOut 0.38s ease forwards";
  }).catch(() => {});
  await captureFrames(Math.round(FPS * 0.4), 400);
  await safeEval(() => document.getElementById("__ann__")?.remove()).catch(() => {});
}

/** Full-screen title card slide */
async function titleCard(title, sub = "", holdMs = 2800, bg = "#0F85B0") {
  await safeEval((t, s, b) => {
    document.getElementById("__tc__")?.remove();
    const el = document.createElement("div");
    el.id = "__tc__";
    el.innerHTML = `
      <style>
        @keyframes tcIn  { from{opacity:0} to{opacity:1} }
        @keyframes tcOut { from{opacity:1} to{opacity:0} }
      </style>
      <div id="__tc_inner__" style="position:fixed;inset:0;background:${b};z-index:2147483647;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
        animation:tcIn 0.4s ease both;">
        <div style="color:rgba(255,255,255,0.38);font-size:11px;font-weight:700;letter-spacing:3.5px;text-transform:uppercase;margin-bottom:18px;">MedSync • Sunrise Medical Centre</div>
        <div style="color:#fff;font-size:40px;font-weight:800;letter-spacing:-1.2px;text-align:center;max-width:620px;line-height:1.15;">${t}</div>
        ${s ? `<div style="color:rgba(255,255,255,0.62);font-size:17px;margin-top:16px;text-align:center;max-width:500px;font-weight:500;">${s}</div>` : ""}
      </div>`;
    document.body.appendChild(el);
  }, title, sub, bg);

  const holdFrames = Math.round(FPS * (holdMs - 480) / 1000);
  await captureFrames(holdFrames, holdMs - 480);

  // Fade out card
  await safeEval(() => {
    const inner = document.getElementById("__tc_inner__");
    if (inner) inner.style.animation = "tcOut 0.48s ease forwards";
  }).catch(() => {});
  await captureFrames(Math.round(FPS * 0.5), 500);
  await safeEval(() => document.getElementById("__tc__")?.remove()).catch(() => {});
}

/** Pulse-highlight ring at (x, y) */
async function highlight(x, y) {
  await safeEval((cx, cy) => {
    const ring = document.createElement("div");
    ring.style.cssText = `position:fixed;left:${cx-22}px;top:${cy-22}px;width:44px;height:44px;
      border-radius:50%;border:3px solid rgba(15,133,176,0.95);
      box-shadow:0 0 18px rgba(15,133,176,0.7);pointer-events:none;z-index:2147483646;
      animation:hl 0.9s ease-out forwards;`;
    const st = document.createElement("style");
    st.textContent = "@keyframes hl{0%{transform:scale(0.4);opacity:1}100%{transform:scale(2);opacity:0}}";
    document.head.appendChild(st);
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 900);
  }, x, y);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Prepare dirs
  if (!existsSync(OUT_DIR))    mkdirSync(OUT_DIR,    { recursive: true });
  if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });
  for (const f of readdirSync(FRAMES_DIR)) unlinkSync(join(FRAMES_DIR, f));
  console.log("🗂   Cleaned frames dir");

  // ── Start dev server ────────────────────────────────────────────────────────
  console.log("▶   Starting Next.js dev server...");
  const devServer = spawn("npm", ["run", "dev", "--", "--port", "3000"], {
    cwd: ROOT, stdio: "pipe",
  });

  await new Promise((res, rej) => {
    const timeout = setTimeout(() => rej(new Error("Dev server timed out")), 90_000);
    const check = (data) => {
      if (data.toString().match(/ready|localhost:3000/i)) {
        clearTimeout(timeout); res();
      }
    };
    devServer.stdout.on("data", check);
    devServer.stderr.on("data", check);
  });
  await sleep(2500);
  console.log("✓   Dev server ready");

  // ── Launch browser ──────────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: false,
    // defaultViewport: null = let the window own the viewport; no double-assignment = no glitch
    defaultViewport: null,
    args: [
      // The window IS the viewport — set it to exactly the desired recording size
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      "--window-position=0,0",
      "--disable-infobars",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-translate",
      "--disable-features=TranslateUI",
      // Ensure consistent DPR (no HiDPI scaling that could cause extra layout shifts)
      "--force-device-scale-factor=1",
    ],
  });

  const pages = await browser.pages();
  pg = pages[0] || await browser.newPage();
  // Explicitly set viewport once on the page object to lock it absolutely
  await pg.setViewport({ width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1 });


  try {
    // ════════════════════════════════════════════════════════════════════════
    // SCENE 0 – App intro hold (blank before login appears)
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 0 — Loading");
    await pg.goto(APP_URL, { waitUntil: "networkidle2", timeout: 45_000 });
    await captureSecs(2);

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 1 – Login page
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 1 — Login page");
    await showAnnotation("MedSync Clinic OS", "Attendance • Leave • Payroll for Sunrise Medical Centre", 3000);

    // Click Quick Demo Login button (fills form: clinic=SUNRISE, user=admin, pass=admin)
    await sleep(800);
    const demoBtn = await pg.$("button[title*='Demo']") ??
                    await pg.evaluateHandle(() =>
                      [...document.querySelectorAll("button")]
                        .find(b => b.textContent.includes("Quick Demo Login") || b.textContent.includes("Demo"))
                    ).then(h => h.asElement()).catch(() => null);

    if (demoBtn) {
      const box = await demoBtn.boundingBox();
      if (box) await highlight(box.x + box.width/2, box.y + box.height/2);
      await captureSecs(1);
      await demoBtn.click();
      await sleep(600); // let React state update after fillDemoAdmin
    } else {
      // Manual fill fallback
      await pg.evaluate(() => {
        const inputs = [...document.querySelectorAll("input")];
        const clinic = inputs.find(i => i.placeholder?.toLowerCase().includes("sunrise") || i.placeholder?.toLowerCase().includes("e.g.") || i.placeholder?.toLowerCase().includes("medsync"));
        if (clinic) { clinic.value = "SUNRISE"; clinic.dispatchEvent(new Event("input", {bubbles:true})); }
      });
      await pg.evaluate(() => {
        const inputs = [...document.querySelectorAll("input")];
        const user = inputs.find(i => i.placeholder === "admin");
        if (user) { user.value = "admin"; user.dispatchEvent(new Event("input", {bubbles:true})); }
      });
      const passes = await pg.$$("input[type='password']");
      if (passes[0]) {
        await passes[0].click({ clickCount: 3 });
        await passes[0].type("admin", { delay: 60 });
      }
    }

    await captureSecs(1.5);
    await showAnnotation("One-click demo access", "Sunrise Medical Centre  ·  admin / admin", 2400);

    // Click SIGN IN button explicitly — more reliable than Enter after an overlay
    const signedIn = await safeEval(() => {
      const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent.trim() === "SIGN IN" || (b.textContent.includes("SIGN") && b.textContent.includes("IN")));
      if (btn) { btn.click(); return true; }
      return false;
    }).catch(() => false);
    if (!signedIn) {
      console.warn("  ⚠  SIGN IN button not found — falling back to Enter");
      await pg.keyboard.press("Enter");
    }

    // Wait for sidebar Attendance nav button — ONLY exists after successful login
    console.log("  ⏳  Waiting for dashboard sidebar to mount...");
    try {
      await pg.waitForFunction(
        () => [...document.querySelectorAll("button")].some(b =>
          [...b.querySelectorAll("span")].some(s => s.textContent.trim() === "Attendance")
        ),
        { timeout: 20000 }
      );
      console.log("  ✓   Sidebar mounted — login successful");
    } catch {
      console.warn("  ⚠  Sidebar not found within 20s");
    }
    await sleep(3000);   // let API data fully load (charts, tables, KPIs)
    await captureSecs(1);

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 2 – Dashboard
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 2 — Dashboard");
    await titleCard("Live Dashboard", "Today's attendance at a glance");
    await showAnnotation("Dashboard", "Real-time KPI cards — Total Staff · Present · On Leave · Absent", 3500);
    await captureSecs(1.5);
    await smoothScroll(320);
    await captureSecs(1.5);
    await showAnnotation("7-Day Activity Chart", "Visual attendance trend with daily breakdown", 3000);
    await captureSecs(2);
    await smoothScroll(0);
    await captureSecs(1);

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 3 – Attendance
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 3 — Attendance");
    await titleCard("Attendance Tracking", "Biometric sync · auto check-in/out classification");
    await clickNav("Attendance");
    await showAnnotation("Attendance Module", "Every staff check-in and check-out — live from biometric terminal", 3500);
    await captureSecs(2);
    await smoothScroll(380);
    await captureSecs(2);
    await showAnnotation("Status Auto-Classification", "On-Time · Late · Half-Day · On-Leave · Absent — zero manual entry", 3500);
    await captureSecs(2);
    await smoothScroll(0);
    await captureSecs(1);

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 4 – Leave Manager
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 4 — Leave Manager");
    await titleCard("Leave Manager", "Annual · Sick · Casual leave with balance tracking");
    await clickNav("Leave Manager");
    await showAnnotation("Leave Manager", "Approve or reject leave requests with one click", 3500);
    await captureSecs(2);
    await smoothScroll(350);
    await captureSecs(2);
    await showAnnotation("Leave Balances", "Each employee's Annual · Sick · Casual days auto-tracked", 3000);
    await captureSecs(2);
    await smoothScroll(0);
    await captureSecs(1);

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 5 – Payroll Engine & Month Finalization
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 5 — Payroll Engine & Finalization");
    await titleCard("Payroll Engine", "Automated salaries · EPF · ETF · APIT · One-Click Finalize");
    await clickNav("Payroll Engine");
    await showAnnotation("Payroll Engine", "Full salary calculation with statutory deductions & allowances", 3200);
    await captureSecs(1.8);
    await smoothScroll(360);
    await captureSecs(1.8);
    await showAnnotation("EPF 8% / 12% · ETF 3% · APIT", "Sri Lanka statutory contributions computed per employee automatically", 3200);
    await captureSecs(2);
    await smoothScroll(0);
    await captureSecs(1);

    // Demonstrate Month Finalization
    const finalizeBtnBox = await pg.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Finalize Month"));
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }).catch(() => null);

    if (finalizeBtnBox) {
      await showAnnotation("Finalizing Monthly Payroll Cycle", "Locking current month records & generating audit-ready statements", 3000);
      await highlight(finalizeBtnBox.x, finalizeBtnBox.y);
      await captureSecs(1.2);
      await safeEval(() => {
        const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Finalize Month"));
        if (btn) btn.click();
      });
      await sleep(1800);
      await showAnnotation("Month Finalized Successfully!", "Cycle locked with permanent timestamp & audit trail", 2800);
      await captureSecs(2);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 6 – Reports & Compliance
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 6 — Reports & Compliance");
    await titleCard("Reports & Compliance", "Audit-ready statements · Payslips · EPF Form C3 export");
    await clickNav("Reports");
    await showAnnotation("Finalized Payroll Statements", "Historical monthly archives with EPF, ETF & APIT breakdowns", 3500);
    await captureSecs(2);
    await smoothScroll(280);
    await captureSecs(2);
    await showAnnotation("One-Click Compliance Export", "Generate printable payslips, attendance summaries & EPF Form C3", 3500);
    await captureSecs(2.5);
    await smoothScroll(0);
    await captureSecs(1);

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 7 – Self-Service
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 7 — Self-Service");
    await titleCard("Staff Self-Service", "Employees check own attendance & apply for leave");
    await clickNav("Self-Service");
    await showAnnotation("Self-Service Portal", "Staff access their own records securely using a 4-digit PIN", 3500);
    await captureSecs(2);
    await smoothScroll(280);
    await captureSecs(2);
    await smoothScroll(0);
    await captureSecs(1);

    // ════════════════════════════════════════════════════════════════════════
    // SCENE 8 – Settings Deep Dive
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Scene 8 — Settings Deep Dive");
    await titleCard("Clinic Settings", "Salary rules · Operating hours · Biometric terminals");
    await clickNav("Settings");

    // Subtab 1: Salary & Dynamic Bonuses
    await showAnnotation("Salary & Dynamic Bonuses", "Configure EPF/ETF statutory rates, OT multipliers & grace periods", 3200);
    await safeEval(() => {
      const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Salary & Dynamic Bonuses"));
      if (btn) btn.click();
    });
    await sleep(1500);
    await captureSecs(2);
    await smoothScroll(320);
    await captureSecs(1.8);
    await smoothScroll(0);

    // Subtab 2: Operating Hours
    await showAnnotation("Operating Hours", "Set weekly clinic schedule, daily shift windows & half-days", 3000);
    await safeEval(() => {
      const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Operating Hours"));
      if (btn) btn.click();
    });
    await sleep(1500);
    await captureSecs(2);

    // Subtab 3: Biometric & AI Services
    await showAnnotation("Biometric Hardware Sync", "Hikvision & ZKTeco facial/fingerprint terminals connected live", 3000);
    await safeEval(() => {
      const btn = [...document.querySelectorAll("button")].find(b => b.textContent.includes("Biometric & AI Services"));
      if (btn) btn.click();
    });
    await sleep(1500);
    await captureSecs(2);

    // ════════════════════════════════════════════════════════════════════════
    // FINAL CARD
    // ════════════════════════════════════════════════════════════════════════
    console.log("📹  Final card");
    await titleCard(
      "Streamline your clinic today",
      "MedSync — built for Sri Lankan medical practices by Code Knox",
      3500,
      "#080c14"
    );
    await captureSecs(1);

  } finally {
    await browser.close();
    devServer.kill("SIGTERM");
    console.log(`\n✓   Captured ${idx} frames`);
  }

  if (idx === 0) throw new Error("No frames were captured — something went wrong during browser automation.");

  // ─── Encode video ────────────────────────────────────────────────────────
  console.log("▶   Encoding video...");
  await new Promise((res, rej) => {
    const proc = spawn("ffmpeg", [
      "-y",
      "-framerate", String(FPS),
      "-i",         join(FRAMES_DIR, "frame_%06d.png"),
      "-vf",        `scale=${VIEWPORT.width}:${VIEWPORT.height}:flags=lanczos,format=yuv420p`,
      "-c:v",       "libx264",
      "-preset",    "slow",
      "-crf",       "18",
      "-movflags",  "+faststart",
      OUTPUT_MP4,
    ], { stdio: "inherit" });
    proc.on("close", code => code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)));
  });

  console.log(`\n🎬  Video saved:\n    ${OUTPUT_MP4}`);
  console.log("▶   Opening video...");
  spawn("open", [OUTPUT_MP4], { detached: true, stdio: "ignore" }).unref();
}

main().catch(err => {
  console.error("❌  Fatal:", err.message);
  process.exit(1);
});
