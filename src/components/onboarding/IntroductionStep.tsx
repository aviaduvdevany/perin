"use client";

import { StepCard } from "./StepCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingStepProps } from "./types";

export function IntroductionStep({
  onboardingData,
  updateData,
}: Pick<OnboardingStepProps, "onboardingData" | "updateData">) {
  return (
    <StepCard
      icon="👋"
      title="Let's get to know you"
      description="Tell us your name so Perin can address you properly"
      iconGradient="from-blue-500 to-cyan-500"
    >
      <div className="space-y-6 flex flex-col justify-end h-full">
        <div>
          <Label htmlFor="name" className="text-foreground font-medium">
            What&apos;s your name?
          </Label>
          <Input
            id="name"
            type="text"
            value={onboardingData.name}
            onChange={(e) => updateData("name", e.target.value)}
            placeholder="Enter your name"
            className="mt-2"
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="perin_name" className="text-foreground font-medium">
            What&apos;s my name?
          </Label>
          <Input
            id="perin_name"
            type="text"
            value={onboardingData.perin_name}
            onChange={(e) => updateData("perin_name", e.target.value)}
            placeholder="e.g., Perin, Assistant, Helper"
            className="mt-2"
          />
        </div>
      </div>
    </StepCard>
  );
}
