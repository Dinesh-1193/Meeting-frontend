"use client";

import { useMemo, useState } from "react";
import { useDataChannel, useParticipants } from "@livekit/components-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Timer, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useCallStore } from "@/lib/store/call-store";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import {
  createBreakouts,
  endBreakouts,
  listBreakouts,
  sendBreakoutBroadcast,
  setBreakoutTimer,
} from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/client";

interface BreakoutRoomsPanelProps {
  roomId: string;
  isHost?: boolean;
  className?: string;
}

interface AssignedMessage {
  type: "assigned";
  breakoutId: string;
  name: string;
}
interface EndMessage {
  type: "end";
}
type BreakoutChannelMessage = AssignedMessage | EndMessage;

export function BreakoutRoomsPanel({ roomId, isHost, className }: BreakoutRoomsPanelProps) {
  const isOpen = useCallStore((s) => s.isBreakoutOpen);
  const setBreakoutOpen = useCallStore((s) => s.setBreakoutOpen);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(2);
  const [assignMode, setAssignMode] = useState<"auto" | "manual">("auto");
  // identity -> room index (0-based); absent means unassigned.
  const [manualAssignments, setManualAssignments] = useState<Record<string, number>>({});
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [broadcastDraft, setBroadcastDraft] = useState("");
  // Sender only here — the receiver that actually moves participants lives
  // in CallRoomInner so it's active regardless of whether this panel is open.
  const { send } = useDataChannel("breakout");
  const participants = useParticipants();
  const assignableParticipants = useMemo(
    () => participants.filter((p) => !p.isLocal),
    [participants],
  );

  const breakoutsQuery = useQuery({
    queryKey: ["breakouts", roomId],
    queryFn: () => listBreakouts(roomId),
    enabled: isOpen && Boolean(isHost),
    refetchInterval: isOpen ? 5000 : false,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (assignMode !== "manual") return createBreakouts(roomId, count);
      const grouped: Record<string, string[]> = {};
      for (const [identity, roomIndex] of Object.entries(manualAssignments)) {
        if (roomIndex < 0 || roomIndex >= count) continue;
        const key = String(roomIndex);
        grouped[key] = grouped[key] ? [...grouped[key], identity] : [identity];
      }
      return createBreakouts(roomId, count, grouped);
    },
    onSuccess: () => {
      toast({ variant: "success", title: "Breakout rooms created" });
      setManualAssignments({});
      void queryClient.invalidateQueries({ queryKey: ["breakouts", roomId] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError ? err.message : "Could not create breakout rooms.";
      toast({ variant: "error", title: "Failed", description: message });
    },
  });

  const openMutation = useMutation({
    mutationFn: async () => {
      const rooms = breakoutsQuery.data ?? [];
      await Promise.all(
        rooms.flatMap((room) =>
          room.assignedUserIds.map((userId) => {
            const msg: AssignedMessage = { type: "assigned", breakoutId: room.id, name: room.name };
            const payload = new TextEncoder().encode(JSON.stringify(msg));
            return send(payload, { reliable: true, destinationIdentities: [userId] });
          }),
        ),
      );
    },
    onSuccess: () => toast({ variant: "success", title: "Breakout rooms opened" }),
    onError: () => toast({ variant: "error", title: "Could not open breakout rooms" }),
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      await endBreakouts(roomId);
      const msg: EndMessage = { type: "end" };
      await send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true });
    },
    onSuccess: () => {
      toast({ variant: "info", title: "Breakout rooms ended" });
      void queryClient.invalidateQueries({ queryKey: ["breakouts", roomId] });
    },
    onError: () => toast({ variant: "error", title: "Could not end breakout rooms" }),
  });

  const timerMutation = useMutation({
    mutationFn: (minutes: number | null) => setBreakoutTimer(roomId, minutes),
    onSuccess: (_data, minutes) => {
      toast({
        variant: "info",
        title: minutes ? `Timer set for ${minutes} min` : "Timer cleared",
      });
    },
    onError: () => toast({ variant: "error", title: "Could not update timer" }),
  });

  const broadcastMutation = useMutation({
    mutationFn: () => sendBreakoutBroadcast(roomId, broadcastDraft.trim()),
    onSuccess: () => {
      toast({ variant: "success", title: "Message sent to breakout rooms" });
      setBroadcastDraft("");
    },
    onError: () => toast({ variant: "error", title: "Could not send message" }),
  });

  if (!isOpen) return null;

  if (!isHost) {
    return (
      <aside
        className={cn(
          "flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-slate-950",
          className,
        )}
        aria-label="Breakout rooms panel"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-100">Breakout rooms</h2>
          <Button variant="ghost" size="sm" onClick={() => setBreakoutOpen(false)}>
            Close
          </Button>
        </div>
        <div className="flex-1 p-4">
          <EmptyState
            title="Host-managed"
            description="Only the host or a co-host can create breakout rooms."
          />
        </div>
      </aside>
    );
  }

  const rooms = breakoutsQuery.data ?? [];

  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-slate-950",
        className,
      )}
      aria-label="Breakout rooms panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Breakout rooms</h2>
        <Button variant="ghost" size="sm" onClick={() => setBreakoutOpen(false)}>
          Close
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {breakoutsQuery.isLoading ? (
          <LoadingState label="Loading…" />
        ) : rooms.length === 0 ? (
          <div className="space-y-3">
            <EmptyState
              title="No breakout rooms"
              description="Split participants into smaller rooms for discussion."
            />
            <label className="block space-y-1.5 text-sm text-slate-300">
              Number of rooms
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) =>
                  setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                }
                className="ms-input"
              />
            </label>

            <div className="flex rounded-lg border border-slate-800 p-1 text-sm">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md py-1.5 text-center transition",
                  assignMode === "auto"
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:text-slate-200",
                )}
                onClick={() => setAssignMode("auto")}
              >
                Automatically
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-md py-1.5 text-center transition",
                  assignMode === "manual"
                    ? "bg-slate-800 text-slate-100"
                    : "text-slate-400 hover:text-slate-200",
                )}
                onClick={() => setAssignMode("manual")}
              >
                Manually
              </button>
            </div>

            {assignMode === "manual" ? (
              <div className="space-y-1.5 rounded-lg border border-slate-800 p-2">
                {assignableParticipants.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-slate-500">
                    No other participants have joined yet.
                  </p>
                ) : (
                  assignableParticipants.map((p) => (
                    <div
                      key={p.identity}
                      className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1"
                    >
                      <span className="truncate text-sm text-slate-200">
                        {p.name || p.identity}
                      </span>
                      <select
                        className="ms-select h-8 w-32 shrink-0 text-xs"
                        value={manualAssignments[p.identity] ?? -1}
                        onChange={(e) =>
                          setManualAssignments((prev) => {
                            const next = { ...prev };
                            const idx = Number(e.target.value);
                            if (idx < 0) delete next[p.identity];
                            else next[p.identity] = idx;
                            return next;
                          })
                        }
                      >
                        <option value={-1}>Unassigned</option>
                        {Array.from({ length: count }, (_, i) => (
                          <option key={i} value={i}>
                            Room {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            <Button
              className="w-full"
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              Create rooms
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div key={room.id} className="rounded-lg border border-slate-800 p-2.5">
                  <p className="text-sm font-medium text-slate-100">{room.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3 w-3" />
                    {room.assignedUserIds.length} assigned
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => openMutation.mutate()}
                disabled={openMutation.isPending}
              >
                Open breakout rooms
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => endMutation.mutate()}
                disabled={endMutation.isPending}
              >
                <X className="h-3.5 w-3.5" />
                End all
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 p-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Timer className="h-3.5 w-3.5" />
                Countdown timer
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={timerMinutes}
                  onChange={(e) =>
                    setTimerMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))
                  }
                  className="ms-input h-8 flex-1 text-xs"
                  aria-label="Timer minutes"
                />
                <Button
                  size="sm"
                  onClick={() => timerMutation.mutate(timerMinutes)}
                  disabled={timerMutation.isPending}
                >
                  Start
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => timerMutation.mutate(null)}
                  disabled={timerMutation.isPending}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-slate-800 p-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Megaphone className="h-3.5 w-3.5" />
                Broadcast to all rooms
              </span>
              <div className="flex gap-2">
                <input
                  value={broadcastDraft}
                  onChange={(e) => setBroadcastDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && broadcastDraft.trim()) {
                      e.preventDefault();
                      broadcastMutation.mutate();
                    }
                  }}
                  placeholder="5 minutes left…"
                  maxLength={300}
                  className="ms-input h-8 flex-1 text-xs"
                  aria-label="Broadcast message"
                />
                <Button
                  size="sm"
                  onClick={() => broadcastMutation.mutate()}
                  disabled={!broadcastDraft.trim() || broadcastMutation.isPending}
                >
                  Send
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export type { BreakoutChannelMessage };
