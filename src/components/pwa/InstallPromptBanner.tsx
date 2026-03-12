"use client";

import { useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export function InstallPromptBanner() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) {
    return null;
  }

  return (
    <div className="border-b border-primary-200 bg-primary-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-primary-800">
          Install Ignite for a better experience with offline access and push notifications.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              promptInstall();
            }}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md px-2 py-1.5 text-xs text-primary-600 hover:text-primary-800"
            aria-label="Dismiss install prompt"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
