import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Ignite",
};

export default function AdminPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
        Administration
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Platform administration and settings.
      </p>
    </div>
  );
}
