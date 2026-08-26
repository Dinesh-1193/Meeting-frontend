"use client";

import { useEffect, useRef } from "react";
import type { TrackReference, TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { isTrackReference } from "@livekit/components-react";
import { ParticipantTile } from "./ParticipantTile";

interface ScreenShareViewProps {
  screenTrack: TrackReference;
  cameraTracks: TrackReferenceOrPlaceholder[];
  localIdentity?: string;
  pinnedIds: string[];
  onPin: (id: string) => void;
}

export function ScreenShareView({
  screenTrack,
  cameraTracks,
  localIdentity,
  pinnedIds,
  onPin,
}: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isTrackReference(screenTrack) || !screenTrack.publication?.track) {
      return;
    }
    screenTrack.publication.track.attach(el);
    return () => {
      screenTrack.publication?.track?.detach(el);
    };
  }, [screenTrack]);

  const sharerName =
    screenTrack.participant.name || screenTrack.participant.identity || "Someone";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 lg:flex-row">
      <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-xl border border-slate-700 bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          autoPlay
          playsInline
        />
        <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
          {sharerName} is sharing
        </div>
      </div>
      <div className="flex max-h-32 gap-2 overflow-x-auto lg:max-h-none lg:w-52 lg:flex-col lg:overflow-y-auto">
        {cameraTracks.map((t) => (
          <ParticipantTile
            key={t.participant.identity}
            trackRef={t}
            participant={t.participant}
            isLocal={t.participant.identity === localIdentity}
            isPinned={pinnedIds.includes(t.participant.identity)}
            onPin={onPin}
            className="aspect-video w-40 shrink-0 lg:w-full"
          />
        ))}
      </div>
    </div>
  );
}
