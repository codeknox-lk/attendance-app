import type { Metadata } from "next";
import { AppProvider } from "./context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedSync Cloud | Biometric Attendance & Payroll Platform",
  description: "Enterprise Face Recognition & Biometric Attendance Syncing with Sri Lankan statutory EPF/ETF/APIT payroll engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-[#030712] text-slate-100 font-sans selection:bg-[#0F85B0] selection:text-white relative">
        {/* Global Ambient Glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          <div className="absolute top-[-15%] left-[-10%] w-[50vw] h-[50vw] bg-[#0F85B0]/10 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-[#0F85B0]/5 blur-[100px] rounded-full mix-blend-screen"></div>
        </div>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
