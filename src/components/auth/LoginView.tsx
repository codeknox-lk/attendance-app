"use client";

import React, { useState, useEffect } from "react";

interface LoginViewProps {
  isDark: boolean;
  onToggleDark: () => void;
  loginUser: (payload: {
    username?: string;
    password?: string;
    pin?: string;
    loginType?: "admin" | "staff";
    biometricId?: string;
    clinicCode?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  isDark, // We will keep isDark logic, though the image is a light mode design. We can adapt it for dark mode.
  onToggleDark,
  loginUser,
}) => {
  const [loginType, setLoginType] = useState<"admin" | "staff">("admin");
  const [clinicCode, setClinicCode] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [biometricId, setBiometricId] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Auto-changing feature carousel on right panel
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isSlidePaused, setIsSlidePaused] = useState<boolean>(false);

  const featureSlides = [
    {
      badge: "AI VISION SCANNER",
      badgeClass: "bg-teal-500/15 text-teal-800 border-teal-500/30",
      title: "Handwritten Logbook OCR",
      metric: "100%",
      metricLabel: "Transcription Accuracy",
      progressWidth: "w-full",
      barColor: "bg-gradient-to-r from-teal-500 to-[#0ea5e9]",
      detail: {
        tag: "AI",
        name: "Nikila Sarani",
        sub: "2026-08-30 • 07:55:00 In",
        status: "On-Time",
        statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200"
      }
    },
    {
      badge: "BIOMETRIC LIVE SYNC",
      badgeClass: "bg-sky-500/15 text-sky-800 border-sky-500/30",
      title: "Real-time Terminal Sync",
      metric: "94%",
      metricLabel: "Staff Attendance Rate",
      progressWidth: "w-[94%]",
      barColor: "bg-gradient-to-r from-sky-500 to-blue-600",
      detail: {
        tag: "LIVE",
        name: "DS-K1T320MFWX",
        sub: "Facial & Fingerprint Recognition",
        status: "Online",
        statusClass: "bg-sky-50 text-[#0c6c8f] border-sky-200"
      }
    },
    {
      badge: "PAYROLL & OVERTIME",
      badgeClass: "bg-amber-500/15 text-amber-900 border-amber-500/30",
      title: "Automated Wages & OT",
      metric: "+38h 24m",
      metricLabel: "Approved Overtime",
      progressWidth: "w-4/5",
      barColor: "bg-gradient-to-r from-amber-500 to-orange-500",
      detail: {
        tag: "2×",
        name: "Poya & Public Holidays",
        sub: "Automated double-time OT rules",
        status: "Approved",
        statusClass: "bg-amber-50 text-amber-800 border-amber-300"
      }
    },
    {
      badge: "LEAVE & CLINIC SCHEDULES",
      badgeClass: "bg-purple-500/15 text-purple-900 border-purple-500/30",
      title: "Holidays & Clinic Closed Days",
      metric: "100%",
      metricLabel: "Schedule Compliance",
      progressWidth: "w-full",
      barColor: "bg-gradient-to-r from-purple-500 to-pink-500",
      detail: {
        tag: "CAL",
        name: "Clinic Closed & Leaves",
        sub: "Separated from unexcused absence",
        status: "Configured",
        statusClass: "bg-purple-50 text-purple-800 border-purple-200"
      }
    },
  ];

  useEffect(() => {
    if (isSlidePaused) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featureSlides.length);
    }, 4200);
    return () => clearInterval(interval);
  }, [isSlidePaused, featureSlides.length]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCode = localStorage.getItem("medsync_saved_clinic_code");
        const savedBio = localStorage.getItem("medsync_saved_biometric_id");
        setTimeout(() => {
          if (savedCode) setClinicCode(savedCode);
          if (savedBio) setBiometricId(savedBio);
        }, 0);
      } catch {}
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    if (typeof window !== "undefined") {
      try {
        if (clinicCode) localStorage.setItem("medsync_saved_clinic_code", clinicCode);
        if (biometricId) localStorage.setItem("medsync_saved_biometric_id", biometricId);
      } catch {}
    }

    const payload =
      loginType === "admin"
        ? {
            loginType: "admin" as const,
            clinicCode: clinicCode.trim(),
            username: username.trim(),
            password: password,
          }
        : {
            loginType: "staff" as const,
            clinicCode: clinicCode.trim(),
            biometricId: biometricId.trim(),
          };

    const res = await loginUser(payload);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || "Authentication failed. Please check your credentials.");
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 ${isDark ? "bg-[#030712]" : "bg-[#F7F7F5]"}`}>
      
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={onToggleDark}
          className={`p-3 rounded-full backdrop-blur-md transition-all shadow-sm ${
            isDark
              ? "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
              : "bg-black/5 hover:bg-black/10 border border-black/5 text-black"
          }`}
          title="Toggle theme"
        >
          {isDark ? (
            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 4.22a1 1 0 011.415 0l.708.708a1 1 0 01-1.414 1.414l-.708-.708a1 1 0 010-1.414zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-4.22 4.22a1 1 0 010 1.415l-.708.708a1 1 0 01-1.414-1.414l.708-.708a1 1 0 011.414 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-4.22a1 1 0 01-1.415 0l-.708-.708a1 1 0 011.414-1.414l.708.708a1 1 0 010 1.414zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm4.22-4.22a1 1 0 010-1.415l.708-.708a1 1 0 011.414 1.414l-.708.708a1 1 0 01-1.414 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>

      {/* Ambient Orbs (Dark Mode Only) */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#0F85B0]/20 blur-[120px] rounded-full mix-blend-screen animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] bg-[#0F85B0]/10 blur-[100px] rounded-full mix-blend-screen animate-pulse-slow" style={{ animationDelay: "2s" }}></div>
        </div>
      )}

      {/* Main Split Container */}
      <div className={`w-full max-w-5xl flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl transition-colors duration-500 border ${
        isDark ? "bg-[#111111] border-neutral-800" : "bg-white border-neutral-200/60"
      }`}>
        
        {/* Left Side: Login Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 md:p-16 flex flex-col items-center justify-center relative">
          
          <div className="w-full max-w-[340px]">
            {/* Logo & Headline */}
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="flex items-center gap-2.5 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="MedSync" className="w-8 h-8 object-contain" />
                <span className={`text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-black"}`}>MedSync</span>
              </div>
              <h1 className={`text-3xl font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-slate-900"}`}>
                Welcome back
              </h1>
            </div>

            {/* Segmented Control - Modern pill style */}
            <div className={`p-1 rounded-full flex mb-8 ${isDark ? "bg-neutral-900" : "bg-neutral-100"}`}>
              <button
                type="button"
                onClick={() => { setLoginType("admin"); setErrorMsg(""); }}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-300 ${
                  loginType === "admin"
                    ? isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                    : isDark ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Practice Admin
              </button>
              <button
                type="button"
                onClick={() => { setLoginType("staff"); setErrorMsg(""); }}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-300 ${
                  loginType === "staff"
                    ? isDark ? "bg-neutral-700 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm"
                    : isDark ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                Staff Portal
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Custom Floating Label Input: Clinic Code */}
              <div className={`relative border rounded-xl transition-colors focus-within:ring-2 focus-within:ring-[#0F85B0]/20 focus-within:border-[#0F85B0] ${
                isDark ? "border-neutral-700 bg-neutral-900" : "border-neutral-200 bg-white"
              }`}>
                <label className={`absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wider ${
                  isDark ? "text-neutral-500" : "text-neutral-400"
                }`}>Clinic Code</label>
                <input
                  type="text"
                  required
                  value={clinicCode}
                  onChange={(e) => setClinicCode(e.target.value.toUpperCase())}
                  className={`w-full px-4 pb-2 pt-6 bg-transparent outline-none text-sm font-medium ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}
                  placeholder="e.g. MEDSYNC"
                />
              </div>

              {loginType === "admin" ? (
                <>
                  <div className={`relative border rounded-xl transition-colors focus-within:ring-2 focus-within:ring-[#0F85B0]/20 focus-within:border-[#0F85B0] ${
                    isDark ? "border-neutral-700 bg-neutral-900" : "border-neutral-200 bg-white"
                  }`}>
                    <label className={`absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wider ${
                      isDark ? "text-neutral-500" : "text-neutral-400"
                    }`}>Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full px-4 pb-2 pt-6 bg-transparent outline-none text-sm font-medium ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                      placeholder="admin"
                    />
                  </div>

                  <div className={`relative border rounded-xl transition-colors focus-within:ring-2 focus-within:ring-[#0F85B0]/20 focus-within:border-[#0F85B0] ${
                    isDark ? "border-neutral-700 bg-neutral-900" : "border-neutral-200 bg-white"
                  }`}>
                    <label className={`absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wider ${
                      isDark ? "text-neutral-500" : "text-neutral-400"
                    }`}>Password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 pb-2 pt-6 pr-12 bg-transparent outline-none text-sm font-medium ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                        isDark ? "text-neutral-500 hover:text-neutral-300" : "text-neutral-400 hover:text-slate-600"
                      }`}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className={`relative border rounded-xl transition-colors focus-within:ring-2 focus-within:ring-[#0F85B0]/20 focus-within:border-[#0F85B0] ${
                  isDark ? "border-neutral-700 bg-neutral-900" : "border-neutral-200 bg-white"
                }`}>
                  <label className={`absolute left-4 top-2 text-[10px] font-semibold uppercase tracking-wider ${
                    isDark ? "text-neutral-500" : "text-neutral-400"
                  }`}>Biometric ID</label>
                  <input
                    type="text"
                    required
                    value={biometricId}
                    onChange={(e) => setBiometricId(e.target.value)}
                    className={`w-full px-4 pb-2 pt-6 bg-transparent outline-none text-sm font-medium ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                    placeholder="e.g. 101 or SH001"
                  />
                </div>
              )}

              {errorMsg && (
                <div className={`p-3 rounded-lg text-[13px] font-medium flex items-start gap-2 ${
                  isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100"
                }`}>
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full mt-6 py-3.5 rounded-xl text-[14px] font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 ${
                  isDark 
                    ? "bg-white text-black hover:bg-neutral-200" 
                    : "bg-[#0A0A0A] text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span>SIGN IN</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Feature Panel */}
        <div className={`hidden md:flex md:w-1/2 p-12 flex-col justify-center relative overflow-hidden ${
          isDark ? "bg-[#0F85B0]" : "bg-[#0F85B0]"
        }`}>
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-4xl font-serif tracking-tight text-white mb-4 leading-tight">
              Talk, track, and grow<br/>your clinic, all on<br/>MedSync.
            </h2>

            {/* Dynamic Auto-Changing App Showcase Carousel */}
            <div
              className="w-full max-w-[340px] bg-white rounded-3xl shadow-2xl overflow-hidden mt-6 mb-6 border-4 border-white/20 transition-all duration-300 relative group"
              onMouseEnter={() => setIsSlidePaused(true)}
              onMouseLeave={() => setIsSlidePaused(false)}
            >
              {/* Simulated Clinic OS Card */}
              <div className="p-5 bg-gradient-to-b from-slate-50 to-white flex flex-col justify-between min-h-[225px]">
                
                {/* Top Card Header */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <div className="w-5 h-5 rounded-md bg-[#0F85B0]/15 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-[#0F85B0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 20V5l8 8 8-8v15" />
                        <path d="M12 10v6M9 13h6" />
                      </svg>
                    </div>
                    <span>MedSync</span>
                  </div>

                  <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full border transition-all duration-300 ${featureSlides[activeSlide].badgeClass}`}>
                    {featureSlides[activeSlide].badge}
                  </span>
                </div>

                {/* Animated Metric Block */}
                <div className="my-1 transition-all duration-500 transform">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
                    {featureSlides[activeSlide].title}
                  </p>
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                      {featureSlides[activeSlide].metric}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {featureSlides[activeSlide].metricLabel}
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="mt-2.5 h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div className={`h-full rounded-full transition-all duration-700 ease-out ${featureSlides[activeSlide].progressWidth} ${featureSlides[activeSlide].barColor}`} />
                  </div>
                </div>

                {/* Live Detail Preview Snippet */}
                <div className="mt-3">
                  <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#0F85B0]/15 text-[#0F85B0] font-black text-[9px] flex items-center justify-center shadow-xs">
                        {featureSlides[activeSlide].detail.tag}
                      </span>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 leading-tight">
                          {featureSlides[activeSlide].detail.name}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500">
                          {featureSlides[activeSlide].detail.sub}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${featureSlides[activeSlide].detail.statusClass}`}>
                      {featureSlides[activeSlide].detail.status}
                    </span>
                  </div>
                </div>

                {/* Carousel Controls & Indicator Dots */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {featureSlides.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          activeSlide === idx
                            ? "w-6 bg-[#0F85B0]"
                            : "w-1.5 bg-slate-300 hover:bg-slate-400"
                        }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <button
                      type="button"
                      onClick={() => setActiveSlide((prev) => (prev - 1 + featureSlides.length) % featureSlides.length)}
                      className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center transition cursor-pointer"
                      title="Previous"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="font-mono">{activeSlide + 1}/{featureSlides.length}</span>
                    <button
                      type="button"
                      onClick={() => setActiveSlide((prev) => (prev + 1) % featureSlides.length)}
                      className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center transition cursor-pointer"
                      title="Next"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Updated Feature Checklist */}
            <ul className="space-y-3">
              {[
                { title: "AI handwritten logbook scanner (Vision AI)", isNew: true },
                { title: "Access secure biometric attendance tools", isNew: false },
                { title: "Track payroll, leaves, and staff performance", isNew: false },
                { title: "Automated 2× holiday overtime & salary engine", isNew: true },
                { title: "Manage roles with strict access control", isNew: false },
                { title: "Cloud-synced dental clinical & operations data", isNew: false },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white/95">
                  <div className="w-5 h-5 rounded-full border border-white/40 flex items-center justify-center shrink-0 bg-white/10">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs sm:text-sm leading-tight">{item.title}</span>
                    {item.isNew && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.2 rounded-md leading-none border border-white/30">
                        NEW
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

          </div>
        </div>
      </div>
    </div>
  );
};
