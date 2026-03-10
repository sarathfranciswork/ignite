import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore — Ignite",
};

export default function ExplorePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
        Explore
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Discover campaigns and ideas across the organization.
      </p>
    </div>
  );
}
