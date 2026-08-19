import type { Metadata } from "next";
import { AppProvider } from "./context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedicFlow Cloud | Biometric Attendance & Payroll Platform",
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
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
