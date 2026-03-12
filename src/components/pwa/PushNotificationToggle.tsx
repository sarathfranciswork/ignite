"use client";

import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushNotificationToggle() {
  const {
    isAvailable,
    isSubscribed,
    isLoading,
    permissionState,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePushSubscription();

  if (!isAvailable) {
    return null;
  }

  if (permissionState === "denied") {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">
          Push notifications are blocked. Please enable them in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 p-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900">Push Notifications</h3>
        <p className="text-sm text-gray-500">
          {isSubscribed
            ? "You will receive push notifications on this device."
            : "Enable push notifications to stay updated."}
        </p>
      </div>
      <button
        type="button"
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={isLoading}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          isSubscribed ? "bg-primary-600" : "bg-gray-200"
        } ${isLoading ? "opacity-50" : ""}`}
        role="switch"
        aria-checked={isSubscribed}
        aria-label="Toggle push notifications"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isSubscribed ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
