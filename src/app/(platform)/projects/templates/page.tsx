"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProcessTemplateCard } from "@/components/projects/ProcessTemplateCard";
import { CreateProcessTemplateDialog } from "@/components/projects/CreateProcessTemplateDialog";
import { Workflow, Plus, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ProcessTemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const templatesQuery = trpc.processDefinition.list.useQuery({
    limit: 50,
    search: search || undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.processDefinition.create.useMutation({
    onSuccess: (data) => {
      toast.success("Process template created");
      setShowCreateDialog(false);
      utils.processDefinition.list.invalidate();
      if (data) {
        router.push(`/projects/templates/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (data: { name: string; description?: string }) => {
    createMutation.mutate({
      name: data.name,
      description: data.description,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Workflow className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Process Templates</h1>
            <p className="text-sm text-gray-500">
              Define phase-gate process definitions with activities and tasks
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
          />
        </div>
      </div>

      {templatesQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {templatesQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load templates. Please try again.</p>
        </div>
      )}

      {templatesQuery.data && templatesQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Workflow className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">
            No templates yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first process template to define phase-gate workflows.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>
      )}

      {templatesQuery.data && templatesQuery.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templatesQuery.data.items.map((template) => (
            <ProcessTemplateCard
              key={template.id}
              template={template}
              onClick={(id) => router.push(`/projects/templates/${id}`)}
            />
          ))}
        </div>
      )}

      <CreateProcessTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
