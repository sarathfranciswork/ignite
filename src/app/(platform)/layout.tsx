import { PlatformShell } from "~/components/layout/PlatformShell";

export default function PlatformLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <PlatformShell>{children}</PlatformShell>;
}
