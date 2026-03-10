import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Ignite",
};

export default function LoginPage() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Welcome to Ignite
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Sign in to your account to continue
        </p>
      </div>
      <form className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-[var(--foreground)]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-[var(--foreground)]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
