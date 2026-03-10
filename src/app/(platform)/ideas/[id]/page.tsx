"use client";

import { useParams } from "next/navigation";
import { IdeaDetail } from "@/components/ideas/IdeaDetail";

export default function IdeaDetailPage() {
  const params = useParams<{ id: string }>();

  return <IdeaDetail ideaId={params.id} />;
}
