"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Perin
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-powered productivity assistant
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <Link
                  className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                  href="/dashboard"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                    href="/auth/signin"
                  >
                    Sign In
                  </Link>
                  <Link
                    className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
                    href="/auth/signup"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        <div className="text-center mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-2">
                Secure Authentication
              </h3>
              <p className="text-gray-600">
                Built with NextAuth.js for secure, reliable authentication
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-2">
                Database Integration
              </h3>
              <p className="text-gray-600">
                PostgreSQL with type-safe queries and proper error handling
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg mb-2">Modern UI</h3>
              <p className="text-gray-600">
                Clean, responsive design with Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <Link
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="/api/health"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="Health check"
            width={16}
            height={16}
          />
          API Health
        </Link>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Documentation"
            width={16}
            height={16}
          />
          Documentation
        </a>
      </footer>
    </div>
  );
}
