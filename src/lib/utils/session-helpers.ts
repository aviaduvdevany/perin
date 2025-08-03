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
