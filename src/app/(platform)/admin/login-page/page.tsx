"use client";

import * as React from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function LoginPageCustomization() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.admin.loginCustomizationGet.useQuery();

  const updateMutation = trpc.admin.loginCustomizationUpdate.useMutation({
    onSuccess: () => {
      void utils.admin.loginCustomizationGet.invalidate();
      void utils.admin.loginCustomizationGetPublic.invalidate();
    },
  });

  const [form, setForm] = React.useState({
    loginWelcomeTitle: "",
    loginWelcomeMessage: "",
    loginBannerUrl: "",
  });

  React.useEffect(() => {
    if (config) {
      setForm({
        loginWelcomeTitle: config.loginWelcomeTitle ?? "",
        loginWelcomeMessage: config.loginWelcomeMessage ?? "",
        loginBannerUrl: config.loginBannerUrl ?? "",
      });
    }
  }, [config]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    updateMutation.mutate({
      loginWelcomeTitle: form.loginWelcomeTitle || null,
      loginWelcomeMessage: form.loginWelcomeMessage || null,
      loginBannerUrl: form.loginBannerUrl || null,
    });
  }

  function handleReset() {
    updateMutation.mutate({
      loginWelcomeTitle: null,
      loginWelcomeMessage: null,
      loginBannerUrl: null,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <LogIn className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">
              Login Page Customization
            </h1>
            <p className="text-sm text-gray-500">
              Customize the login page background image and welcome message
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={updateMutation.isPending}
          >
            Reset to Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Welcome Message */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Welcome Message</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="loginWelcomeTitle">Heading</Label>
            <Input
              id="loginWelcomeTitle"
              value={form.loginWelcomeTitle}
              onChange={(e) => handleChange("loginWelcomeTitle", e.target.value)}
              placeholder="Welcome back (default)"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty for default heading</p>
          </div>
          <div>
            <Label htmlFor="loginWelcomeMessage">Subtitle</Label>
            <Input
              id="loginWelcomeMessage"
              value={form.loginWelcomeMessage}
              onChange={(e) => handleChange("loginWelcomeMessage", e.target.value)}
              placeholder="Sign in to your Ignite account (default)"
            />
            <p className="mt-1 text-xs text-gray-500">Leave empty for default message</p>
          </div>
        </div>
      </Card>

      {/* Background Image */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Background Image</h2>
        <div>
          <Label htmlFor="loginBannerUrl">Banner Image URL</Label>
          <Input
            id="loginBannerUrl"
            value={form.loginBannerUrl}
            onChange={(e) => handleChange("loginBannerUrl", e.target.value)}
            placeholder="https://example.com/background.jpg"
          />
          <p className="mt-1 text-xs text-gray-500">
            Provide a URL to a background image for the login page. Leave empty for the default
            gradient background.
          </p>
        </div>

        {/* Preview */}
        {form.loginBannerUrl && (
          <div className="mt-4">
            <Label>Preview</Label>
            <div
              className="mt-1 h-40 rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${form.loginBannerUrl})` }}
            >
              <div className="flex h-full items-center justify-center rounded-lg bg-black/30">
                <div className="rounded-lg bg-white/90 p-4 text-center">
                  <p className="font-semibold text-gray-900">
                    {form.loginWelcomeTitle || "Welcome back"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {form.loginWelcomeMessage || "Sign in to your Ignite account"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
