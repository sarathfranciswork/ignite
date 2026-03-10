import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/dashboard", section: "core" },
  { label: "Campaigns", href: "/campaigns", section: "ideation" },
  { label: "Channels", href: "/channels", section: "ideation" },
  { label: "Explore", href: "/explore", section: "ideation" },
  { label: "Tasks", href: "/tasks", section: "core" },
  { label: "Strategy", href: "/strategy/trends", section: "strategy" },
  { label: "Partners", href: "/partners", section: "partners" },
  { label: "Projects", href: "/projects", section: "value" },
  { label: "Reports", href: "/reports", section: "analytics" },
  { label: "Admin", href: "/admin/users", section: "admin" },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-gray-900 text-white lg:block">
        <div className="flex h-16 items-center px-6">
          <span className="font-display text-xl font-bold text-white">Ignite</span>
        </div>
        <nav className="mt-2 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-4 left-3 right-3">
          <Link
            href="/profile"
            className="block rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            Profile
          </Link>
        </div>
      </aside>
      <main className="flex-1 bg-gray-50">
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-gray-900">Ignite</h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
