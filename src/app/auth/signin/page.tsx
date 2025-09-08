"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/Glass";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed");
    }

    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--background-primary)] via-[var(--background-secondary)] to-[var(--background-primary)]" />

      <div className="relative z-10 w-full max-w-sm sm:max-w-md">
        <GlassCard className="p-6 sm:p-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--cta-text)] mb-2">
              Welcome back
            </h1>
            <p className="text-[var(--foreground-muted)] text-sm sm:text-base">
              Sign in to your account
            </p>
          </div>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--cta-text)]"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="h-12 bg-[var(--card-background)] border-[var(--card-border)] text-[var(--cta-text)] placeholder-[var(--foreground-muted)] focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/20"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--cta-text)]"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-12 bg-[var(--card-background)] border-[var(--card-border)] text-[var(--cta-text)] placeholder-[var(--foreground-muted)] focus:border-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/20"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="status-error p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full h-12 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--card-border)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[var(--background-primary)] text-[var(--foreground-muted)]">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-12 flex items-center justify-center space-x-3 border border-[var(--card-border)] rounded-lg bg-[var(--card-background)] hover:bg-[var(--muted)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-[var(--foreground-muted)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Image
                src="/google-logo.png"
                alt="Google"
                width={20}
                height={20}
                className="w-5 h-5"
                priority
              />
            )}
            <span className="text-[var(--cta-text)] font-medium text-sm sm:text-base">
              {isGoogleLoading ? "Signing in..." : "Google"}
            </span>
          </button>

          {/* Footer */}
          <div className="text-center">
            <p className="text-[var(--foreground-muted)] text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] font-semibold transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
