"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ConnectionQuality,
  Track,
  type Participant,
} from "livekit-client";
import {
  isTrackReference,
  useConnectionQualityIndicator,
  useIsSpeaking,
  useParticipantTile,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { AudioLines, MicOff, Pin } from "lucide-react";
import { ConnectionQualityIndicator } from "./ConnectionQualityIndicator";
import { cn } from "@/lib/utils/cn";
import { avatarColorForIdentity } from "@/lib/utils/avatar-color";

/**
 * LiveKit's raw isSpeaking flips true/false many times a second (it's just
 * an audio-level threshold), which made the tile ring blink continuously.
 * Hold "speaking" true for a bit after it drops so the indicator is stable.
 */
function useHeldSpeaking(rawIsSpeaking: boolean, holdMs = 1200): boolean {
  const [held, setHeld] = useState(rawIsSpeaking);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rawIsSpeaking) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setHeld(true);
      return;
    }
    timeoutRef.current = setTimeout(() => setHeld(false), holdMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [rawIsSpeaking, holdMs]);

  return held;
}

interface ParticipantTileProps {
  trackRef: TrackReferenceOrPlaceholder;
  participant: Participant;
  isPinned?: boolean;
  isLocal?: boolean;
  onPin?: (participantId: string) => void;
  className?: string;
}

export function ParticipantTile({
  trackRef,
  participant,
  isPinned,
  isLocal,
  onPin,
  className,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rawIsSpeaking = useIsSpeaking(participant);
  const isSpeaking = useHeldSpeaking(rawIsSpeaking);
  const { quality } = useConnectionQualityIndicator({ participant });
  const { elementProps } = useParticipantTile({
    trackRef,
    htmlProps: {},
  });

  const isCamera = trackRef.source === Track.Source.Camera;
  const hasVideo =
    isTrackReference(trackRef) &&
    trackRef.publication?.isSubscribed !== false &&
    !trackRef.publication?.isMuted &&
    Boolean(trackRef.publication?.track);

  const isMicMuted = participant.isMicrophoneEnabled === false;

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isTrackReference(trackRef) || !trackRef.publication?.track) {
      return;
    }
    trackRef.publication.track.attach(el);
    return () => {
      trackRef.publication?.track?.detach(el);
    };
  }, [trackRef]);

  const displayName = useMemo(() => {
    const name = participant.name || participant.identity || "Participant";
    return isLocal ? `${name} (You)` : name;
  }, [participant.name, participant.identity, isLocal]);

  const initials = displayName
    .replace(" (You)", "")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const avatarColor = useMemo(
    () => avatarColorForIdentity(participant.identity || displayName),
    [participant.identity, displayName],
  );

  return (
    <div
      {...elementProps}
      className={cn(
        "relative overflow-hidden rounded-xl bg-[#3c4043]",
        isPinned ? "ring-[3px] ring-amber-400" : "ring-1 ring-inset ring-white/10",
        className,
      )}
    >
      {hasVideo && isCamera ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="flex h-full min-h-[140px] w-full items-center justify-center bg-[#3c4043]">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 p-2.5">
        <span
          className="truncate text-sm font-medium text-white"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
        >
          {displayName}
        </span>
      </div>

      {isMicMuted || isSpeaking ? (
        <div
          className={cn(
            "pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full",
            isMicMuted ? "bg-[#3c4043]" : "bg-[#8ab4f8]",
          )}
        >
          {isMicMuted ? (
            <MicOff className="h-3.5 w-3.5 text-red-400" aria-label="Muted" />
          ) : (
            <AudioLines className="h-3.5 w-3.5 text-[#202124]" aria-label="Speaking" />
          )}
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-2 top-2">
        <ConnectionQualityIndicator quality={quality ?? ConnectionQuality.Unknown} />
      </div>

      {onPin ? (
        <button
          type="button"
          className="absolute bottom-2 right-2 rounded-md bg-black/50 p-1.5 text-white opacity-0 transition hover:bg-black/70 focus:opacity-100 group-hover:opacity-100 [.group:hover_&]:opacity-100"
          style={{ opacity: isPinned ? 1 : undefined }}
          aria-label={isPinned ? "Unpin participant" : "Pin participant"}
          onClick={() => onPin(participant.identity)}
        >
          <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-amber-400 text-amber-400")} />
        </button>
      ) : null}
    </div>
  );
}
