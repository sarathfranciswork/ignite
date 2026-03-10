"use client";

import { Bell, Search, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1),
    href: "/" + segments.slice(0, index + 1).join("/"),
    isLast: index === segments.length - 1,
  }));
}

export function Header() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {!crumb.isLast ? (
              <>
                <Link
                  href={crumb.href}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {crumb.label}
                </Link>
                <ChevronRight
                  size={14}
                  className="text-[var(--muted-foreground)]"
                />
              </>
            ) : (
              <span className="font-medium text-[var(--foreground)]">
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Search placeholder */}
        <div className="hidden items-center gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] md:flex">
          <Search size={16} />
          <span>Search...</span>
          <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-xs">
            ⌘K
          </kbd>
        </div>

        {/* Notification bell placeholder */}
        <button
          type="button"
          className="rounded-md p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>

        {/* User avatar placeholder */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-medium text-white">
          U
        </div>
      </div>
    </header>
  );
}
