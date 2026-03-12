"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiaForm } from "@/components/sias/SiaForm";
import { trpc } from "@/lib/trpc";

export default function EditSiaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const siaQuery = trpc.sia.getById.useQuery({ id: params.id });

  const updateMutation = trpc.sia.update.useMutation({
    onSuccess: () => {
      void utils.sia.getById.invalidate({ id: params.id });
      void utils.sia.list.invalidate();
      router.push(`/strategy/sias/${params.id}`);
    },
  });

  if (siaQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (siaQuery.isError || !siaQuery.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load SIA.</p>
        <Link href="/strategy/sias" className="mt-4 inline-block">
          <Button variant="outline">Back to SIAs</Button>
        </Link>
      </div>
    );
  }

  const sia = siaQuery.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/strategy/sias/${sia.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Edit: {sia.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Update this strategic innovation area.</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {updateMutation.isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {updateMutation.error.message}
          </div>
        )}
        <SiaForm
          defaultValues={{
            name: sia.name,
            description: sia.description ?? undefined,
            imageUrl: sia.imageUrl ?? undefined,
          }}
          onSubmit={(values) =>
            updateMutation.mutate({
              id: sia.id,
              ...values,
              imageUrl: values.imageUrl || null,
              description: values.description || null,
            })
          }
          isSubmitting={updateMutation.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}
