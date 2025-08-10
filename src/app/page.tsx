"use client";

import Image from "next/image";
import Link from "next/link";
import Hero from "@/components/homepage/Hero";
import Features from "@/components/homepage/Features";
import ShowOff from "@/components/homepage/ShowOff";
import { Navbar } from "@/components/ui/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background-primary)] relative overflow-hidden">
      {/* Background Effects - Enhanced with design system colors */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[var(--accent-primary)] rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-[var(--accent-secondary)] rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-[var(--accent-primary)] rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-2000"></div>

        {/* Additional subtle glow effects */}
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-[var(--accent-primary)] rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[var(--accent-secondary)] rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-float delay-1000"></div>
      </div>
      <Hero />
      <ShowOff />
      <Features />

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-[var(--card-border)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-lg flex items-center justify-center glow-primary">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold text-[var(--cta-text)]">
              Perin
            </span>
          </div>

          <div className="flex gap-6">
            <Link
              href="/api/health"
              className="flex items-center gap-2 text-[var(--foreground-subtle)] hover:text-[var(--accent-secondary)] transition-colors"
            >
              <Image
                src="/file.svg"
                alt="Health check"
                width={16}
                height={16}
                className="filter invert"
              />
              API Health
            </Link>
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[var(--foreground-subtle)] hover:text-[var(--accent-secondary)] transition-colors"
            >
              <Image
                src="/window.svg"
                alt="Documentation"
                width={16}
                height={16}
                className="filter invert"
              />
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
