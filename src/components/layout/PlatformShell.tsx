"use client";

import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui.store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200",
          sidebarCollapsed
            ? "md:ml-[var(--spacing-sidebar-collapsed)]"
            : "md:ml-[var(--spacing-sidebar)]",
        )}
      >
        <Header />
        <main className="p-6">
          <div className="mx-auto max-w-[960px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
