"use client";

import { trpc } from "@/lib/trpc";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: loginConfig } = trpc.admin.loginCustomizationGetPublic.useQuery();

  const backgroundUrl = loginConfig?.loginBannerUrl;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 bg-cover bg-center"
      style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
    >
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
