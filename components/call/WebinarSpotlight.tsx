"use client";

import { useMemo } from "react";
import { Track } from "livekit-client";
import {
  useDataChannel,
  useTracks,
  useLocalParticipant,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareView } from "./ScreenShareView";
import { useCallStore } from "@/lib/store/call-store";
import { cn } from "@/lib/utils/cn";

interface SpotlightMessage {
  identities: string[];
}

function isPublisher(t: TrackReferenceOrPlaceholder): boolean {
  const role = t.participant.attributes?.role;
  return role === "host" || role === "panelist";
}

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  return "grid-cols-2 md:grid-cols-3";
}

/**
 * Webinar attendees are `hidden:true` on the LiveKit token, so they never
 * appear in useParticipants() for each other — this only renders the
 * publishing host/panelists, which is exactly what an attendee should see.
 */
export function WebinarSpotlight() {
  const pinnedIds = useCallStore((s) => s.pinnedIds);
  const togglePin = useCallStore((s) => s.togglePin);
  const applyRemoteSpotlight = useCallStore((s) => s.applyRemoteSpotlight);
  const { localParticipant } = useLocalParticipant();

  useDataChannel("spotlight", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as SpotlightMessage;
      applyRemoteSpotlight(data.identities);
    } catch {
      // ignore malformed payloads
    }
  });

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  }).filter(isTrackReference);

  const tiles = useMemo(
    () =>
      cameraTracks.filter(
        (t): t is TrackReferenceOrPlaceholder => Boolean(t.participant) && isPublisher(t),
      ),
    [cameraTracks],
  );

  const activeScreen = screenTracks.find((t) => isPublisher(t));

  if (activeScreen) {
    return (
      <ScreenShareView
        screenTrack={activeScreen}
        cameraTracks={tiles}
        localIdentity={localParticipant.identity}
        pinnedIds={pinnedIds}
        onPin={togglePin}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid h-full min-h-0 auto-rows-fr gap-3 p-3",
        gridClass(tiles.length || 1),
      )}
    >
      {tiles.map((t) => (
        <ParticipantTile
          key={t.participant.identity}
          trackRef={t}
          participant={t.participant}
          isLocal={t.participant.identity === localParticipant.identity}
          isPinned={pinnedIds.includes(t.participant.identity)}
          onPin={togglePin}
          className="min-h-[200px]"
        />
      ))}
      {!tiles.length ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
          Waiting for the host to start sharing…
        </div>
      ) : null}
    </div>
  );
}
