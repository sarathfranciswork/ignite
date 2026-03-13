"use client";

import { useState } from "react";
import { ShieldCheck, Smartphone, Monitor, Loader2, Copy, Check, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

function TwoFactorSetup() {
  const utils = trpc.useUtils();
  const { data: status, isLoading: statusLoading } = trpc.twoFactor.getStatus.useQuery();
  const setupMutation = trpc.twoFactor.setup.useMutation();
  const verifyMutation = trpc.twoFactor.verify.useMutation();
  const disableMutation = trpc.twoFactor.disable.useMutation();
  const regenerateMutation = trpc.twoFactor.regenerateBackupCodes.useMutation();

  const [step, setStep] = useState<"idle" | "setup" | "verify" | "backup" | "disable">("idle");
  const [setupData, setSetupData] = useState<{
    qrCodeDataUri: string;
    secret: string;
  } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [regenerateCode, setRegenerateCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [copiedBackup, setCopiedBackup] = useState(false);

  async function handleSetup() {
    setError("");
    try {
      const result = await setupMutation.mutateAsync();
      setSetupData({ qrCodeDataUri: result.qrCodeDataUri, secret: result.secret });
      setStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = await verifyMutation.mutateAsync({ totpCode: verifyCode });
      setBackupCodes(result.backupCodes);
      setStep("backup");
      setVerifyCode("");
      await utils.twoFactor.getStatus.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await disableMutation.mutateAsync({ totpCode: disableCode });
      setStep("idle");
      setDisableCode("");
      await utils.twoFactor.getStatus.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA");
    }
  }

  async function handleRegenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = await regenerateMutation.mutateAsync({ totpCode: regenerateCode });
      setBackupCodes(result.backupCodes);
      setStep("backup");
      setRegenerateCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate codes");
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n")).catch(() => {
      /* noop */
    });
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  }

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-600" />
          <CardTitle>Two-Factor Authentication</CardTitle>
        </div>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {status?.isEnabled && step === "idle" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <ShieldCheck className="h-4 w-4" />
              Two-factor authentication is enabled
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("verify")}>
                Regenerate Backup Codes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("disable")}
                className="text-red-600 hover:text-red-700"
              >
                Disable 2FA
              </Button>
            </div>
          </div>
        )}

        {!status?.isEnabled && step === "idle" && (
          <Button onClick={handleSetup} disabled={setupMutation.isPending}>
            {setupMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="mr-2 h-4 w-4" />
            )}
            Enable Two-Factor Authentication
          </Button>
        )}

        {step === "setup" && setupData && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI QR code */}
              <img src={setupData.qrCodeDataUri} alt="2FA QR Code" className="h-48 w-48" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">Or enter this secret manually:</p>
              <code className="block break-all rounded bg-gray-100 p-2 text-xs">
                {setupData.secret}
              </code>
            </div>
            <form onSubmit={handleVerify} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="verify-code">Enter the 6-digit code from your app</Label>
                <Input
                  id="verify-code"
                  type="text"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={verifyMutation.isPending}>
                  {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Enable
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep("idle");
                    setSetupData(null);
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "verify" && (
          <form onSubmit={handleRegenerate} className="space-y-3">
            <p className="text-sm text-gray-600">
              Enter your current 2FA code to regenerate backup codes:
            </p>
            <div className="space-y-2">
              <Label htmlFor="regenerate-code">Verification Code</Label>
              <Input
                id="regenerate-code"
                type="text"
                placeholder="000000"
                value={regenerateCode}
                onChange={(e) => setRegenerateCode(e.target.value)}
                maxLength={6}
                required
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={regenerateMutation.isPending}>
                {regenerateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Regenerate
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("idle");
                  setError("");
                  setRegenerateCode("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {step === "backup" && backupCodes.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              Save these backup codes in a secure location. Each code can only be used once. You
              will not be able to see these codes again.
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-4">
              {backupCodes.map((code, index) => (
                <code key={index} className="font-mono text-sm">
                  {code}
                </code>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                {copiedBackup ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copiedBackup ? "Copied" : "Copy All"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setStep("idle");
                  setBackupCodes([]);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {step === "disable" && (
          <form onSubmit={handleDisable} className="space-y-3">
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              Disabling 2FA will reduce the security of your account.
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-code">Enter your 2FA code to confirm</Label>
              <Input
                id="disable-code"
                type="text"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                required
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                disabled={disableMutation.isPending}
              >
                {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable 2FA
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("idle");
                  setError("");
                  setDisableCode("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveSessions() {
  const utils = trpc.useUtils();
  const { data: sessions, isLoading } = trpc.twoFactor.sessionList.useQuery();
  const terminateMutation = trpc.twoFactor.sessionTerminate.useMutation({
    onSuccess: () => utils.twoFactor.sessionList.invalidate(),
  });
  const terminateAllMutation = trpc.twoFactor.sessionTerminateAll.useMutation({
    onSuccess: () => utils.twoFactor.sessionList.invalidate(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary-600" />
            <CardTitle>Active Sessions</CardTitle>
          </div>
          {sessions && sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                if (sessions[0]) {
                  terminateAllMutation.mutate({
                    currentSessionId: sessions[0].id,
                  });
                }
              }}
              disabled={terminateAllMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out All Others
            </Button>
          )}
        </div>
        <CardDescription>Manage your active sessions across devices.</CardDescription>
      </CardHeader>
      <CardContent>
        {!sessions || sessions.length === 0 ? (
          <p className="text-sm text-gray-500">No active sessions found.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, index) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">
                      {session.deviceInfo ? parseDeviceInfo(session.deviceInfo) : "Unknown Device"}
                    </span>
                    {index === 0 && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {session.ipAddress && <span>IP: {session.ipAddress}</span>}
                    {session.ipAddress && session.lastActivityAt && <span> &middot; </span>}
                    {session.lastActivityAt && (
                      <span>Last active: {new Date(session.lastActivityAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                {index !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => terminateMutation.mutate({ sessionId: session.id })}
                    disabled={terminateMutation.isPending}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function parseDeviceInfo(userAgent: string): string {
  if (userAgent.includes("Chrome")) return "Chrome Browser";
  if (userAgent.includes("Firefox")) return "Firefox Browser";
  if (userAgent.includes("Safari")) return "Safari Browser";
  if (userAgent.includes("Edge")) return "Edge Browser";
  if (userAgent.length > 50) return userAgent.slice(0, 50) + "...";
  return userAgent;
}

export default function SecuritySettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
        <p className="text-sm text-gray-500">
          Manage your account security, two-factor authentication, and active sessions.
        </p>
      </div>
      <TwoFactorSetup />
      <ActiveSessions />
    </div>
  );
}
