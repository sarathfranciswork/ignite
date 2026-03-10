import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — Ignite",
};

export default function ProfilePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
        Profile
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Manage your account settings and preferences.
      </p>
    </div>
  );
}
