"use client";

import { useParams } from "next/navigation";
import { UseCaseForm } from "@/components/useCases/UseCaseForm";
import { trpc } from "@/lib/trpc";

export default function EditUseCasePage() {
  const params = useParams<{ id: string }>();
  const useCaseQuery = trpc.useCase.getById.useQuery({ id: params.id });

  if (useCaseQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (useCaseQuery.isError || !useCaseQuery.data) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load use case for editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <UseCaseForm mode="edit" initialData={useCaseQuery.data} />
    </div>
  );
}
