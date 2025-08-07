"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { GlassCard, GlassPanel } from "@/components/ui/Glass";
import Hero from "@/components/homepage/Hero";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

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

      {/* Hero Section */}
      <Hero />

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="heading-lg text-[var(--cta-text)] mb-6">
              Why Choose Perin?
            </h2>
            <p className="body-lg text-[var(--foreground-muted)] max-w-2xl mx-auto">
              Experience the future of productivity with our cutting-edge AI
              technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="p-8 text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform glow-primary">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="heading-sm text-[var(--cta-text)] mb-4">
                Secure Authentication
              </h3>
              <p className="body-md text-[var(--foreground-subtle)] leading-relaxed">
                Built with NextAuth.js for enterprise-grade security and
                seamless user experience
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform glow-primary">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
              </div>
              <h3 className="heading-sm text-[var(--cta-text)] mb-4">
                Intelligent Database
              </h3>
              <p className="body-md text-[var(--foreground-subtle)] leading-relaxed">
                PostgreSQL with type-safe queries and intelligent error handling
                for reliable performance
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform glow-primary">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="heading-sm text-[var(--cta-text)] mb-4">
                Futuristic UI
              </h3>
              <p className="body-md text-[var(--foreground-subtle)] leading-relaxed">
                Modern, responsive design with glass effects and smooth
                animations for an immersive experience
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

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
