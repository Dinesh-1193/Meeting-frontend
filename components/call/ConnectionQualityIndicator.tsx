"use client";

import { ConnectionQuality } from "livekit-client";
import { Signal, SignalHigh, SignalLow, SignalMedium, SignalZero } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ConnectionQualityIndicatorProps {
  quality: ConnectionQuality;
  className?: string;
}

export function ConnectionQualityIndicator({
  quality,
  className,
}: ConnectionQualityIndicatorProps) {
  const label =
    quality === ConnectionQuality.Excellent
      ? "Excellent connection"
      : quality === ConnectionQuality.Good
        ? "Good connection"
        : quality === ConnectionQuality.Poor
          ? "Poor connection"
          : quality === ConnectionQuality.Lost
            ? "Connection lost"
            : "Unknown connection quality";

  const Icon =
    quality === ConnectionQuality.Excellent
      ? SignalHigh
      : quality === ConnectionQuality.Good
        ? SignalMedium
        : quality === ConnectionQuality.Poor
          ? SignalLow
          : quality === ConnectionQuality.Lost
            ? SignalZero
            : Signal;

  return (
    <span
      className={cn(
        "inline-flex items-center text-slate-300",
        quality === ConnectionQuality.Poor && "text-amber-400",
        quality === ConnectionQuality.Lost && "text-red-400",
        quality === ConnectionQuality.Excellent && "text-emerald-400",
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}
