"use client";

import { use, useMemo } from "react";
import { PairwiseEvaluationPage } from "@/components/evaluation/pairwise-evaluation-page";
import { EvalSessionType, EvalFieldType } from "@/types/evaluation";
import type { EvaluationSession, Idea } from "@/types/evaluation";

// Demo data for development — will be replaced by tRPC queries
function getDemoSession(sessionId: string): EvaluationSession {
  return {
    id: sessionId,
    name: "Q1 Innovation Sprint — Pairwise Evaluation",
    type: EvalSessionType.PAIRWISE,
    status: "ACTIVE" as EvaluationSession["status"],
    evaluatorGuidance:
      "Compare each pair of ideas on the criteria below. Use the slider to indicate which idea is better and by how much.",
    dueDate: null,
    evaluationType: "INDIVIDUAL" as EvaluationSession["evaluationType"],
    minComparisonsPerEvaluator: null,
    maxComparisonsPerEvaluator: null,
    campaignId: "campaign-1",
    organizerId: "user-1",
    criteria: [
      {
        id: "crit-1",
        sessionId,
        name: "Innovation Potential",
        description: "How novel and creative is this idea?",
        fieldType: EvalFieldType.SELECTION_5,
        isMandatory: true,
        sortOrder: 0,
        options: null,
        higherIsBetter: true,
      },
      {
        id: "crit-2",
        sessionId,
        name: "Feasibility",
        description:
          "How realistic is the implementation with current resources?",
        fieldType: EvalFieldType.SELECTION_5,
        isMandatory: true,
        sortOrder: 1,
        options: null,
        higherIsBetter: true,
      },
      {
        id: "crit-3",
        sessionId,
        name: "Business Impact",
        description:
          "What is the potential impact on revenue, customers, or operations?",
        fieldType: EvalFieldType.SELECTION_5,
        isMandatory: true,
        sortOrder: 2,
        options: null,
        higherIsBetter: true,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    closedAt: null,
  };
}

function getDemoIdeas(): Idea[] {
  return [
    {
      id: "idea-1",
      title: "AI-Powered Customer Support Bot",
      description:
        "Implement an intelligent chatbot that uses natural language processing to handle tier-1 support tickets automatically. The bot would learn from historical ticket data and integrate with our existing CRM system.",
      authorName: "Alice Johnson",
      createdAt: new Date().toISOString(),
      imageUrl: null,
      commentCount: 12,
      likeCount: 24,
    },
    {
      id: "idea-2",
      title: "Sustainability Dashboard",
      description:
        "Create a real-time dashboard tracking our carbon footprint across all operations. This would include supply chain emissions, energy usage, and waste metrics with automated reporting for ESG compliance.",
      authorName: "Bob Martinez",
      createdAt: new Date().toISOString(),
      imageUrl: null,
      commentCount: 8,
      likeCount: 31,
    },
    {
      id: "idea-3",
      title: "Cross-Department Innovation Hub",
      description:
        "Build a digital platform where employees from different departments can collaborate on innovation projects. Features include idea boards, resource sharing, mentorship matching, and progress tracking.",
      authorName: "Carol Chen",
      createdAt: new Date().toISOString(),
      imageUrl: null,
      commentCount: 15,
      likeCount: 42,
    },
    {
      id: "idea-4",
      title: "Predictive Maintenance System",
      description:
        "Deploy IoT sensors and machine learning models to predict equipment failures before they occur. This would reduce downtime by an estimated 40% and extend equipment lifespan by 25%.",
      authorName: "David Kim",
      createdAt: new Date().toISOString(),
      imageUrl: null,
      commentCount: 6,
      likeCount: 18,
    },
  ];
}

interface PageParams {
  campaignId: string;
  sessionId: string;
}

export default function EvaluateSessionPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const resolvedParams = use(params);
  const session = useMemo(
    () => getDemoSession(resolvedParams.sessionId),
    [resolvedParams.sessionId],
  );
  const ideas = useMemo(() => getDemoIdeas(), []);

  return <PairwiseEvaluationPage session={session} ideas={ideas} />;
}
