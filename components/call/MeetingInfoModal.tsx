"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Lock, LockOpen } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { getRoom } from "@/lib/api";
import { buildMeetingJoinUrl, formatJoinCode } from "@/lib/utils/format";
import { useToast } from "@/lib/hooks/use-toast";

interface MeetingInfoModalProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
  isRecording?: boolean;
}

export function MeetingInfoModal({
  roomId,
  open,
  onClose,
  isRecording,
}: MeetingInfoModalProps) {
  const { toast } = useToast();
  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom(roomId),
    enabled: open,
  });

  const room = roomQuery.data;
  const meetingCode = formatJoinCode(room?.joinCode || roomId);
  const joinLink = room?.joinLink?.startsWith("http")
    ? room.joinLink
    : buildMeetingJoinUrl(meetingCode);

  return (
    <Modal open={open} onClose={onClose} title="Meeting info">
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Meeting name
          </p>
          <p className="mt-0.5 text-[var(--foreground)]">{room?.name ?? "—"}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Invite link
          </p>
          <div className="mt-1 flex gap-2">
            <code className="ms-input flex-1 truncate py-2 text-xs">{joinLink}</code>
            <Button
              variant="secondary"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(joinLink);
                toast({ variant: "success", title: "Link copied" });
              }}
              aria-label="Copy invite link"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Meeting ID
          </p>
          <div className="mt-1 flex gap-2">
            <code className="ms-input flex-1 py-2 font-mono text-sm tracking-wide">
              {meetingCode}
            </code>
            <Button
              variant="secondary"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(meetingCode);
                toast({ variant: "success", title: "Meeting ID copied" });
              }}
              aria-label="Copy meeting ID"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="ms-text-muted mt-1 text-[11px]">
            Share the invite link, or ask people to join with this Meeting ID.
          </p>
        </div>

        {room?.passcode ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Passcode
            </p>
            <div className="mt-1 flex gap-2">
              <code className="ms-input flex-1 py-2 text-xs">{room.passcode}</code>
              <Button
                variant="secondary"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(room.passcode ?? "");
                  toast({ variant: "success", title: "Passcode copied" });
                }}
                aria-label="Copy passcode"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-1">
            {room?.isLocked ? (
              <Lock className="h-3.5 w-3.5" />
            ) : (
              <LockOpen className="h-3.5 w-3.5" />
            )}
            {room?.isLocked ? "Locked" : "Unlocked"}
          </span>
          {isRecording ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-red-500">
              Recording
            </span>
          ) : null}
          {room?.hostName ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-1">
              Host: {room.hostName}
            </span>
          ) : null}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
