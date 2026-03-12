"use client";

import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionState = "prompt" | "granted" | "denied" | "unsupported";

export function usePushSubscription() {
  const [permissionState, setPermissionState] = useState<PushPermissionState>("prompt");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const vapidQuery = trpc.push.getVapidPublicKey.useQuery(undefined, {
    staleTime: Infinity,
  });

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissionState("unsupported");
      return;
    }

    setPermissionState(Notification.permission as PushPermissionState);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          setIsSubscribed(sub !== null);
        })
        .catch(() => {
          // Non-critical — push not available
        });
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    if (!vapidQuery.data?.vapidPublicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PushPermissionState);

      if (permission !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (existing) {
        await existing.unsubscribe();
      }

      const keyArray = urlBase64ToUint8Array(vapidQuery.data.vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArray.buffer as ArrayBuffer,
      });

      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");

      if (!p256dh || !auth) {
        throw new Error("Missing push subscription keys");
      }

      await subscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        },
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  }, [vapidQuery.data?.vapidPublicKey, subscribeMutation]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [unsubscribeMutation]);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const isAvailable = isSupported && !!vapidQuery.data?.vapidPublicKey;

  return {
    isSupported,
    isAvailable,
    isSubscribed,
    isLoading,
    permissionState,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
