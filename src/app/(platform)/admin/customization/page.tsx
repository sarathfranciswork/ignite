"use client";

import * as React from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function WhiteLabelPage() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.whiteLabel.get.useQuery();

  const updateMutation = trpc.whiteLabel.update.useMutation({
    onSuccess: () => {
      void utils.whiteLabel.get.invalidate();
      void utils.whiteLabel.getPublic.invalidate();
    },
  });

  const resetMutation = trpc.whiteLabel.reset.useMutation({
    onSuccess: () => {
      void utils.whiteLabel.get.invalidate();
      void utils.whiteLabel.getPublic.invalidate();
    },
  });

  const [form, setForm] = React.useState({
    platformName: "",
    logoUrl: "",
    logoSmallUrl: "",
    faviconUrl: "",
    loginBannerUrl: "",
    primaryColor: "#6366F1",
    secondaryColor: "#8B5CF6",
    accentColor: "#EC4899",
    customDomain: "",
    emailLogoUrl: "",
    emailPrimaryColor: "#6366F1",
    emailFooterText: "",
  });

  React.useEffect(() => {
    if (config) {
      setForm({
        platformName: config.platformName,
        logoUrl: config.logoUrl ?? "",
        logoSmallUrl: config.logoSmallUrl ?? "",
        faviconUrl: config.faviconUrl ?? "",
        loginBannerUrl: config.loginBannerUrl ?? "",
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
        customDomain: config.customDomain ?? "",
        emailLogoUrl: config.emailLogoUrl ?? "",
        emailPrimaryColor: config.emailPrimaryColor,
        emailFooterText: config.emailFooterText ?? "",
      });
    }
  }, [config]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    updateMutation.mutate({
      platformName: form.platformName || undefined,
      logoUrl: form.logoUrl || null,
      logoSmallUrl: form.logoSmallUrl || null,
      faviconUrl: form.faviconUrl || null,
      loginBannerUrl: form.loginBannerUrl || null,
      primaryColor: form.primaryColor || undefined,
      secondaryColor: form.secondaryColor || undefined,
      accentColor: form.accentColor || undefined,
      customDomain: form.customDomain || null,
      emailLogoUrl: form.emailLogoUrl || null,
      emailPrimaryColor: form.emailPrimaryColor || undefined,
      emailFooterText: form.emailFooterText || null,
    });
  }

  function handleReset() {
    resetMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Palette className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">White-Labeling</h1>
            <p className="text-sm text-gray-500">
              Customize branding, colors, domain, and email templates
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Branding Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Branding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="platformName">Platform Name</Label>
            <Input
              id="platformName"
              value={form.platformName}
              onChange={(e) => handleChange("platformName", e.target.value)}
              placeholder="Ignite"
            />
          </div>
          <div>
            <Label htmlFor="customDomain">Custom Domain</Label>
            <Input
              id="customDomain"
              value={form.customDomain}
              onChange={(e) => handleChange("customDomain", e.target.value)}
              placeholder="innovation.company.com"
            />
          </div>
          <div>
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              value={form.logoUrl}
              onChange={(e) => handleChange("logoUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="logoSmallUrl">Small Logo URL (sidebar)</Label>
            <Input
              id="logoSmallUrl"
              value={form.logoSmallUrl}
              onChange={(e) => handleChange("logoSmallUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="faviconUrl">Favicon URL</Label>
            <Input
              id="faviconUrl"
              value={form.faviconUrl}
              onChange={(e) => handleChange("faviconUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="loginBannerUrl">Login Page Banner URL</Label>
            <Input
              id="loginBannerUrl"
              value={form.loginBannerUrl}
              onChange={(e) => handleChange("loginBannerUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </Card>

      {/* Color Palette Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Color Palette</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="primaryColor"
                value={form.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-gray-300"
              />
              <Input
                value={form.primaryColor}
                onChange={(e) => handleChange("primaryColor", e.target.value)}
                placeholder="#6366F1"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="secondaryColor"
                value={form.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-gray-300"
              />
              <Input
                value={form.secondaryColor}
                onChange={(e) => handleChange("secondaryColor", e.target.value)}
                placeholder="#8B5CF6"
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="accentColor">Accent Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="accentColor"
                value={form.accentColor}
                onChange={(e) => handleChange("accentColor", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-gray-300"
              />
              <Input
                value={form.accentColor}
                onChange={(e) => handleChange("accentColor", e.target.value)}
                placeholder="#EC4899"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-4">
          <Label>Preview</Label>
          <div className="mt-1 flex gap-2">
            <div className="h-12 w-24 rounded-md" style={{ backgroundColor: form.primaryColor }} />
            <div
              className="h-12 w-24 rounded-md"
              style={{ backgroundColor: form.secondaryColor }}
            />
            <div className="h-12 w-24 rounded-md" style={{ backgroundColor: form.accentColor }} />
          </div>
        </div>
      </Card>

      {/* Email Theming Section */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Email Template Theming</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="emailLogoUrl">Email Logo URL</Label>
            <Input
              id="emailLogoUrl"
              value={form.emailLogoUrl}
              onChange={(e) => handleChange("emailLogoUrl", e.target.value)}
              placeholder="Defaults to main logo if empty"
            />
          </div>
          <div>
            <Label htmlFor="emailPrimaryColor">Email Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="emailPrimaryColor"
                value={form.emailPrimaryColor}
                onChange={(e) => handleChange("emailPrimaryColor", e.target.value)}
                className="h-10 w-10 cursor-pointer rounded border border-gray-300"
              />
              <Input
                value={form.emailPrimaryColor}
                onChange={(e) => handleChange("emailPrimaryColor", e.target.value)}
                placeholder="#6366F1"
                className="flex-1"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="emailFooterText">Email Footer Text</Label>
            <Input
              id="emailFooterText"
              value={form.emailFooterText}
              onChange={(e) => handleChange("emailFooterText", e.target.value)}
              placeholder="Custom footer text for outgoing emails"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
