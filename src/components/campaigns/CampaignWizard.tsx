"use client";

import { useState, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "@/types/campaign";
import type { CampaignWizardData, WizardStepId } from "@/types/campaign";
import { StepDescription } from "./wizard/StepDescription";
import { StepSubmissionForm } from "./wizard/StepSubmissionForm";

const MAX_ACTIVE_STEP: WizardStepId = 2;

const DEFAULT_VALUES: CampaignWizardData = {
  title: "",
  bannerUrl: "",
  submissionCloseDate: "",
  votingCloseDate: "",
  sponsors: [],
  teaser: "",
  description: "",
  videoUrl: "",
  attachments: [],
  tags: [],
  callToActionText: "Submit your idea",
  hasSupportSection: false,
  supportContactName: "",
  supportContactEmail: "",
  campaignGuidance: "",
  customFields: [],
  defaultIdeaImageUrl: "",
};

export function CampaignWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStepId>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStepId>>(
    new Set(),
  );

  const methods = useForm<CampaignWizardData>({
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const handleSaveStep = useCallback(async () => {
    const isValid = await methods.trigger();
    if (isValid) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
    }
    return isValid;
  }, [currentStep, methods]);

  const handleNext = useCallback(async () => {
    const isValid = await handleSaveStep();
    if (isValid && currentStep < MAX_ACTIVE_STEP) {
      setCurrentStep((currentStep + 1) as WizardStepId);
    }
  }, [currentStep, handleSaveStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStepId);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((stepId: WizardStepId) => {
    if (stepId <= MAX_ACTIVE_STEP) {
      setCurrentStep(stepId);
    }
  }, []);

  return (
    <FormProvider {...methods}>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 text-white p-6 shrink-0 sticky top-0 h-screen">
          <h2 className="text-lg font-semibold mb-6">Campaign Setup</h2>
          <nav aria-label="Wizard steps">
            <ol className="space-y-2">
              {WIZARD_STEPS.map((step) => {
                const isActive = step.id <= MAX_ACTIVE_STEP;
                const isCurrent = step.id === currentStep;
                const isCompleted = completedSteps.has(step.id);

                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.id)}
                      disabled={!isActive}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                        isCurrent && "bg-primary-600 text-white",
                        !isCurrent &&
                          isActive &&
                          "text-gray-300 hover:bg-gray-800",
                        !isActive && "text-gray-600 cursor-not-allowed",
                      )}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0",
                          isCurrent && "bg-white text-primary-600",
                          isCompleted &&
                            !isCurrent &&
                            "bg-green-500 text-white",
                          !isCurrent &&
                            !isCompleted &&
                            isActive &&
                            "border border-gray-500 text-gray-400",
                          !isActive && "border border-gray-700 text-gray-700",
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check size={12} />
                        ) : !isActive ? (
                          <Lock size={10} />
                        ) : (
                          step.id
                        )}
                      </span>
                      <span>{step.label}</span>
                      {!isActive && (
                        <span className="ml-auto text-xs text-gray-600">
                          Locked
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-8 max-w-4xl w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {WIZARD_STEPS[currentStep - 1].label}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Step {currentStep} of {WIZARD_STEPS.length}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {currentStep === 1 && <StepDescription />}
              {currentStep === 2 && <StepSubmissionForm />}
            </div>
          </div>

          {/* Footer */}
          <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 1}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  currentStep === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100 border border-gray-300",
                )}
              >
                Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveStep}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                >
                  Save Draft
                </button>
                {currentStep < MAX_ACTIVE_STEP ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveStep}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    Save Campaign
                  </button>
                )}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </FormProvider>
  );
}
