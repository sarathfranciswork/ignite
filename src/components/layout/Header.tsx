"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/NotificationCenter";
import { CommandPalette } from "@/components/shared/CommandPalette";

interface HeaderProps {
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    crumbs.push({ label, href: currentPath });
  }

  return crumbs.slice(0, 3);
}

export function Header({ sidebarCollapsed, onMobileMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-6 transition-all",
        sidebarCollapsed ? "lg:pl-[calc(64px+1.5rem)]" : "lg:pl-[calc(260px+1.5rem)]",
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMobileMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs */}
      <nav className="hidden items-center gap-1.5 text-sm md:flex" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            {index > 0 && <span className="text-gray-300">/</span>}
            <span
              className={cn(
                index === breadcrumbs.length - 1 ? "font-medium text-gray-900" : "text-gray-500",
              )}
            >
              {crumb.label}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search - Command Palette trigger */}
      <div className="hidden md:block">
        <CommandPalette />
      </div>

      {/* Notifications */}
      <NotificationBell />

      {/* User avatar */}
      <Avatar size="sm">
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </header>
  );
}
