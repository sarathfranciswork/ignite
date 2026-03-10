"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Wand2 } from "lucide-react";
import Link from "next/link";
import { CampaignWizard } from "@/components/campaigns/CampaignWizard";
import { StepDescription } from "@/components/campaigns/wizard/StepDescription";
import { StepSubmissionForm } from "@/components/campaigns/wizard/StepSubmissionForm";
import { trpc } from "@/lib/trpc";
import type { CustomField, WizardStepDescriptionData, WizardStepId } from "@/types/campaign-wizard";

interface CampaignData {
  id: string;
  title: string;
  teaser: string | null;
  description: string | null;
  bannerUrl: string | null;
  videoUrl: string | null;
  callToAction: string | null;
  supportContent: string | null;
  tags: string[];
  status: string;
  customFields: unknown;
  submissionCloseDate: string | null;
  votingCloseDate: string | null;
  plannedCloseDate: string | null;
}

export default function CampaignWizardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeStep, setActiveStep] = React.useState<WizardStepId>(1);
  const [completedSteps, setCompletedSteps] = React.useState<Set<WizardStepId>>(new Set());

  const campaignQuery = trpc.campaign.getById.useQuery({ id: params.id }, { enabled: !!params.id });
  const updateMutation = trpc.campaign.update.useMutation();
  const utils = trpc.useUtils();

  const markStepCompleted = (step: WizardStepId) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const handleSaveDescription = (data: WizardStepDescriptionData) => {
    updateMutation.mutate(
      {
        id: params.id,
        title: data.title,
        teaser: data.teaser ?? undefined,
        description: data.description ?? undefined,
        bannerUrl: data.bannerUrl,
        videoUrl: data.videoUrl,
        callToAction: data.callToAction ?? undefined,
        supportContent: data.supportContent ?? undefined,
        tags: data.tags,
        submissionCloseDate: data.submissionCloseDate
          ? new Date(data.submissionCloseDate).toISOString()
          : undefined,
        votingCloseDate: data.votingCloseDate
          ? new Date(data.votingCloseDate).toISOString()
          : undefined,
        plannedCloseDate: data.plannedCloseDate
          ? new Date(data.plannedCloseDate).toISOString()
          : undefined,
        setupType: "ADVANCED",
      },
      {
        onSuccess: () => {
          markStepCompleted(1);
          void utils.campaign.getById.invalidate({ id: params.id });
        },
      },
    );
  };

  const handleSaveSubmissionForm = (fields: CustomField[]) => {
    updateMutation.mutate(
      {
        id: params.id,
        customFields: fields,
        setupType: "ADVANCED",
      },
      {
        onSuccess: () => {
          markStepCompleted(2);
          void utils.campaign.getById.invalidate({ id: params.id });
        },
      },
    );
  };

  if (campaignQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="flex gap-6">
          <div className="h-96 w-64 animate-pulse rounded-lg bg-gray-100" />
          <div className="h-96 flex-1 animate-pulse rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (campaignQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load campaign. Please try again.</p>
      </div>
    );
  }

  if (!campaignQuery.data) return null;

  const campaign = campaignQuery.data as unknown as CampaignData;

  if (campaign.status !== "DRAFT") {
    router.push(`/campaigns/${params.id}`);
    return null;
  }

  const formatDateForInput = (iso: string | null): string => {
    if (!iso) return "";
    return new Date(iso).toISOString().split("T")[0] ?? "";
  };

  const descriptionDefaults: WizardStepDescriptionData = {
    title: campaign.title,
    teaser: campaign.teaser ?? undefined,
    description: campaign.description ?? undefined,
    bannerUrl: campaign.bannerUrl,
    videoUrl: campaign.videoUrl,
    callToAction: campaign.callToAction ?? undefined,
    supportContent: campaign.supportContent ?? undefined,
    tags: campaign.tags,
    submissionCloseDate: formatDateForInput(campaign.submissionCloseDate),
    votingCloseDate: formatDateForInput(campaign.votingCloseDate),
    plannedCloseDate: formatDateForInput(campaign.plannedCloseDate),
  };

  const existingCustomFields = (campaign.customFields as CustomField[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/campaigns/${params.id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaign
          </Link>
          <h1 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold text-gray-900">
            <Wand2 className="h-6 w-6 text-primary-600" />
            Advanced Campaign Wizard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure &quot;{campaign.title}&quot; with the advanced wizard.
          </p>
        </div>
      </div>

      {updateMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {updateMutation.error.message}
        </div>
      )}

      {updateMutation.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Step saved successfully.
        </div>
      )}

      <CampaignWizard
        campaignId={params.id}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        completedSteps={completedSteps}
      >
        {activeStep === 1 && (
          <StepDescription
            defaultValues={descriptionDefaults}
            onSave={handleSaveDescription}
            isSaving={updateMutation.isPending}
          />
        )}

        {activeStep === 2 && (
          <StepSubmissionForm
            customFields={existingCustomFields}
            onSave={handleSaveSubmissionForm}
            isSaving={updateMutation.isPending}
          />
        )}

        {(activeStep === 3 || activeStep === 4 || activeStep === 5) && (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-sm text-gray-500">This step will be available in a future story.</p>
          </div>
        )}
      </CampaignWizard>
    </div>
  );
}
