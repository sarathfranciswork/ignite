import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Ignite",
};

export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Welcome to Ignite. Your innovation management hub.
      </p>
    </div>
  );
}
