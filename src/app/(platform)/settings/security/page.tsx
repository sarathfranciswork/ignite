import { TwoFactorSection } from "@/components/security/TwoFactorSection";
import { SessionsSection } from "@/components/security/SessionsSection";

export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-sm text-gray-500">Manage your account security and active sessions</p>
      </div>
      <TwoFactorSection />
      <SessionsSection />
    </div>
  );
}
