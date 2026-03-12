import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth-provider";
import { TRPCProvider } from "@/lib/trpc-provider";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ignite - Innovation Management Platform",
  description:
    "Open-source innovation management platform for idea generation, evaluation, and implementation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ignite",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366F1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          <TRPCProvider>
            {children}
            <ServiceWorkerRegistrar />
          </TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
