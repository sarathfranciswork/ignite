"use client";

import * as React from "react";
import { Plus, Calendar, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type TaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

const TASK_COLUMNS: { status: TaskStatus; label: string; className: string }[] = [
  { status: "OPEN", label: "Open", className: "border-t-gray-400" },
  { status: "IN_PROGRESS", label: "In Progress", className: "border-t-blue-400" },
  { status: "COMPLETED", label: "Completed", className: "border-t-emerald-400" },
];

interface TaskBoardProps {
  useCaseId: string;
}

export function TaskBoard({ useCaseId }: TaskBoardProps) {
  const utils = trpc.useUtils();
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [addingInColumn, setAddingInColumn] = React.useState<TaskStatus | null>(null);

  const tasksQuery = trpc.useCase.listTasks.useQuery({ useCaseId });
  const createTask = trpc.useCase.createTask.useMutation({
    onSuccess: () => {
      void utils.useCase.listTasks.invalidate({ useCaseId });
      void utils.useCase.getById.invalidate({ id: useCaseId });
      setNewTaskTitle("");
      setAddingInColumn(null);
    },
  });
  const updateTask = trpc.useCase.updateTask.useMutation({
    onSuccess: () => {
      void utils.useCase.listTasks.invalidate({ useCaseId });
    },
  });
  const deleteTask = trpc.useCase.deleteTask.useMutation({
    onSuccess: () => {
      void utils.useCase.listTasks.invalidate({ useCaseId });
      void utils.useCase.getById.invalidate({ id: useCaseId });
    },
  });

  const tasks = tasksQuery.data ?? [];

  function handleAddTask(status: TaskStatus) {
    if (!newTaskTitle.trim()) return;
    createTask.mutate({
      useCaseId,
      title: newTaskTitle.trim(),
      status,
    });
  }

  function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    updateTask.mutate({ id: taskId, status: newStatus });
  }

  function handleDeleteTask(taskId: string) {
    deleteTask.mutate({ id: taskId });
  }

  if (tasksQuery.isLoading) {
    return (
      <div className="flex gap-4">
        {TASK_COLUMNS.map((col) => (
          <div key={col.status} className="min-w-[220px] flex-1">
            <div className="mb-3 h-6 w-24 animate-pulse rounded bg-gray-100" />
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-lg bg-gray-50" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TASK_COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="min-w-[220px] flex-1">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-700">{col.label}</h4>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {columnTasks.length}
                </span>
              </div>
              <button
                onClick={() => setAddingInColumn(col.status)}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className={cn("space-y-2 rounded-lg border-t-2 bg-gray-50/50 p-2", col.className)}>
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className="group rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {task.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{task.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {task.assignee && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <User className="h-3 w-3" />
                        {task.assignee.name ?? task.assignee.email}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1">
                    {TASK_COLUMNS.filter((c) => c.status !== col.status).map((target) => (
                      <button
                        key={target.status}
                        onClick={() => handleStatusChange(task.id, target.status)}
                        className="rounded border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500 transition-colors hover:bg-gray-100"
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {addingInColumn === col.status && (
                <div className="rounded-lg border border-gray-200 bg-white p-2">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title..."
                    className="mb-2 h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTask(col.status);
                      if (e.key === "Escape") {
                        setAddingInColumn(null);
                        setNewTaskTitle("");
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAddTask(col.status)}
                      disabled={createTask.isPending || !newTaskTitle.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setAddingInColumn(null);
                        setNewTaskTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {columnTasks.length === 0 && addingInColumn !== col.status && (
                <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
