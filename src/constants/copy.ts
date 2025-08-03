// Friendly microcopy and messaging constants

export const COPY = {
  // Common actions
  ACTIONS: {
    SAVE: "Save",
    CANCEL: "Cancel",
    DELETE: "Delete",
    EDIT: "Edit",
    CREATE: "Create",
    SUBMIT: "Submit",
    LOADING: "Loading...",
  },

  // Error messages
  ERRORS: {
    GENERIC: "Something went wrong. Please try again.",
    NOT_FOUND: "The requested resource was not found.",
    UNAUTHORIZED: "You are not authorized to perform this action.",
    VALIDATION: "Please check your input and try again.",
    NETWORK: "Network error. Please check your connection.",
  },

  // Success messages
  SUCCESS: {
    SAVED: "Successfully saved!",
    CREATED: "Successfully created!",
    DELETED: "Successfully deleted!",
    UPDATED: "Successfully updated!",
  },

  // Form labels and placeholders
  FORMS: {
    EMAIL: "Email",
    PASSWORD: "Password",
    NAME: "Name",
    TITLE: "Title",
    DESCRIPTION: "Description",
    START_TIME: "Start Time",
    END_TIME: "End Time",
  },

  // Page titles
  PAGES: {
    HOME: "Home",
    PROFILE: "Profile",
    SETTINGS: "Settings",
  },
} as const;
