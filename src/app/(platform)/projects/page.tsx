"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { FolderKanban, Plus, Search, Workflow } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function ProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const projectsQuery = trpc.project.list.useQuery({
    limit: 50,
    search: search || undefined,
    status: statusFilter
      ? (statusFilter as "ACTIVE" | "ON_HOLD" | "COMPLETED" | "TERMINATED")
      : undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.project.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created");
      setShowCreateDialog(false);
      utils.project.list.invalidate();
      if (data) {
        router.push(`/projects/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (data: {
    title: string;
    description?: string;
    processDefinitionId: string;
  }) => {
    createMutation.mutate({
      title: data.title,
      description: data.description,
      processDefinitionId: data.processDefinitionId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500">
              Phase-gate projects with custom process definitions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/templates">
            <Button variant="outline">
              <Workflow className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {projectsQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {projectsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load projects. Please try again.</p>
        </div>
      )}

      {projectsQuery.data && projectsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a process template first, then start a new project.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      )}

      {projectsQuery.data && projectsQuery.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsQuery.data.items.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={(id) => router.push(`/projects/${id}`)}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
