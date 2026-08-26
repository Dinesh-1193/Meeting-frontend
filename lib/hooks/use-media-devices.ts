"use client";

import { useCallback, useEffect, useState } from "react";

export interface MediaDeviceLists {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}

export function useMediaDevices() {
  const [devices, setDevices] = useState<MediaDeviceLists>({
    cameras: [],
    microphones: [],
    speakers: [],
  });
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      setPermissionError("Media devices API is not available in this browser.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Request lightweight access so device labels are populated.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach((t) => t.stop());
      setPermissionError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Camera/microphone permission denied.";
      setPermissionError(
        message.includes("Permission") || message.includes("NotAllowed")
          ? "Camera or microphone access was denied. Enable permissions in your browser settings and reload."
          : message,
      );
    }

    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        cameras: all.filter((d) => d.kind === "videoinput"),
        microphones: all.filter((d) => d.kind === "audioinput"),
        speakers: all.filter((d) => d.kind === "audiooutput"),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handler = () => {
      void refresh();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [refresh]);

  return { devices, permissionError, isLoading, refresh };
}
