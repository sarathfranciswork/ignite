"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiaForm } from "@/components/sias/SiaForm";
import { trpc } from "@/lib/trpc";

export default function NewSiaPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const createMutation = trpc.sia.create.useMutation({
    onSuccess: (data) => {
      void utils.sia.list.invalidate();
      router.push(`/strategy/sias/${data.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/strategy/sias">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            New Strategic Innovation Area
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Define a new strategic area to align innovation efforts.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {createMutation.isError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {createMutation.error.message}
          </div>
        )}
        <SiaForm
          onSubmit={(values) => createMutation.mutate(values)}
          isSubmitting={createMutation.isPending}
          submitLabel="Create SIA"
        />
      </div>
    </div>
  );
}
