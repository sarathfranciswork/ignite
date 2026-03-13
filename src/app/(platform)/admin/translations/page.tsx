"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { Save, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  translationConfigureFormSchema,
  type TranslationConfigureFormValues,
} from "@/types/translation";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
];

const PROVIDERS = [
  { value: "NONE" as const, label: "None (manual only)" },
  { value: "DEEPL" as const, label: "DeepL" },
  { value: "GOOGLE" as const, label: "Google Translate" },
];

function TranslationsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-gray-100" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-100" />
          <div className="mt-3 h-10 w-48 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export default function TranslationsPage() {
  const spaces = trpc.space.list.useQuery({ limit: 1 }, { select: (data) => data.items });
  const spaceId = spaces.data?.[0]?.id ?? "";

  const configProcedure = trpc.translation.getConfig;
  const { data: config, isLoading: isConfigLoading } = configProcedure.useQuery(
    { spaceId },
    { enabled: !!spaceId },
  );

  const form = useForm<TranslationConfigureFormValues>({
    resolver: zodResolver(translationConfigureFormSchema),
    defaultValues: {
      spaceId: "",
      defaultLocale: "en",
      enabledLocales: ["en"],
      autoTranslateProvider: "NONE",
      apiKey: undefined,
      maxRequestsPerHour: 100,
    },
  });

  React.useEffect(() => {
    if (config && spaceId) {
      form.reset({
        spaceId,
        defaultLocale: config.defaultLocale,
        enabledLocales: config.enabledLocales,
        autoTranslateProvider: config.autoTranslateProvider as "NONE" | "DEEPL" | "GOOGLE",
        apiKey: undefined,
        maxRequestsPerHour: config.maxRequestsPerHour,
      });
    }
  }, [config, spaceId, form]);

  const utils = trpc.useUtils();
  const configureProcedure = trpc.translation.configure;
  const configureMutation = configureProcedure.useMutation({
    onSuccess: () => {
      toast.success("Translation settings saved successfully");
      void utils.translation.getConfig.invalidate();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: TranslationConfigureFormValues) => {
    const payload = {
      ...data,
      ...(data.apiKey ? {} : { apiKey: undefined }),
    };
    configureMutation.mutate(payload);
  };

  const watchProvider = form.watch("autoTranslateProvider");
  const watchEnabledLocales = form.watch("enabledLocales") ?? ["en"];
  const watchMaxRequests = form.watch("maxRequestsPerHour") ?? 100;

  const toggleLocale = (code: string) => {
    const current = form.getValues("enabledLocales") ?? [];
    const enabled = current.includes(code);
    if (enabled && current.length === 1) return;
    const next = enabled ? current.filter((l) => l !== code) : [...current, code];
    form.setValue("enabledLocales", next, { shouldValidate: true });
  };

  if (spaces.isLoading || isConfigLoading) {
    return <TranslationsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Translation Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure multilingual support and automatic translation for your platform content.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Default Locale */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Default Locale</h3>
          <p className="mt-1 text-xs text-gray-500">
            The primary language for content on your platform.
          </p>
          <select
            {...form.register("defaultLocale")}
            className="mt-2 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.code})
              </option>
            ))}
          </select>
        </div>

        {/* Enabled Locales */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Enabled Languages</h3>
          <p className="mt-1 text-xs text-gray-500">
            Select which languages are available for content translation.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {LOCALES.map((l) => (
              <label
                key={l.code}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  watchEnabledLocales.includes(l.code)
                    ? "border-primary-300 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={watchEnabledLocales.includes(l.code)}
                  onChange={() => toggleLocale(l.code)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                {l.label}
              </label>
            ))}
          </div>
        </div>

        {/* Auto-Translation Provider */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Automatic Translation</h3>
          <p className="mt-1 text-xs text-gray-500">
            Optionally use an external service for automatic translation of content.
          </p>

          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor="translation-provider"
                className="block text-sm font-medium text-gray-700"
              >
                Provider
              </label>
              <select
                id="translation-provider"
                {...form.register("autoTranslateProvider")}
                className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {watchProvider !== "NONE" && (
              <>
                <div>
                  <label
                    htmlFor="translation-api-key"
                    className="block text-sm font-medium text-gray-700"
                  >
                    API Key
                  </label>
                  <input
                    id="translation-api-key"
                    type="password"
                    {...form.register("apiKey")}
                    placeholder={
                      config?.hasApiKey ? "••••••••  (key already set)" : "Enter API key"
                    }
                    className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    Translation API requests are rate-limited to{" "}
                    <strong>{watchMaxRequests}</strong> requests per hour per space.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rate Limit */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Rate Limit</h3>
          <p className="mt-1 text-xs text-gray-500">
            Maximum number of translation API requests per hour per space.
          </p>
          <input
            type="number"
            {...form.register("maxRequestsPerHour", { valueAsNumber: true })}
            min={1}
            max={10000}
            className="mt-2 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={configureMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {configureMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
