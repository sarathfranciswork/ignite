"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

type SetupStep = "idle" | "qr" | "verify" | "backup-codes";

export function TwoFactorSection() {
  const utils = trpc.useUtils();
  const [setupStep, setSetupStep] = useState<SetupStep>("idle");
  const [setupData, setSetupData] = useState<{
    qrCodeDataUri: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState("");
  const [regenCode, setRegenCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: status, isLoading: statusLoading } = trpc.security.twoFactorStatus.useQuery();

  const setupMutation = trpc.security.twoFactorSetup.useMutation({
    onSuccess(data) {
      setSetupData({ qrCodeDataUri: data.qrCodeDataUri, secret: data.secret });
      setSetupStep("qr");
      setError("");
    },
    onError(err) {
      setError(err.message);
    },
  });

  const verifyMutation = trpc.security.twoFactorVerify.useMutation({
    onSuccess(data) {
      setBackupCodes(data.backupCodes);
      setSetupStep("backup-codes");
      setError("");
      void utils.security.twoFactorStatus.invalidate();
    },
    onError(err) {
      setError(err.message);
    },
  });

  const disableMutation = trpc.security.twoFactorDisable.useMutation({
    onSuccess() {
      setShowDisable(false);
      setDisableCode("");
      setError("");
      void utils.security.twoFactorStatus.invalidate();
    },
    onError(err) {
      setError(err.message);
    },
  });

  const regenMutation = trpc.security.twoFactorRegenerateBackupCodes.useMutation({
    onSuccess(data) {
      setBackupCodes(data.backupCodes);
      setShowRegen(false);
      setRegenCode("");
      setSetupStep("backup-codes");
      setError("");
      void utils.security.twoFactorStatus.invalidate();
    },
    onError(err) {
      setError(err.message);
    },
  });

  function handleCopyBackupCodes() {
    void navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account using an authenticator app
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {setupStep === "idle" && !status?.isEnabled && (
          <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
            {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enable Two-Factor Authentication
          </Button>
        )}

        {setupStep === "idle" && status?.isEnabled && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Two-factor authentication is enabled
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Backup codes remaining: {status.backupCodesRemaining}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRegen(true)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Backup Codes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setShowDisable(true)}
              >
                Disable 2FA
              </Button>
            </div>

            {showDisable && (
              <div className="space-y-2 rounded-md border p-4">
                <Label htmlFor="disable-code">Enter your TOTP code to disable 2FA</Label>
                <div className="flex gap-2">
                  <Input
                    id="disable-code"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="max-w-[200px]"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disableMutation.mutate({ totpCode: disableCode })}
                    disabled={disableMutation.isPending || disableCode.length < 6}
                  >
                    {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm Disable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowDisable(false);
                      setDisableCode("");
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {showRegen && (
              <div className="space-y-2 rounded-md border p-4">
                <Label htmlFor="regen-code">Enter your TOTP code to regenerate backup codes</Label>
                <div className="flex gap-2">
                  <Input
                    id="regen-code"
                    value={regenCode}
                    onChange={(e) => setRegenCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="max-w-[200px]"
                  />
                  <Button
                    size="sm"
                    onClick={() => regenMutation.mutate({ totpCode: regenCode })}
                    disabled={regenMutation.isPending || regenCode.length < 6}
                  >
                    {regenMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowRegen(false);
                      setRegenCode("");
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {setupStep === "qr" && setupData && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={setupData.qrCodeDataUri} alt="2FA QR Code" className="h-48 w-48" />
            </div>
            <div className="rounded-md bg-gray-50 p-3">
              <p className="mb-1 text-xs text-gray-500">Or enter this secret manually:</p>
              <code className="break-all font-mono text-sm">{setupData.secret}</code>
            </div>
            <Button onClick={() => setSetupStep("verify")}>Continue</Button>
          </div>
        )}

        {setupStep === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app to verify setup:
            </p>
            <div className="flex gap-2">
              <Input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="max-w-[200px] text-center text-lg tracking-widest"
              />
              <Button
                onClick={() => verifyMutation.mutate({ totpCode })}
                disabled={verifyMutation.isPending || totpCode.length < 6}
              >
                {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </div>
          </div>
        )}

        {setupStep === "backup-codes" && backupCodes.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-md bg-yellow-50 p-3">
              <p className="text-sm font-medium text-yellow-800">
                Save these backup codes in a safe place. Each code can only be used once.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-4 font-mono text-sm">
              {backupCodes.map((code) => (
                <div key={code} className="text-gray-700">
                  {code}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyBackupCodes}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied!" : "Copy Codes"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSetupStep("idle");
                  setSetupData(null);
                  setTotpCode("");
                  setBackupCodes([]);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
