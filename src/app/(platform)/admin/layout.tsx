"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Users,
  Building2,
  UsersRound,
  Settings,
  Activity,
  Palette,
  Bell,
  BookText,
  Globe,
  LogIn,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const systemAdminNav: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Org Units", href: "/admin/org-units", icon: Building2 },
  { label: "Groups", href: "/admin/groups", icon: UsersRound },
  { label: "Spaces", href: "/admin/spaces", icon: Globe },
  { label: "System Health", href: "/admin/health", icon: Activity },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "SCIM", href: "/admin/scim", icon: KeyRound },
];

const innovationConfigNav: AdminNavItem[] = [
  { label: "Customization", href: "/admin/customization", icon: Palette },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Login Page", href: "/admin/login-page", icon: LogIn },
  { label: "Terminology", href: "/admin/terminology", icon: BookText },
];

function NavSection({ title, items }: { title: string; items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <div>
      <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h3>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Admin Sub-Navigation */}
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50/50 lg:block">
        <div className="sticky top-16 space-y-6 p-4">
          {/* Header */}
          <div className="flex items-center gap-2 px-3">
            <Shield className="h-5 w-5 text-primary-600" />
            <h2 className="font-display text-sm font-bold text-gray-900">Admin Panel</h2>
          </div>

          <NavSection title="System Administration" items={systemAdminNav} />
          <NavSection title="Innovation Configuration" items={innovationConfigNav} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
