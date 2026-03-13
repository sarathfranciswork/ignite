"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { Globe, ChevronDown, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TranslationToggleProps {
  entityType: "IDEA" | "CAMPAIGN" | "COMMENT";
  entityId: string;
  field: string;
  originalText: string;
  spaceId?: string;
}

export function TranslationToggle({
  entityType,
  entityId,
  field,
  originalText,
  spaceId,
}: TranslationToggleProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedLocale, setSelectedLocale] = React.useState<string | null>(null);
  const [showEditor, setShowEditor] = React.useState(false);
  const [editText, setEditText] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getAllProcedure = trpc.translation.getAll;
  const { data: translations } = getAllProcedure.useQuery({
    entityType,
    entityId,
    field,
  });

  const configProcedure = trpc.translation.getConfig;
  const { data: config } = configProcedure.useQuery(
    { spaceId: spaceId! },
    { enabled: Boolean(spaceId) },
  );

  const utils = trpc.useUtils();

  const updateProcedure = trpc.translation.update;
  const updateMutation = updateProcedure.useMutation({
    onSuccess: () => {
      toast.success("Translation updated");
      setShowEditor(false);
      void utils.translation.getAll.invalidate();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const translateProcedure = trpc.translation.translate;
  const translateMutation = translateProcedure.useMutation({
    onSuccess: () => {
      toast.success("Translation created");
      void utils.translation.getAll.invalidate();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const availableLocales = config?.enabledLocales ?? [];
  const hasTranslations = translations && translations.length > 0;

  const currentTranslation = selectedLocale
    ? translations?.find((t) => t.locale === selectedLocale)
    : null;

  const displayText = currentTranslation ? currentTranslation.translatedText : originalText;

  const handleTranslate = (locale: string) => {
    if (!spaceId) {
      toast.error("Space context is required for translation");
      return;
    }
    translateMutation.mutate({
      entityType,
      entityId,
      field,
      locale,
      text: originalText,
      spaceId,
    });
    setSelectedLocale(locale);
    setIsOpen(false);
  };

  const handleEdit = () => {
    if (currentTranslation) {
      setEditText(currentTranslation.translatedText);
      setShowEditor(true);
    }
  };

  const handleSaveEdit = () => {
    if (!selectedLocale) return;
    updateMutation.mutate({
      entityType,
      entityId,
      field,
      locale: selectedLocale,
      translatedText: editText,
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="mb-1 flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors",
            hasTranslations
              ? "bg-primary-50 text-primary-600 hover:bg-primary-100"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
          )}
          title="Translations"
        >
          <Globe className="h-3 w-3" />
          {selectedLocale && <span className="font-medium uppercase">{selectedLocale}</span>}
          <ChevronDown className="h-3 w-3" />
        </button>

        {selectedLocale && currentTranslation && (
          <button
            onClick={handleEdit}
            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Edit translation"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}

        {selectedLocale && (
          <button
            onClick={() => setSelectedLocale(null)}
            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Show original"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {availableLocales.map((locale) => {
            const existing = translations?.find((t) => t.locale === locale);
            return (
              <button
                key={locale}
                onClick={() => {
                  if (existing) {
                    setSelectedLocale(locale);
                    setIsOpen(false);
                  } else {
                    handleTranslate(locale);
                  }
                }}
                disabled={translateMutation.isPending}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="font-medium uppercase">{locale}</span>
                {existing ? (
                  <span className="text-xs text-green-600">translated</span>
                ) : (
                  <span className="text-xs text-gray-400">translate</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="text-sm text-gray-900">{displayText}</div>

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">
              Edit Translation ({selectedLocale?.toUpperCase()})
            </h3>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={5}
              className="mt-3 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowEditor(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
