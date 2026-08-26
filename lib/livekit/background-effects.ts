import type { LocalVideoTrack } from "livekit-client";
import {
  BackgroundProcessor,
  supportsBackgroundProcessors,
  type BackgroundProcessorWrapper,
} from "@livekit/track-processors";

export type BackgroundEffect =
  | "none"
  | "blur-light"
  | "blur-strong"
  | "office"
  | "beach"
  | "abstract"
  | "custom";

export const backgroundEffectOptions: { value: BackgroundEffect; label: string }[] = [
  { value: "none", label: "None" },
  { value: "blur-light", label: "Blur (light)" },
  { value: "blur-strong", label: "Blur (strong)" },
  { value: "office", label: "Office" },
  { value: "beach", label: "Beach" },
  { value: "abstract", label: "Abstract" },
];

const BLUR_RADIUS: Partial<Record<BackgroundEffect, number>> = {
  "blur-light": 8,
  "blur-strong": 20,
};

const GRADIENTS: Partial<Record<BackgroundEffect, [string, string]>> = {
  office: ["#3a3f47", "#6b7280"],
  beach: ["#38bdf8", "#fef3c7"],
  abstract: ["#7c3aed", "#ec4899"],
};

const imageCache = new Map<string, string>();

/** Generates a simple gradient "virtual background" image client-side — no bundled photo assets needed. */
function getPresetImage(effect: BackgroundEffect): string {
  const cached = imageCache.get(effect);
  if (cached) return cached;

  const [from, to] = GRADIENTS[effect] ?? ["#334155", "#0f172a"];
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const url = canvas.toDataURL("image/png");
  imageCache.set(effect, url);
  return url;
}

export function isBackgroundEffectsSupported(): boolean {
  return typeof window !== "undefined" && supportsBackgroundProcessors();
}

const MAX_CUSTOM_DIMENSION = 1280;

/** Downscales/re-encodes an uploaded image to a JPEG data URL so it stays small enough for localStorage. */
export function readCustomBackgroundImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image file."));
      img.onload = () => {
        const scale = Math.min(1, MAX_CUSTOM_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

let processor: BackgroundProcessorWrapper | null = null;

/**
 * Applies (or clears) a background effect on a local camera track, reusing
 * one processor instance. `customImage` is a data URL, required when
 * `effect === "custom"` — falls back to no-op if it's missing.
 */
export async function applyBackgroundEffect(
  track: LocalVideoTrack,
  effect: BackgroundEffect,
  customImage?: string | null,
): Promise<void> {
  if (!isBackgroundEffectsSupported()) return;

  if (effect === "none" || (effect === "custom" && !customImage)) {
    if (track.getProcessor()) {
      await track.stopProcessor();
    }
    processor = null;
    return;
  }

  const blurRadius = BLUR_RADIUS[effect];
  const switchOptions = blurRadius
    ? ({ mode: "background-blur", blurRadius } as const)
    : ({
        mode: "virtual-background",
        imagePath: effect === "custom" ? (customImage as string) : getPresetImage(effect),
      } as const);

  if (processor && track.getProcessor() === processor) {
    await processor.switchTo(switchOptions);
    return;
  }

  processor = BackgroundProcessor(switchOptions);
  await track.setProcessor(processor);
}
