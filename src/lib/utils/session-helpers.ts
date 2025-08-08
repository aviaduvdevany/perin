import type { Session } from "next-auth";

/**
 * Helper function to safely extract user ID from session
 * Can be used on both client and server side
 */
export const getUserIdFromSession = (
  session: Session | null
): string | null => {
  if (session?.user?.id) {
    return session.user.id;
  }
  return null;
};


export function extractSessionIdFromUrl(url: string): string | null {
  const { pathname } = new URL(url);
  // Expect: /api/network/sessions/:id
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "sessions");
  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  return null;
}
