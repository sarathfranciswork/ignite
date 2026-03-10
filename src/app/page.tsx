import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold tracking-tight text-gray-900">Ignite</h1>
        <p className="mt-4 text-xl text-gray-600">Open-source Innovation Management Platform</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-500"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
