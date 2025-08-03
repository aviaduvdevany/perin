import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "../components/providers/SessionProvider";

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
  themeColor: "#4B5DFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
