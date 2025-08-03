"use client";

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                Welcome, {session?.user?.name || session?.user?.email}!
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard!
              </h2>
              <p className="text-gray-600 mb-4">
                You are successfully authenticated.
              </p>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2">User Information:</h3>
                <div className="text-left space-y-1">
                  <p>
                    <strong>ID:</strong> {session?.user?.id}
                  </p>
                  <p>
                    <strong>Email:</strong> {session?.user?.email}
                  </p>
                  <p>
                    <strong>Name:</strong> {session?.user?.name || "Not set"}
                  </p>
                  <p>
                    <strong>Role:</strong> {session?.user?.role}
                  </p>
                  <p>
                    <strong>Beta User:</strong>{" "}
                    {session?.user?.isBetaUser ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
