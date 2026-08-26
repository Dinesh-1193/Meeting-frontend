"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { admitParticipant, denyParticipant, listWaitingRoom } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";

interface AdmitQueuePanelProps {
  roomId: string;
}

export function AdmitQueuePanel({ roomId }: AdmitQueuePanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: ["waiting-room", roomId],
    queryFn: () => listWaitingRoom(roomId),
    refetchInterval: 3000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["waiting-room", roomId] });

  const admitMutation = useMutation({
    mutationFn: (participantId: string) => admitParticipant(roomId, participantId),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Could not admit.";
      toast({ variant: "error", title: "Admit failed", description: message });
    },
  });

  const denyMutation = useMutation({
    mutationFn: (participantId: string) => denyParticipant(roomId, participantId),
    onSuccess: invalidate,
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Could not deny.";
      toast({ variant: "error", title: "Deny failed", description: message });
    },
  });

  const pending = pendingQuery.data ?? [];

  if (pendingQuery.isLoading) {
    return <LoadingState label="Checking waiting room…" className="min-h-[120px]" />;
  }

  if (!pending.length) {
    return (
      <div className="p-4">
        <EmptyState title="No one is waiting" description="Join requests will show up here." />
      </div>
    );
  }

  return (
    <ul className="flex-1 overflow-y-auto p-2">
      {pending.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-slate-900"
        >
          <span className="truncate text-sm text-slate-100">{p.displayName}</span>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-400"
              aria-label={`Admit ${p.displayName}`}
              disabled={admitMutation.isPending}
              onClick={() => admitMutation.mutate(p.id)}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400"
              aria-label={`Deny ${p.displayName}`}
              disabled={denyMutation.isPending}
              onClick={() => denyMutation.mutate(p.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
