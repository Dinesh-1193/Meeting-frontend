"use client";

import { useState } from "react";
import { useLocalParticipant, useParticipants } from "@livekit/components-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Shield, ShieldOff, UserCog, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { useCallStore } from "@/lib/store/call-store";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import { ConnectionQualityIndicator } from "./ConnectionQualityIndicator";
import { AttendeeList } from "./AttendeeList";
import { AdmitQueuePanel } from "./AdmitQueuePanel";
import { ConnectionQuality } from "livekit-client";
import {
  muteParticipant,
  removeParticipant,
  setCohost,
  setParticipantRole,
} from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/client";
import { avatarColorForIdentity } from "@/lib/utils/avatar-color";
import type { RoomMode } from "@/types";

interface ParticipantsPanelProps {
  roomId: string;
  isHost?: boolean;
  mode?: RoomMode;
  className?: string;
}

export function ParticipantsPanel({ roomId, isHost, mode, className }: ParticipantsPanelProps) {
  const isOpen = useCallStore((s) => s.isParticipantsOpen);
  const setParticipantsOpen = useCallStore((s) => s.setParticipantsOpen);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"stage" | "attendees" | "waiting">("stage");
  const isWebinar = mode === "webinar";
  const showTabs = isWebinar || isHost;
  const isModerator = Boolean(isHost) || localParticipant.attributes?.role === "cohost";

  const muteMutation = useMutation({
    mutationFn: (identity: string) => muteParticipant(roomId, identity),
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Could not mute participant.";
      toast({ variant: "error", title: "Mute failed", description: message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (identity: string) => removeParticipant(roomId, identity),
    onSuccess: () => toast({ variant: "info", title: "Participant removed" }),
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Could not remove participant.";
      toast({ variant: "error", title: "Remove failed", description: message });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ identity, role }: { identity: string; role: "panelist" | "attendee" }) =>
      setParticipantRole(roomId, identity, role),
    onSuccess: (_data, vars) => {
      toast({
        variant: "success",
        title: vars.role === "panelist" ? "Promoted to panelist" : "Moved to attendees",
      });
      void queryClient.invalidateQueries({ queryKey: ["room-participants", roomId] });
      void queryClient.invalidateQueries({ queryKey: ["room-participant-counts", roomId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Could not change role.";
      toast({ variant: "error", title: "Role change failed", description: message });
    },
  });

  const cohostMutation = useMutation({
    mutationFn: ({ identity, isCohost }: { identity: string; isCohost: boolean }) =>
      setCohost(roomId, identity, isCohost),
    onSuccess: (_data, vars) => {
      toast({
        variant: "success",
        title: vars.isCohost ? "Made co-host" : "Co-host removed",
      });
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Could not change co-host status.";
      toast({ variant: "error", title: "Update failed", description: message });
    },
  });

  if (!isOpen) return null;

  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-sm flex-col border-l border-slate-800 bg-slate-950",
        className,
      )}
      aria-label="Participants panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-base font-medium text-slate-100">People</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setParticipantsOpen(false)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showTabs ? (
        <div className="flex border-b border-slate-800 text-sm">
          <button
            type="button"
            className={cn(
              "flex-1 px-3 py-2 text-center",
              tab === "stage" ? "border-b-2 border-sky-400 text-slate-100" : "text-slate-400",
            )}
            onClick={() => setTab("stage")}
          >
            {isWebinar ? `On stage (${participants.length})` : "Participants"}
          </button>
          {isWebinar ? (
            <button
              type="button"
              className={cn(
                "flex-1 px-3 py-2 text-center",
                tab === "attendees" ? "border-b-2 border-sky-400 text-slate-100" : "text-slate-400",
              )}
              onClick={() => setTab("attendees")}
            >
              Attendees
            </button>
          ) : null}
          {isHost ? (
            <button
              type="button"
              className={cn(
                "flex-1 px-3 py-2 text-center",
                tab === "waiting" ? "border-b-2 border-sky-400 text-slate-100" : "text-slate-400",
              )}
              onClick={() => setTab("waiting")}
            >
              Waiting room
            </button>
          ) : null}
        </div>
      ) : null}

      {isWebinar && tab === "attendees" ? (
        <AttendeeList roomId={roomId} isHost={isHost} />
      ) : isHost && tab === "waiting" ? (
        <AdmitQueuePanel roomId={roomId} />
      ) : (
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {participants.length ? (
            <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              In the meeting
            </p>
          ) : null}
          {!participants.length ? (
            <EmptyState title="No participants" />
          ) : (
            participants.map((p) => {
              const isLocal = p.identity === localParticipant.identity;
              const name = `${p.name || p.identity}${isLocal ? " (You)" : ""}`;
              const participantRole = p.attributes?.role;
              const initials = (p.name || p.identity || "?")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={p.sid}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: avatarColorForIdentity(p.identity) }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-100">
                        {name}
                        {participantRole === "cohost" ? (
                          <span className="ml-1.5 rounded bg-sky-500/20 px-1 py-0.5 text-[10px] font-medium text-sky-300">
                            Co-host
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        {p.isMicrophoneEnabled ? (
                          <span className="inline-flex items-center gap-1">
                            <Mic className="h-3 w-3 text-emerald-400" /> Mic on
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <MicOff className="h-3 w-3 text-red-400" /> Muted
                          </span>
                        )}
                        <ConnectionQualityIndicator
                          quality={p.connectionQuality ?? ConnectionQuality.Unknown}
                        />
                      </div>
                    </div>
                  </div>

                  {isModerator && !isLocal ? (
                    <div className="flex shrink-0 gap-1">
                      {isWebinar && participantRole === "panelist" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Move ${name} to attendees`}
                          onClick={() =>
                            roleMutation.mutate({ identity: p.identity, role: "attendee" })
                          }
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {isHost && participantRole !== "host" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={
                            participantRole === "cohost"
                              ? `Remove co-host from ${name}`
                              : `Make ${name} co-host`
                          }
                          disabled={cohostMutation.isPending}
                          onClick={() =>
                            cohostMutation.mutate({
                              identity: p.identity,
                              isCohost: participantRole !== "cohost",
                            })
                          }
                        >
                          {participantRole === "cohost" ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Mute ${name}`}
                        disabled={muteMutation.isPending}
                        onClick={() => muteMutation.mutate(p.identity)}
                      >
                        <MicOff className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400"
                        aria-label={`Remove ${name}`}
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(p.identity)}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
}
