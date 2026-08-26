"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  backgroundEffectOptions,
  readCustomBackgroundImage,
  type BackgroundEffect,
} from "@/lib/livekit/background-effects";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";

interface EffectsPanelProps {
  value: BackgroundEffect;
  onChange: (effect: BackgroundEffect) => void;
  customImage: string | null;
  onCustomImageChange: (image: string | null) => void;
  disabled?: boolean;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function EffectsPanel({
  value,
  onChange,
  customImage,
  onCustomImageChange,
  disabled,
}: EffectsPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "error", title: "Choose an image file" });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ variant: "error", title: "Image is too large", description: "Max 10 MB." });
      return;
    }
    setIsProcessing(true);
    try {
      const dataUrl = await readCustomBackgroundImage(file);
      onCustomImageChange(dataUrl);
      onChange("custom");
    } catch {
      toast({ variant: "error", title: "Could not process image" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-[var(--foreground)]">Background effect</span>
      <div className="grid grid-cols-3 gap-2">
        {backgroundEffectOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs transition disabled:opacity-50",
              value === opt.value
                ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--hover)]",
            )}
          >
            {opt.label}
          </button>
        ))}

        {customImage ? (
          <div className="relative">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("custom")}
              className={cn(
                "h-full w-full overflow-hidden rounded-lg border bg-cover bg-center transition disabled:opacity-50",
                value === "custom" ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border)]",
              )}
              style={{ backgroundImage: `url(${customImage})`, minHeight: "2.25rem" }}
              aria-label="Use your uploaded background"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onCustomImageChange(null);
                if (value === "custom") onChange("none");
              }}
              className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-black/90"
              aria-label="Remove uploaded background"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : null}

        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-2 py-2 text-xs text-[var(--muted)] transition hover:bg-[var(--hover)] disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {isProcessing ? "Uploading…" : customImage ? "Replace" : "Upload"}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
