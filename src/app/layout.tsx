import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import OneSignalProvider from "@/components/providers/OneSignalProvider";
import { NotificationProvider } from "@/components/providers/NotificationContext";
import { Navbar } from "@/components/ui/Navbar";
import { UserDataProvider } from "@/components/providers/UserDataProvider";

export const metadata: Metadata = {
  title: "Perin - Your AI-powered productivity assistant",
  description:
    "Delegate smarter with Perin, your futuristic AI assistant for seamless productivity and intelligent task management.",
  keywords: ["AI", "productivity", "assistant", "automation", "futuristic"],
  authors: [{ name: "Perin Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4C5BFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          defer
        ></script>
      </head>
      <body className="antialiased">
        <SessionProvider>
          <OneSignalProvider>
            <NotificationProvider>
              <UserDataProvider>
                <Navbar />
                <main>{children}</main>
              </UserDataProvider>
            </NotificationProvider>
          </OneSignalProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
