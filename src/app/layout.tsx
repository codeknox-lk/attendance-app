import type { Metadata } from "next";
import { AppProvider } from "./context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedSync Cloud | Biometric Attendance & Payroll Platform",
  description: "Enterprise Face Recognition & Biometric Attendance Syncing with Sri Lankan statutory EPF/ETF/APIT payroll engine.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('medsync_theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans selection:bg-[#0F85B0] selection:text-white relative">
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
