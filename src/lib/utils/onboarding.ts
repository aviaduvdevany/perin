import type { User } from "@/types/database";

/**
 * Check if a user needs to complete onboarding
 * A user needs onboarding if any of these essential fields are missing:
 * - name (user's name)
 * - perin_name (what to call the assistant)
 * - timezone (user's timezone)
 */
export function userNeedsOnboarding(user: User | null): boolean {
  if (!user) {
    return true; // No user means they need onboarding
  }

  // Check if essential fields are missing or empty
  const hasName = user.name && user.name.trim().length > 0;
  const hasPerinName = user.perin_name && user.perin_name.trim().length > 0;
  const hasTimezone = user.timezone && user.timezone.trim().length > 0;

  // User needs onboarding if any essential field is missing
  return !hasName || !hasPerinName || !hasTimezone;
}

/**
 * Get the onboarding completion percentage
 * Returns a number between 0 and 100
 */
export function getOnboardingProgress(user: User | null): number {
  if (!user) {
    return 0;
  }

  const hasName = user.name && user.name.trim().length > 0;
  const hasPerinName = user.perin_name && user.perin_name.trim().length > 0;
  const hasTimezone = user.timezone && user.timezone.trim().length > 0;

  const completedFields = [hasName, hasPerinName, hasTimezone].filter(
    Boolean
  ).length;
  return Math.round((completedFields / 3) * 100);
}
