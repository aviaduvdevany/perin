import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { NotificationProvider } from "@/components/providers/NotificationContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Talk to My Perin - AI Scheduling Assistant",
  description:
    "Chat with Perin AI to schedule meetings and coordinate with others",
  icons: {
    icon: "/perin-logo.png",
    shortcut: "/perin-logo.png",
    apple: "/perin-logo.png",
  },
};

export default function DelegationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider>
            <NotificationProvider>
              <div className="min-h-screen bg-[var(--background-primary)]">

                {children}
              </div>
            </NotificationProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
