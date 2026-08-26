"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useParticipants,
} from "@livekit/components-react";
import { useQuery } from "@tanstack/react-query";
import { Info, LogIn, MessageSquare } from "lucide-react";
import "@livekit/components-styles";
import { avatarColorForIdentity } from "@/lib/utils/avatar-color";
import { VideoGrid } from "./VideoGrid";
import { WebinarSpotlight } from "./WebinarSpotlight";
import { CallControls } from "./CallControls";
import { ChatPanel } from "./ChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { PollsPanel } from "./PollsPanel";
import { BreakoutRoomsPanel } from "./BreakoutRoomsPanel";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingState } from "@/components/ui/states";
import { useToast } from "@/lib/hooks/use-toast";
import { useCallStore } from "@/lib/store/call-store";
import { usePollStore } from "@/lib/store/poll-store";
import { getLiveKitUrl } from "@/lib/livekit/config";
import { defaultRoomOptions } from "@/lib/livekit/connect";
import { getRoom, joinBreakout } from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import type { ParticipantRole, RoomMode } from "@/types";
import type { BreakoutChannelMessage } from "./BreakoutRoomsPanel";

export interface CallRoomProps {
  roomId: string;
  token: string;
  serverUrl?: string;
  roomName?: string;
  isHost?: boolean;
  role?: ParticipantRole;
  mode?: RoomMode;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  onDisconnected?: () => void;
  onLeave?: () => void;
}

interface ActiveSession {
  roomId: string;
  token: string;
  serverUrl?: string;
  roomName?: string;
  isHost?: boolean;
  role?: ParticipantRole;
  mode?: RoomMode;
  isBreakout: boolean;
}

/** Formats the time remaining until `deadlineIso` as "mm:ss", ticking every second. Returns null once it's past. */
function useCountdown(deadlineIso: string | null | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!deadlineIso) {
      setLabel(null);
      return;
    }
    const deadline = new Date(deadlineIso).getTime();
    const tick = () => {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        setLabel("Time's up");
        return;
      }
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setLabel(`${minutes}:${String(seconds).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineIso]);

  return label;
}

function useLiveClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ReconnectingBanner() {
  const isReconnecting = useCallStore((s) => s.isReconnecting);
  if (!isReconnecting) return null;
  return (
    <div
      className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/20 px-4 py-1.5 text-sm font-medium text-amber-100 shadow-lg backdrop-blur"
      role="status"
    >
      Reconnecting…
    </div>
  );
}

function CallRoomInner({
  roomId,
  parentRoomId,
  isBreakout,
  isHost,
  role,
  mode,
  roomName,
  onLeave,
  onEnterBreakout,
  onReturnToMain,
}: {
  roomId: string;
  parentRoomId: string;
  isBreakout: boolean;
  isHost?: boolean;
  role?: ParticipantRole;
  mode?: RoomMode;
  roomName?: string;
  onLeave?: () => void;
  onEnterBreakout: (session: ActiveSession) => void;
  onReturnToMain: () => void;
}) {
  const { toast } = useToast();
  const isChatOpen = useCallStore((s) => s.isChatOpen);
  const isParticipantsOpen = useCallStore((s) => s.isParticipantsOpen);
  const isPollsOpen = useCallStore((s) => s.isPollsOpen);
  const isBreakoutOpen = useCallStore((s) => s.isBreakoutOpen);
  const unreadChatCount = useCallStore((s) => s.unreadChatCount);
  const isRecording = useCallStore((s) => s.isRecording);
  const setChatOpen = useCallStore((s) => s.setChatOpen);
  const setParticipantsOpen = useCallStore((s) => s.setParticipantsOpen);
  const setMeetingInfoOpen = useCallStore((s) => s.setMeetingInfoOpen);
  const panelOpen = isChatOpen || isParticipantsOpen || isPollsOpen || isBreakoutOpen;
  const isAttendee = role === "attendee";
  const participants = useParticipants();
  const clock = useLiveClock();

  // Active regardless of panel visibility so an assignment can arrive at any time.
  useDataChannel("breakout", (msg) => {
    if (isBreakout) return; // already in a breakout — ignore further routing
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as BreakoutChannelMessage;
      if (data.type === "assigned") {
        void joinBreakout(parentRoomId, data.breakoutId, roomName)
          .then((tokenRes) => {
            onEnterBreakout({
              roomId: data.breakoutId,
              token: tokenRes.token,
              serverUrl: tokenRes.serverUrl,
              roomName: data.name,
              isHost: tokenRes.isHost,
              role: tokenRes.role,
              mode: tokenRes.mode,
              isBreakout: true,
            });
            toast({ variant: "info", title: `Moved to ${data.name}` });
          })
          .catch((err: unknown) => {
            const message = err instanceof ApiError ? err.message : "Could not join breakout room.";
            toast({ variant: "error", title: "Breakout room", description: message });
          });
      }
    } catch {
      // ignore malformed payloads
    }
  });

  // Breakout participants are connected to a *different* LiveKit room than the
  // parent, so the host's "end" data-channel broadcast (sent in the parent room)
  // never reaches them — poll the breakout room's status instead.
  const breakoutStatusQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom(roomId),
    enabled: isBreakout,
    refetchInterval: 4000,
  });
  useEffect(() => {
    if (isBreakout && breakoutStatusQuery.data?.status === "ended") {
      onReturnToMain();
    }
  }, [isBreakout, breakoutStatusQuery.data?.status, onReturnToMain]);

  const countdown = useCountdown(isBreakout ? breakoutStatusQuery.data?.breakoutDeadline : null);

  const lastBroadcastIdRef = useRef<string | null>(null);
  useEffect(() => {
    const messageId = breakoutStatusQuery.data?.broadcastMessageId;
    const message = breakoutStatusQuery.data?.broadcastMessage;
    if (!isBreakout || !messageId || !message) return;
    if (lastBroadcastIdRef.current === messageId) return;
    lastBroadcastIdRef.current = messageId;
    toast({ variant: "info", title: "Message from host", description: message });
  }, [isBreakout, breakoutStatusQuery.data?.broadcastMessageId, breakoutStatusQuery.data?.broadcastMessage, toast]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-slate-950">
      <ReconnectingBanner />
      {isBreakout ? (
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          <span className="flex items-center gap-3">
            You&apos;re in {roomName || "a breakout room"}
            {countdown ? (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-xs">
                {countdown}
              </span>
            ) : null}
          </span>
          <Button variant="secondary" size="sm" onClick={onReturnToMain}>
            <LogIn className="h-3.5 w-3.5" />
            Return to main room
          </Button>
        </div>
      ) : null}
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm text-slate-300">
          <span className="font-medium text-slate-100">{clock}</span>
          <span className="text-slate-600">|</span>
          <p className="font-medium text-slate-100">{roomName || "Meeting"}</p>
          <button
            type="button"
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            onClick={() => setMeetingInfoOpen(true)}
            aria-label="Meeting details"
          >
            <Info className="h-4 w-4" />
          </button>
          {isRecording ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              REC
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-medium text-slate-100 transition",
            isParticipantsOpen ? "bg-white/20" : "bg-white/10 hover:bg-white/15",
          )}
          onClick={() => setParticipantsOpen(!isParticipantsOpen)}
          aria-label="Toggle participants"
        >
          <span className="flex -space-x-2">
            {participants.slice(0, 2).map((p) => (
              <span
                key={p.sid}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-slate-950"
                style={{ backgroundColor: avatarColorForIdentity(p.identity) }}
              >
                {(p.name || p.identity || "?")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            ))}
          </span>
          {participants.length}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className={cn("min-h-0 flex-1", panelOpen && "hidden md:block")}>
          {isAttendee ? <WebinarSpotlight /> : <VideoGrid isHost={isHost} />}
        </div>
        <ChatPanel roomId={roomId} />
        <ParticipantsPanel roomId={roomId} isHost={isHost} mode={mode} />
        <PollsPanel roomId={roomId} isHost={isHost} />
        <BreakoutRoomsPanel roomId={parentRoomId} isHost={isHost} />

        {!isChatOpen ? (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 z-10 rounded-full shadow-xl"
            onClick={() => setChatOpen(true)}
            aria-label="Open chat"
          >
            <MessageSquare className="h-4 w-4" />
            {unreadChatCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </span>
            ) : null}
          </Button>
        ) : null}
      </div>

      <div className="flex justify-center border-t border-slate-800 p-3">
        <CallControls
          roomId={roomId}
          isHost={isHost}
          role={role}
          onLeave={() => {
            onLeave?.();
          }}
        />
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

export function CallRoom({
  roomId,
  token,
  serverUrl,
  roomName,
  isHost,
  role,
  mode,
  audioEnabled = true,
  videoEnabled = true,
  onDisconnected,
  onLeave,
}: CallRoomProps) {
  const reset = useCallStore((s) => s.reset);
  const resetPolls = usePollStore((s) => s.reset);
  const setReconnecting = useCallStore((s) => s.setReconnecting);
  const [ready, setReady] = useState(false);

  const mainSession: ActiveSession = {
    roomId,
    token,
    serverUrl,
    roomName,
    isHost,
    role,
    mode,
    isBreakout: false,
  };
  const [session, setSession] = useState<ActiveSession>(mainSession);
  // Set right before a deliberate session swap so the outgoing LiveKitRoom's
  // onDisconnected (fired by the key-forced remount) doesn't get mistaken
  // for the user actually leaving the call.
  const isSwitchingRef = useRef(false);

  const enterBreakout = useCallback((next: ActiveSession) => {
    isSwitchingRef.current = true;
    reset();
    setSession(next);
  }, [reset]);

  const returnToMain = useCallback(() => {
    isSwitchingRef.current = true;
    reset();
    setSession(mainSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset, roomId, token, serverUrl, roomName, isHost, role, mode]);

  useEffect(() => {
    setReady(true);
    return () => {
      reset();
      resetPolls();
    };
  }, [reset, resetPolls]);

  if (!ready) {
    return <LoadingState label="Preparing call…" className="h-full" />;
  }

  return (
    <ErrorBoundary>
      <LiveKitRoom
        key={session.roomId}
        token={session.token}
        serverUrl={getLiveKitUrl(session.serverUrl)}
        options={defaultRoomOptions}
        connect
        audio={audioEnabled && session.role !== "attendee"}
        video={videoEnabled && session.role !== "attendee"}
        onConnected={() => setReconnecting(false)}
        onDisconnected={() => {
          setReconnecting(false);
          if (isSwitchingRef.current) {
            isSwitchingRef.current = false;
            return;
          }
          onDisconnected?.();
        }}
        onError={() => {
          setReconnecting(true);
        }}
        className="flex h-full min-h-0 flex-1 flex-col"
        data-lk-theme="default"
      >
        <CallRoomInner
          roomId={session.roomId}
          parentRoomId={roomId}
          isBreakout={session.isBreakout}
          isHost={session.isHost}
          role={session.role}
          mode={session.mode}
          roomName={session.roomName}
          onLeave={onLeave}
          onEnterBreakout={enterBreakout}
          onReturnToMain={returnToMain}
        />
      </LiveKitRoom>
    </ErrorBoundary>
  );
}
