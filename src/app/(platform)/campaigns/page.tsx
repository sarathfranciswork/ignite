import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Campaigns — Ignite",
};

export default function CampaignsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
        Campaigns
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Browse and manage innovation campaigns.
      </p>
    </div>
  );
}
