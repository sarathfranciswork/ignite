"use client";

import { useParams } from "next/navigation";
import { UseCaseDetail } from "@/components/useCases/UseCaseDetail";

export default function UseCaseDetailPage() {
  const params = useParams<{ id: string }>();
  return <UseCaseDetail id={params.id} />;
}
