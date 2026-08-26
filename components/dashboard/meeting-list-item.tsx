"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PopoverMenu, PopoverMenuItem } from "@/components/ui/popover-menu";
import {
  buildMeetingJoinUrl,
  formatDateTime,
  formatRelativeTime,
  meetingLobbyPath,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { cancelRoom } from "@/lib/api";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/lib/hooks/use-toast";
import { useWorkspaceActions } from "./app-shell";
import type { MeetingSummary } from "@/types";

interface MeetingListItemProps {
  meeting: MeetingSummary;
  compact?: boolean;
}

export function MeetingListItem({ meeting, compact }: MeetingListItemProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openSchedule } = useWorkspaceActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isUpcoming =
    meeting.status === "scheduled" ||
    meeting.status === "waiting" ||
    meeting.status === "live";
  const isHost = user?.id === meeting.hostId;
  const canManage = isHost && meeting.status === "scheduled";

  const cancelMutation = useMutation({
    mutationFn: (scope: "this" | "all") => cancelRoom(meeting.roomId, scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({ variant: "info", title: "Meeting cancelled" });
    },
    onError: () => {
      toast({ variant: "error", title: "Could not cancel meeting" });
    },
  });

  const handleCancel = () => {
    setMenuOpen(false);
    if (!window.confirm(`Cancel "${meeting.name}"?`)) return;
    const scope: "this" | "all" =
      meeting.recurrenceGroupId &&
      window.confirm(
        "This is a recurring meeting. Click OK to cancel this and all following events, or Cancel to cancel just this one.",
      )
        ? "all"
        : "this";
    cancelMutation.mutate(scope);
  };

  const copyLink = async () => {
    setMenuOpen(false);
    const link = meeting.joinLink?.startsWith("http")
      ? meeting.joinLink
      : buildMeetingJoinUrl(meeting.joinCode || meeting.roomId);
    try {
      await navigator.clipboard.writeText(link);
      toast({ variant: "success", title: "Invite link copied" });
    } catch {
      toast({ variant: "error", title: "Could not copy link" });
    }
  };

  return (
    <li
      className={cn(
        "flex flex-col gap-3 border-b px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between",
        compact && "py-3",
      )}
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            isUpcoming
              ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
              : "bg-[var(--surface-muted)] text-[var(--muted)]",
          )}
        >
          {isUpcoming ? (
            <Calendar className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="ms-text-heading truncate font-medium">{meeting.name}</p>
            <StatusBadge status={meeting.status} />
          </div>
          <p className="ms-text-muted mt-0.5 text-xs">
            {isUpcoming
              ? `${formatDateTime(meeting.scheduledAt)} · ${formatRelativeTime(meeting.scheduledAt)}`
              : `Ended ${formatRelativeTime(meeting.endedAt)}`}
            {meeting.hostName ? ` · Host: ${meeting.hostName}` : ""}
            {meeting.durationMinutes ? ` · ${meeting.durationMinutes} min` : ""}
            {meeting.participantCount != null
              ? ` · ${meeting.participantCount} people`
              : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:pl-4">
        {isUpcoming ? (
          <>
            <Button
              size="sm"
              onClick={() =>
                router.push(meetingLobbyPath(meeting.joinCode || meeting.roomId))
              }
            >
              <Video className="h-3.5 w-3.5" />
              Start / Join
            </Button>
            <Button
              ref={menuButtonRef}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg"
              aria-label="More actions"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <PopoverMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuButtonRef}
            >
              <PopoverMenuItem onClick={() => void copyLink()}>
                <Copy className="h-3.5 w-3.5" />
                Copy invite link
              </PopoverMenuItem>
              {canManage ? (
                <>
                  <PopoverMenuItem
                    onClick={() => {
                      setMenuOpen(false);
                      openSchedule(meeting);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit meeting
                  </PopoverMenuItem>
                  <div
                    className="my-1 border-t"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <PopoverMenuItem
                    danger
                    disabled={cancelMutation.isPending}
                    onClick={handleCancel}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Cancel meeting
                  </PopoverMenuItem>
                </>
              ) : null}
            </PopoverMenu>
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/meeting/${meeting.roomId}/ended`)}
          >
            Details
          </Button>
        )}
      </div>
    </li>
  );
}

export function StatusBadge({ status }: { status: MeetingSummary["status"] }) {
  const map: Record<string, string> = {
    live: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    scheduled: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    waiting: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    ended: "bg-[var(--surface-muted)] text-[var(--muted)]",
  };
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        map[status] ?? map.ended,
      )}
    >
      {status}
    </span>
  );
}
