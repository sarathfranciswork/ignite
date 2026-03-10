"use client";

import * as React from "react";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS, type WizardStepId } from "@/types/campaign-wizard";

interface CampaignWizardProps {
  campaignId: string;
  activeStep: WizardStepId;
  onStepChange: (step: WizardStepId) => void;
  completedSteps: Set<WizardStepId>;
  children: React.ReactNode;
}

export function CampaignWizard({
  activeStep,
  onStepChange,
  completedSteps,
  children,
}: CampaignWizardProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <nav className="w-full shrink-0 lg:w-64" aria-label="Wizard steps">
        <ol className="space-y-1">
          {WIZARD_STEPS.map((step) => {
            const isActive = activeStep === step.id;
            const isCompleted = completedSteps.has(step.id);
            const isLocked = "locked" in step && step.locked;

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isLocked) {
                      onStepChange(step.id);
                    }
                  }}
                  disabled={isLocked}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                    isActive && "bg-primary-50 text-primary-700",
                    !isActive && !isLocked && "text-gray-600 hover:bg-gray-50",
                    isLocked && "cursor-not-allowed text-gray-400",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                      isActive && "border-primary-600 bg-primary-600 text-white",
                      isCompleted && !isActive && "border-green-500 bg-green-500 text-white",
                      !isActive && !isCompleted && !isLocked && "border-gray-300 text-gray-500",
                      isLocked && "border-gray-200 text-gray-300",
                    )}
                  >
                    {isLocked ? (
                      <Lock className="h-3 w-3" />
                    ) : isCompleted && !isActive ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      step.id
                    )}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "font-medium",
                        isActive && "text-primary-700",
                        isLocked && "text-gray-400",
                      )}
                    >
                      {step.label}
                    </p>
                    <p
                      className={cn(
                        "truncate text-xs",
                        isActive ? "text-primary-500" : "text-gray-400",
                        isLocked && "text-gray-300",
                      )}
                    >
                      {step.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
