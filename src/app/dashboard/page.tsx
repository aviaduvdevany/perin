"use client";

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PerinChat } from "../../components/PerinChat";

export default function DashboardPage() {
  const { session, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/signin");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)] flex items-center justify-center">
        <div className="card p-8 text-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--foreground)] text-lg">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--background-secondary)] to-[var(--background)]">
      {/* Navigation */}
      <nav className="glass-effect border-b border-[var(--card-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                  Perin Dashboard
                </h1>
                <p className="text-[var(--foreground-muted)] text-sm">
                  Your AI-powered workspace
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-[var(--foreground)] font-semibold">
                  {session?.user?.name || session?.user?.email}
                </p>
                <p className="text-[var(--foreground-muted)] text-sm">
                  {(session?.user as { role?: string })?.role || "User"}
                </p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-[var(--error-light)] border border-[var(--error-border)] text-[var(--error)] rounded-xl hover:bg-[var(--error)]/30 transition-all duration-300 font-semibold"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* User Information Card */}
          <div className="lg:col-span-1">
            <div className="card p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {session?.user?.name?.[0] ||
                      session?.user?.email?.[0] ||
                      "U"}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">
                    Your Profile
                  </h2>
                  <p className="text-[var(--foreground-muted)] text-sm">
                    Account details
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-[var(--card-background-light)] rounded-xl border border-[var(--card-border)]">
                  <p className="text-[var(--foreground-muted)] text-sm mb-1">
                    Email
                  </p>
                  <p className="text-[var(--foreground)] font-semibold">
                    {session?.user?.email}
                  </p>
                </div>

                <div className="p-4 bg-[var(--card-background-light)] rounded-xl border border-[var(--card-border)]">
                  <p className="text-[var(--foreground-muted)] text-sm mb-1">
                    Name
                  </p>
                  <p className="text-[var(--foreground)] font-semibold">
                    {session?.user?.name || "Not set"}
                  </p>
                </div>

                <div className="p-4 bg-[var(--card-background-light)] rounded-xl border border-[var(--card-border)]">
                  <p className="text-[var(--foreground-muted)] text-sm mb-1">
                    Role
                  </p>
                  <p className="text-[var(--foreground)] font-semibold">
                    {(session?.user as { role?: string })?.role || "User"}
                  </p>
                </div>

                <div className="p-4 bg-[var(--card-background-light)] rounded-xl border border-[var(--card-border)]">
                  <p className="text-[var(--foreground-muted)] text-sm mb-1">
                    Beta Access
                  </p>
                  <p className="text-[var(--foreground)] font-semibold">
                    {(session?.user as { isBetaUser?: boolean })?.isBetaUser
                      ? "Yes"
                      : "No"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="card p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-xl flex items-center justify-center">
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--foreground)]">
                    Chat with Perin
                  </h2>
                  <p className="text-[var(--foreground-muted)]">
                    Your AI assistant is ready to help
                  </p>
                </div>
              </div>
              <PerinChat />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
