import "~/app/globals.css";
import { type Metadata } from "next";
import { TRPCProvider } from "~/lib/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Ignite — Innovation Platform",
  description: "Crowdsourced innovation management platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <TRPCProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </TRPCProvider>
      </body>
    </html>
  );
}
