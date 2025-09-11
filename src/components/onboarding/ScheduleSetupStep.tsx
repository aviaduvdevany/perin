"use client";

import { motion } from "framer-motion";
import { StepCard } from "./StepCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimezoneSelector } from "@/components/ui/TimezoneSelector";
import { OnboardingStepProps } from "./types";

const dayOptions = [
  { value: "monday", label: "Monday", short: "Mon" },
  { value: "tuesday", label: "Tuesday", short: "Tue" },
  { value: "wednesday", label: "Wednesday", short: "Wed" },
  { value: "thursday", label: "Thursday", short: "Thu" },
  { value: "friday", label: "Friday", short: "Fri" },
  { value: "saturday", label: "Saturday", short: "Sat" },
  { value: "sunday", label: "Sunday", short: "Sun" },
];

export function ScheduleSetupStep({
  onboardingData,
  updateData,
  updatePreferredHours,
}: Pick<
  OnboardingStepProps,
  "onboardingData" | "updateData" | "updatePreferredHours"
>) {
  return (
    <StepCard
      icon="⏰"
      title="When are you available?"
      description="Help me understand your schedule for better assistance"
      iconGradient="from-green-500 to-emerald-500"
    >
      <div className="space-y-6">
        <div>
          <Label className="text-foreground font-medium">Your Timezone</Label>
          <TimezoneSelector
            value={onboardingData.timezone}
            onChange={(timezone) => updateData("timezone", timezone)}
            placeholder="Select your timezone"
            className="mt-2"
            autoDetect={true}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-foreground font-medium">Start Time</Label>
            <Input
              type="time"
              value={onboardingData.preferred_hours.start}
              onChange={(e) => updatePreferredHours?.("start", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-foreground font-medium">End Time</Label>
            <Input
              type="time"
              value={onboardingData.preferred_hours.end}
              onChange={(e) => updatePreferredHours?.("end", e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label className="text-foreground font-medium mb-3 block">
            Available Days
          </Label>
          <div className="grid grid-cols-7 gap-2">
            {dayOptions.map((day) => (
              <motion.button
                key={day.value}
                onClick={() => {
                  const currentDays = onboardingData.preferred_hours.days;
                  const newDays = currentDays.includes(day.value)
                    ? currentDays.filter((d) => d !== day.value)
                    : [...currentDays, day.value];
                  updatePreferredHours?.("days", newDays);
                }}
                className={`p-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  onboardingData.preferred_hours.days.includes(day.value)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {day.short}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </StepCard>
  );
}
