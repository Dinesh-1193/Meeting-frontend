"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Track, type Participant } from "livekit-client";
import {
  useDataChannel,
  useTracks,
  useParticipants,
  useLocalParticipant,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ParticipantTile } from "./ParticipantTile";
import { ScreenShareView } from "./ScreenShareView";
import { useCallStore } from "@/lib/store/call-store";
import { cn } from "@/lib/utils/cn";

interface SpotlightMessage {
  identities: string[];
}

const PAGE_SIZE = 25;

/**
 * LiveKit's raw isSpeaking flips true/false many times a second, so picking
 * the "main" speaker tile straight off it made the whole spotlight layout
 * reshuffle constantly while someone talked. Hold the last real speaker
 * steady for a bit after they drop, same fix as the per-tile ring in
 * ParticipantTile.tsx but applied to which participant gets focused at all.
 */
function useHeldActiveSpeakerId(participants: Participant[], holdMs = 1200): string | null {
  const rawId = participants.find((p) => p.isSpeaking)?.identity ?? null;
  const [heldId, setHeldId] = useState<string | null>(rawId);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rawId) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setHeldId(rawId);
      return;
    }
    timeoutRef.current = setTimeout(() => setHeldId(null), holdMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [rawId, holdMs]);

  return heldId;
}

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-2 md:grid-cols-3";
  return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
}

function Pager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 border-t border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
      <button
        type="button"
        className="rounded-md p-1 hover:bg-slate-800 disabled:opacity-30"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        aria-label="Previous participants"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        className="rounded-md p-1 hover:bg-slate-800 disabled:opacity-30"
        disabled={page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
        aria-label="Next participants"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function VideoGrid({ isHost }: { isHost?: boolean }) {
  const layout = useCallStore((s) => s.layout);
  const pinnedIds = useCallStore((s) => s.pinnedIds);
  const togglePin = useCallStore((s) => s.togglePin);
  const applyRemoteSpotlight = useCallStore((s) => s.applyRemoteSpotlight);
  const gridPage = useCallStore((s) => s.gridPage);
  const setGridPage = useCallStore((s) => s.setGridPage);
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const heldActiveSpeakerId = useHeldActiveSpeakerId(participants);

  const { send: sendSpotlight } = useDataChannel("spotlight", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as SpotlightMessage;
      applyRemoteSpotlight(data.identities);
    } catch {
      // ignore malformed payloads
    }
  });

  const handlePin = useCallback(
    (id: string) => {
      const next = pinnedIds.includes(id)
        ? pinnedIds.filter((p) => p !== id)
        : [...pinnedIds, id];
      togglePin(id);
      if (isHost) {
        const payload = new TextEncoder().encode(JSON.stringify({ identities: next }));
        void sendSpotlight(payload, { reliable: true });
      }
    },
    [pinnedIds, isHost, sendSpotlight, togglePin],
  );

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const screenTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: true,
  }).filter(isTrackReference);

  const tiles = useMemo(() => {
    return cameraTracks.filter(
      (t): t is TrackReferenceOrPlaceholder => Boolean(t.participant),
    );
  }, [cameraTracks]);

  const pageCount = Math.max(1, Math.ceil(tiles.length / PAGE_SIZE));
  const safePage = Math.min(gridPage, pageCount - 1);
  const pagedTiles = useMemo(
    () => tiles.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [tiles, safePage],
  );

  useEffect(() => {
    if (gridPage !== safePage) setGridPage(safePage);
  }, [gridPage, safePage, setGridPage]);

  const activeScreen = screenTracks[0];

  if (activeScreen) {
    return (
      <ScreenShareView
        screenTrack={activeScreen}
        cameraTracks={tiles}
        localIdentity={localParticipant.identity}
        pinnedIds={pinnedIds}
        onPin={handlePin}
      />
    );
  }

  if (layout === "speaker" || pinnedIds.length > 0) {
    const focusIds =
      pinnedIds.length > 0 ? pinnedIds : [heldActiveSpeakerId || localParticipant.identity];
    const focusTiles = focusIds
      .map((id) => tiles.find((t) => t.participant.identity === id))
      .filter((t): t is TrackReferenceOrPlaceholder => Boolean(t));
    const focusSet = new Set(focusTiles.map((t) => t.participant.identity));
    const others = tiles.filter((t) => !focusSet.has(t.participant.identity));

    return (
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 md:flex-row">
        {focusTiles.length ? (
          <div
            className={cn(
              "grid min-h-[240px] flex-1 auto-rows-fr gap-3",
              gridClass(focusTiles.length),
            )}
          >
            {focusTiles.map((t) => (
              <ParticipantTile
                key={t.participant.identity}
                trackRef={t}
                participant={t.participant}
                isLocal={t.participant.identity === localParticipant.identity}
                isPinned={pinnedIds.includes(t.participant.identity)}
                onPin={handlePin}
              />
            ))}
          </div>
        ) : null}
        {others.length ? (
          <div className="flex max-h-36 gap-2 overflow-x-auto md:max-h-none md:w-48 md:flex-col md:overflow-y-auto">
            {others.map((t) => (
              <ParticipantTile
                key={t.participant.identity}
                trackRef={t}
                participant={t.participant}
                isLocal={t.participant.identity === localParticipant.identity}
                isPinned={pinnedIds.includes(t.participant.identity)}
                onPin={handlePin}
                className="aspect-video w-40 shrink-0 md:w-full"
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (layout === "sidebar") {
    // No one pinned yet: main area shows local participant, sidebar lists everyone else.
    const main = tiles.find((t) => t.participant.identity === localParticipant.identity) ?? tiles[0];
    const others = tiles.filter((t) => t.participant.identity !== main?.participant.identity);

    return (
      <div className="flex h-full min-h-0 gap-3 p-3">
        {main ? (
          <ParticipantTile
            trackRef={main}
            participant={main.participant}
            isLocal={main.participant.identity === localParticipant.identity}
            isPinned={false}
            onPin={handlePin}
            className="min-h-[240px] flex-1"
          />
        ) : null}
        {others.length ? (
          <div className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto">
            {others.map((t) => (
              <ParticipantTile
                key={t.participant.identity}
                trackRef={t}
                participant={t.participant}
                isLocal={false}
                isPinned={false}
                onPin={handlePin}
                className="aspect-video w-full shrink-0"
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "grid min-h-0 flex-1 auto-rows-fr gap-3 overflow-y-auto p-3",
          gridClass(pagedTiles.length || 1),
        )}
      >
        {pagedTiles.map((t) => (
          <ParticipantTile
            key={t.participant.identity}
            trackRef={t}
            participant={t.participant}
            isLocal={t.participant.identity === localParticipant.identity}
            isPinned={pinnedIds.includes(t.participant.identity)}
            onPin={handlePin}
            className="min-h-[160px]"
          />
        ))}
        {!tiles.length ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
            Waiting for participants…
          </div>
        ) : null}
      </div>
      <Pager page={safePage} pageCount={pageCount} onPage={setGridPage} />
    </div>
  );
}
