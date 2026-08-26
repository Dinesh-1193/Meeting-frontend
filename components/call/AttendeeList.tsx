"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCog, Users } from "lucide-react";
import { getParticipantCounts, listRoomParticipants, setParticipantRole } from "@/lib/api";
import { LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";

interface AttendeeListProps {
  roomId: string;
  isHost?: boolean;
}

/**
 * Webinar attendees are hidden participants — LiveKit's client-side
 * useParticipants() never sees them (by design, so 1000 browsers aren't
 * flooded with join/leave events). This reads the scalable REST directory
 * the backend maintains instead, polled rather than realtime.
 */
export function AttendeeList({ roomId, isHost }: AttendeeListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const countsQuery = useQuery({
    queryKey: ["room-participant-counts", roomId],
    queryFn: () => getParticipantCounts(roomId),
    refetchInterval: 8000,
  });

  const listQuery = useQuery({
    queryKey: ["room-participants", roomId],
    queryFn: () => listRoomParticipants(roomId),
    refetchInterval: 8000,
  });

  const promoteMutation = useMutation({
    mutationFn: (identity: string) => setParticipantRole(roomId, identity, "panelist"),
    onSuccess: () => {
      toast({ variant: "success", title: "Promoted to panelist" });
      void queryClient.invalidateQueries({ queryKey: ["room-participants", roomId] });
      void queryClient.invalidateQueries({ queryKey: ["room-participant-counts", roomId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Could not promote attendee.";
      toast({ variant: "error", title: "Promote failed", description: message });
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-sm text-slate-200">
        <Users className="h-4 w-4" />
        <span className="font-medium">
          {countsQuery.data?.total ?? "—"} watching
        </span>
        {countsQuery.data ? (
          <span className="text-xs text-slate-400">
            ({countsQuery.data.hosts + countsQuery.data.panelists} presenting)
          </span>
        ) : null}
      </div>

      {listQuery.isLoading ? (
        <LoadingState label="Loading attendees…" className="min-h-[120px]" />
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {(listQuery.data?.participants ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 px-4 py-2 text-sm text-slate-200"
            >
              <span className="truncate">{p.displayName}</span>
              {p.role !== "attendee" ? (
                <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
                  {p.role}
                </span>
              ) : isHost ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Promote ${p.displayName} to panelist`}
                  disabled={promoteMutation.isPending}
                  onClick={() => promoteMutation.mutate(p.userId)}
                >
                  <UserCog className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
          {!listQuery.data?.participants.length ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No one here yet
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
