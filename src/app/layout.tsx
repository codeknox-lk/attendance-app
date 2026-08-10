import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { AppProvider } from "./context/AppContext";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
