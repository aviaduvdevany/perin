export interface OnboardingData {
  name: string;
  perin_name: string;
  tone: string;
  timezone: string;
  preferred_hours: {
    start: string;
    end: string;
    days: string[];
  };
  gmail_connected: boolean;
  calendar_connected: boolean;
}

export interface OnboardingStepProps {
  onboardingData: OnboardingData;
  updateData: (key: keyof OnboardingData, value: string) => void;
  updatePreferredHours?: (key: string, value: string | string[]) => void;
  connectingIntegrations?: {
    gmail: boolean;
    calendar: boolean;
  };
  connectIntegration?: (integrationId: string) => void;
}
