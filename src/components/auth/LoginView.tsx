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
              <div className="flex items-center gap-2 mb-4">
                <svg className={`w-6 h-6 ${isDark ? "text-white" : "text-black"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 20V5l8 8 8-8v15" />
                  <path d="M12 10v6M9 13h6" className="text-[#0F85B0]" />
                </svg>
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

            {/* Simulated App Graphic */}
            <div className="w-full max-w-[320px] bg-white rounded-t-3xl shadow-2xl overflow-hidden mt-8 mb-8 border-t-4 border-x-4 border-white/20">
              <div className="h-48 bg-slate-50 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-600">MS</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-800 font-bold text-sm">
                    <svg className="w-4 h-4 text-[#0F85B0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20V5l8 8 8-8v15" />
                      <path d="M12 10v6M9 13h6" />
                    </svg>
                    MedSync
                  </div>
                  <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center">
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Attendance</p>
                  <div className="flex justify-between items-end">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">85%</h3>
                    <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white pb-0.5">+</div>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <div className="h-2 flex-1 bg-emerald-500 rounded-full" />
                  <div className="h-2 w-1/4 bg-[#0F85B0] rounded-full" />
                </div>
              </div>
            </div>

            {/* Checklist */}
            <ul className="space-y-4">
              {[
                "Access secure biometric attendance tools",
                "Track payroll, leaves, and staff performance",
                "Manage roles with strict access control",
                "Cloud-synced dental clinical data"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-white/90">
                  <div className="w-6 h-6 rounded-full border border-white/40 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm sm:text-base">{item}</span>
                </li>
              ))}
            </ul>

          </div>
        </div>
      </div>
    </div>
  );
};
