"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    [key: string]: unknown;
  }) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  };

  return {
    session,
    status,
    isAuthenticated: !!session,
    isLoading: status === "loading",
    login,
    logout,
    register,
  };
}
