"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EffectsPanel } from "./EffectsPanel";
import { useMediaDevices } from "@/lib/hooks/use-media-devices";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import {
  isBackgroundEffectsSupported,
  type BackgroundEffect,
} from "@/lib/livekit/background-effects";

interface DeviceSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onApply?: (devices: {
    cameraId: string | null;
    micId: string | null;
    speakerId: string | null;
    backgroundEffect: BackgroundEffect;
    customBackgroundImage: string | null;
  }) => void | Promise<void>;
}

export function DeviceSettingsModal({
  open,
  onClose,
  onApply,
}: DeviceSettingsModalProps) {
  const { devices, permissionError, isLoading, refresh } = useMediaDevices();
  const preferredCameraId = usePreferencesStore((s) => s.preferredCameraId);
  const preferredMicId = usePreferencesStore((s) => s.preferredMicId);
  const preferredSpeakerId = usePreferencesStore((s) => s.preferredSpeakerId);
  const backgroundEffect = usePreferencesStore((s) => s.backgroundEffect);
  const customBackgroundImage = usePreferencesStore((s) => s.customBackgroundImage);
  const setPreferredCameraId = usePreferencesStore((s) => s.setPreferredCameraId);
  const setPreferredMicId = usePreferencesStore((s) => s.setPreferredMicId);
  const setPreferredSpeakerId = usePreferencesStore((s) => s.setPreferredSpeakerId);
  const setBackgroundEffect = usePreferencesStore((s) => s.setBackgroundEffect);
  const setCustomBackgroundImage = usePreferencesStore((s) => s.setCustomBackgroundImage);

  const [cameraId, setCameraId] = useState<string>("");
  const [micId, setMicId] = useState<string>("");
  const [speakerId, setSpeakerId] = useState<string>("");
  const [effect, setEffect] = useState<BackgroundEffect>("none");
  const [customImage, setCustomImage] = useState<string | null>(null);

  // Populate the form once per modal-open. Deliberately keyed on `open` alone —
  // `refresh()` triggers a `devices` state update, and including the device
  // lists here would re-run this effect on every refresh, stomping in-progress
  // local edits (e.g. a just-uploaded custom background) back to stale values.
  useEffect(() => {
    if (!open) return;
    void refresh();
    setCameraId(preferredCameraId ?? "");
    setMicId(preferredMicId ?? "");
    setSpeakerId(preferredSpeakerId ?? "");
    setEffect(backgroundEffect);
    setCustomImage(customBackgroundImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Backfills camera/mic/speaker defaults once the device list arrives
  // asynchronously — only when nothing's selected yet, so it never overrides
  // a selection the user already made.
  useEffect(() => {
    if (!open) return;
    setCameraId((prev) => prev || devices.cameras[0]?.deviceId || "");
    setMicId((prev) => prev || devices.microphones[0]?.deviceId || "");
    setSpeakerId((prev) => prev || devices.speakers[0]?.deviceId || "");
  }, [open, devices.cameras, devices.microphones, devices.speakers]);

  return (
    <Modal open={open} onClose={onClose} title="Device settings">
      <div className="space-y-4">
        {permissionError ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-100">
            {permissionError}
          </div>
        ) : null}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Camera
          </span>
          <select
            value={cameraId}
            onChange={(e) => setCameraId(e.target.value)}
            disabled={isLoading || !devices.cameras.length}
            className="ms-select"
          >
            {devices.cameras.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Microphone
          </span>
          <select
            value={micId}
            onChange={(e) => setMicId(e.target.value)}
            disabled={isLoading || !devices.microphones.length}
            className="ms-select"
          >
            {devices.microphones.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Speaker
          </span>
          <select
            value={speakerId}
            onChange={(e) => setSpeakerId(e.target.value)}
            disabled={isLoading || !devices.speakers.length}
            className="ms-select"
          >
            {devices.speakers.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Speaker ${d.deviceId.slice(0, 6)}`}
              </option>
            ))}
            {!devices.speakers.length ? (
              <option value="">Default system speaker</option>
            ) : null}
          </select>
        </label>

        {isBackgroundEffectsSupported() ? (
          <EffectsPanel
            value={effect}
            onChange={setEffect}
            customImage={customImage}
            onCustomImageChange={setCustomImage}
          />
        ) : (
          <p className="ms-text-muted text-xs">
            Background effects aren&apos;t supported in this browser.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setPreferredCameraId(cameraId || null);
              setPreferredMicId(micId || null);
              setPreferredSpeakerId(speakerId || null);
              setBackgroundEffect(effect);
              setCustomBackgroundImage(customImage);
              await onApply?.({
                cameraId: cameraId || null,
                micId: micId || null,
                speakerId: speakerId || null,
                backgroundEffect: effect,
                customBackgroundImage: customImage,
              });
              onClose();
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
}
