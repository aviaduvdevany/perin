// App-wide configuration constants

export const APP_CONFIG = {
  // API Configuration
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,

  // Feature Flags
  FEATURES: {
    ENABLE_MEETINGS: true,
    ENABLE_USER_PROFILES: true,
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Timeouts
  API_TIMEOUT: 10000, // 10 seconds
  DB_TIMEOUT: 5000, // 5 seconds
} as const;

// Environment-specific configurations
export const ENV_CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  IS_TEST: process.env.NODE_ENV === "test",
} as const;
