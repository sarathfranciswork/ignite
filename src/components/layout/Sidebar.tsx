"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Compass,
  Shield,
  PanelLeftClose,
  PanelLeft,
  Flame,
  Menu,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui.store";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Admin", href: "/admin", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    sidebarMobileOpen,
    toggleSidebar,
    setSidebarMobileOpen,
  } = useUIStore();

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-md bg-[var(--sidebar-bg)] p-2 text-[var(--sidebar-fg)] md:hidden"
        onClick={() => setSidebarMobileOpen(!sidebarMobileOpen)}
        aria-label="Toggle navigation"
      >
        {sidebarMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarMobileOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] transition-all duration-200",
          sidebarCollapsed
            ? "w-[var(--spacing-sidebar-collapsed)]"
            : "w-[var(--spacing-sidebar)]",
          sidebarMobileOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-4">
          <Flame className="h-7 w-7 shrink-0 text-primary-400" />
          {!sidebarCollapsed && (
            <span className="font-display text-lg font-bold tracking-tight">
              Ignite
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[var(--sidebar-active)] text-white"
                    : "text-gray-400 hover:bg-[var(--sidebar-hover)] hover:text-white",
                )}
              >
                <Icon size={20} className="shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-gray-800 p-3 md:block">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-[var(--sidebar-hover)] hover:text-white"
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <PanelLeft size={20} />
            ) : (
              <>
                <PanelLeftClose size={20} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
