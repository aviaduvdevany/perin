"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[var(--primary)] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-[var(--primary)] rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold text-[var(--foreground)] leading-tight">
            Meet Your{" "}
            <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
              Perin
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-[var(--foreground-muted)] max-w-2xl mx-auto leading-relaxed">
            Your AI-powered productivity assistant. Delegate smarter, work
            seamlessly, and unlock your full potential with intelligent
            automation.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="btn-gradient text-lg px-8 py-4 glow"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      className="btn-gradient text-lg px-8 py-4 glow"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="px-8 py-4 text-lg font-semibold text-[var(--foreground)] border-2 border-[var(--primary)] rounded-full hover:bg-[var(--primary)]/10 transition-all duration-300"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--foreground)] mb-6">
              Why Choose Perin?
            </h2>
            <p className="text-xl text-[var(--foreground-muted)] max-w-2xl mx-auto">
              Experience the future of productivity with our cutting-edge AI
              technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card p-8 text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
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
              <h3 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                Secure Authentication
              </h3>
              <p className="text-[var(--foreground-subtle)] leading-relaxed">
                Built with NextAuth.js for enterprise-grade security and
                seamless user experience
              </p>
            </div>

            <div className="card p-8 text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
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
              <h3 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                Intelligent Database
              </h3>
              <p className="text-[var(--foreground-subtle)] leading-relaxed">
                PostgreSQL with type-safe queries and intelligent error handling
                for reliable performance
              </p>
            </div>

            <div className="card p-8 text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
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
              <h3 className="text-2xl font-bold text-[var(--foreground)] mb-4">
                Futuristic UI
              </h3>
              <p className="text-[var(--foreground-subtle)] leading-relaxed">
                Modern, responsive design with glass effects and smooth
                animations for an immersive experience
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-[var(--background-secondary)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold text-[var(--foreground)]">
              Perin
            </span>
          </div>

          <div className="flex gap-6">
            <Link
              href="/api/health"
              className="flex items-center gap-2 text-[var(--foreground-subtle)] hover:text-[var(--accent)] transition-colors"
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
              className="flex items-center gap-2 text-[var(--foreground-subtle)] hover:text-[var(--accent)] transition-colors"
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
