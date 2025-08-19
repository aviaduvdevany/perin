import type {
  Notification,
  NotificationPreferences,
} from "@/types/notifications";
import {
  getCurrentTimeInTimezone,
  isValidTimezone,
} from "@/lib/utils/timezone";

export interface NotificationPolicy {
  // Relevance and filtering
  isRelevant: boolean;
  shouldDedupe: boolean;
  priority: "high" | "medium" | "low";

  // Timing
  shouldDelay: boolean;
  delayUntil?: Date;
  ttl?: Date;

  // Channel routing
  channels: ("mobile_push" | "web_push" | "email" | "sms" | "in_app")[];
  shouldDigest: boolean;

  // User preferences
  respectsDnd: boolean;
  respectsPreferences: boolean;
}

export interface PolicyContext {
  notification: Notification;
  userPreferences: NotificationPreferences | null;
  userTimezone: string;
  currentTime: Date;
  recentNotifications: Notification[];
}

interface DndSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface ChannelSettings {
  push?: boolean;
  email?: boolean;
  sms?: boolean;
  [key: string]: boolean | undefined;
}

interface DigestSettings {
  enabled: boolean;
  frequency: string;
  time: string;
  timezone: string;
}

export class NotificationPolicyEngine {
  private static readonly HIGH_PRIORITY_TYPES = [
    "network.connection.invite",
    "network.connection.accepted",
    "network.message.received",
    "network.meeting.confirmed",
    "network.meeting.canceled",
    "calendar.meeting.confirm_request",
    "calendar.conflict.detected",
    "assistant.suggestion.better_time",
    "assistant.follow_up.suggested",
    "calendar.meeting.reminder",
    "system.digest.daily",
  ] as const;

  private static readonly MEDIUM_PRIORITY_TYPES = [
    "network.connection.accepted",
    "network.meeting.confirmed",
    "network.meeting.canceled",
    "assistant.suggestion.better_time",
  ];

  private static readonly LOW_PRIORITY_TYPES = [
    "calendar.meeting.reminder",
    "assistant.follow_up.suggested",
    "system.digest.daily",
  ];

  private static readonly ACTIONABLE_TYPES = [
    "network.connection.invite",
    "calendar.meeting.confirm_request",
    "calendar.conflict.detected",
    "assistant.suggestion.better_time",
  ];

  static evaluatePolicy(context: PolicyContext): NotificationPolicy {
    const {
      notification,
      userPreferences,
      userTimezone,
      currentTime,
      recentNotifications,
    } = context;

    // Check if notification is relevant
    const isRelevant = this.isRelevantNotification(
      notification,
      recentNotifications
    );

    // Check for duplicates
    const shouldDedupe = this.shouldDeduplicate(
      notification,
      recentNotifications
    );

    // Determine priority
    const priority = this.getPriority(notification);

    // Check DnD and timing
    const { shouldDelay, delayUntil } = this.checkDndAndTiming(
      notification,
      userPreferences,
      userTimezone,
      currentTime
    );

    // Determine TTL
    const ttl = this.getTTL(notification, currentTime);

    // Route channels
    const channels = this.routeChannels(
      notification,
      userPreferences,
      priority
    );

    // Check if should be digested
    const shouldDigest = this.shouldBeDigested(
      notification,
      userPreferences,
      priority
    );

    // Check user preferences
    const respectsDnd = this.respectsDnd(
      notification,
      userPreferences,
      userTimezone,
      currentTime
    );
    const respectsPreferences = this.respectsUserPreferences(
      notification,
      userPreferences
    );

    return {
      isRelevant,
      shouldDedupe,
      priority,
      shouldDelay,
      delayUntil,
      ttl,
      channels,
      shouldDigest,
      respectsDnd,
      respectsPreferences,
    };
  }

  private static isRelevantNotification(
    notification: Notification,
    recentNotifications: Notification[]
  ): boolean {
    // Check if this is an actionable notification
    if (this.ACTIONABLE_TYPES.includes(notification.type)) {
      return true;
    }

    // Check if user has similar recent notifications (within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const similarRecent = recentNotifications.filter(
      (n) => n.type === notification.type && new Date(n.created_at) > oneHourAgo
    );

    // If too many similar notifications, consider less relevant
    return similarRecent.length < 3;
  }

  private static shouldDeduplicate(
    notification: Notification,
    recentNotifications: Notification[]
  ): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return recentNotifications.some(
      (n) =>
        n.type === notification.type &&
        n.title === notification.title &&
        new Date(n.created_at) > fiveMinutesAgo
    );
  }

  private static getPriority(
    notification: Notification
  ): "high" | "medium" | "low" {
    if (this.HIGH_PRIORITY_TYPES.includes(notification.type)) {
      return "high";
    }
    if (this.MEDIUM_PRIORITY_TYPES.includes(notification.type)) {
      return "medium";
    }
    return "low";
  }

  private static checkDndAndTiming(
    notification: Notification,
    userPreferences: NotificationPreferences | null,
    userTimezone: string,
    currentTime: Date
  ): { shouldDelay: boolean; delayUntil?: Date } {
    if (!userPreferences?.dnd) {
      return { shouldDelay: false };
    }

    const dnd = userPreferences.dnd as unknown as DndSettings;
    if (!dnd.enabled) {
      return { shouldDelay: false };
    }

    // Validate timezone
    if (!isValidTimezone(userTimezone)) {
      return { shouldDelay: false };
    }

    const startTime = dnd.startTime || "22:00";
    const endTime = dnd.endTime || "08:00";

    // Get current time in user's timezone
    const userTime = getCurrentTimeInTimezone(userTimezone);
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Parse DnD times
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    // Check if current time is in DnD window
    let inDndWindow = false;
    if (startMinutes > endMinutes) {
      // DnD spans midnight (e.g., 22:00 to 08:00)
      inDndWindow =
        currentTimeMinutes >= startMinutes || currentTimeMinutes <= endMinutes;
    } else {
      // DnD within same day
      inDndWindow =
        currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes;
    }

    if (!inDndWindow) {
      return { shouldDelay: false };
    }

    // High priority notifications can break DnD
    if (this.getPriority(notification) === "high") {
      return { shouldDelay: false };
    }

    // Calculate delay until end of DnD
    let delayUntil: Date;
    if (currentTimeMinutes >= startMinutes) {
      // DnD ends tomorrow
      delayUntil = new Date(userTime);
      delayUntil.setDate(delayUntil.getDate() + 1);
      delayUntil.setHours(endHour, endMinute, 0, 0);
    } else {
      // DnD ends today
      delayUntil = new Date(userTime);
      delayUntil.setHours(endHour, endMinute, 0, 0);
    }

    return { shouldDelay: true, delayUntil };
  }

  private static getTTL(
    notification: Notification,
    currentTime: Date
  ): Date | undefined {
    const priority = this.getPriority(notification);

    switch (priority) {
      case "high":
        // High priority notifications expire in 1 hour
        return new Date(currentTime.getTime() + 60 * 60 * 1000);
      case "medium":
        // Medium priority notifications expire in 24 hours
        return new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
      case "low":
        // Low priority notifications expire in 7 days
        return new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private static routeChannels(
    notification: Notification,
    userPreferences: NotificationPreferences | null,
    priority: "high" | "medium" | "low"
  ): ("mobile_push" | "web_push" | "email" | "sms" | "in_app")[] {
    const channels: (
      | "mobile_push"
      | "web_push"
      | "email"
      | "sms"
      | "in_app"
    )[] = ["in_app"];

    if (!userPreferences?.channels) {
      // Default channels based on priority
      if (priority === "high") {
        channels.push("web_push", "mobile_push");
      } else if (priority === "medium") {
        channels.push("web_push");
      }
      return channels;
    }

    const userChannels = userPreferences.channels as ChannelSettings;

    // Add channels based on user preferences
    if (userChannels.push !== false) {
      channels.push("web_push", "mobile_push");
    }
    if (userChannels.email === true) {
      channels.push("email");
    }
    if (userChannels.sms === true && priority === "high") {
      channels.push("sms");
    }

    return channels;
  }

  private static shouldBeDigested(
    notification: Notification,
    userPreferences: NotificationPreferences | null,
    priority: "high" | "medium" | "low"
  ): boolean {
    // High priority notifications are never digested
    if (priority === "high") {
      return false;
    }

    // Check user digest preferences
    if (userPreferences?.digest) {
      const digest = userPreferences.digest as unknown as DigestSettings;
      if (digest.enabled) {
        return true;
      }
    }

    // Low priority notifications are digested by default
    return priority === "low";
  }

  private static respectsDnd(
    notification: Notification,
    userPreferences: NotificationPreferences | null,
    userTimezone: string,
    currentTime: Date
  ): boolean {
    const { shouldDelay } = this.checkDndAndTiming(
      notification,
      userPreferences,
      userTimezone,
      currentTime
    );
    return !shouldDelay;
  }

  private static respectsUserPreferences(
    notification: Notification,
    userPreferences: NotificationPreferences | null
  ): boolean {
    if (!userPreferences?.channels) {
      return true; // No preferences set, allow all
    }

    const userChannels = userPreferences.channels as ChannelSettings;
    const notificationType = notification.type.split(".")[0]; // network, calendar, etc.

    // Check if this notification type is enabled
    return userChannels[notificationType] !== false;
  }
}
