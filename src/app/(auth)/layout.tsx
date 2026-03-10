export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
