import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { UserDataProvider } from "@/components/providers/UserDataProvider";
import { NotificationProvider } from "@/components/providers/NotificationContext";
import { IntegrationsProvider } from "@/components/providers/IntegrationsProvider";
import OneSignalProvider from "@/components/providers/OneSignalProvider";
import { ChatUIProvider } from "@/components/providers/ChatUIProvider";
import { Navbar } from "@/components/ui/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Perin - AI-Powered Digital Delegate",
  description:
    "Your intelligent AI assistant for scheduling, coordination, and productivity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider>
            <UserDataProvider>
              <NotificationProvider>
                <OneSignalProvider>
                  <div className="min-h-screen bg-[var(--background-primary)]">
                    {/* Desktop Navbar - only show on desktop */}
                    <div className="hidden xl:block">
                      <Navbar />
                    </div>
                    {children}
                  </div>
                </OneSignalProvider>
              </NotificationProvider>
            </UserDataProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
