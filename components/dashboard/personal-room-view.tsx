"use client";

import { useRouter } from "next/navigation";
import { Copy, Shield, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";
import { buildMeetingJoinUrl, getPersonalRoomId, meetingLobbyPath } from "@/lib/utils/format";
import { useToast } from "@/lib/hooks/use-toast";
import { LoadingState } from "@/components/ui/states";
import { PageBody } from "./page-inset";
import { PageHeader } from "./page-header";

export function PersonalRoomView() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const roomId = user?.id ? getPersonalRoomId(user.id) : null;

  if (!roomId) {
    return <LoadingState label={isLoading ? "Loading…" : "Sign in to view your room"} />;
  }

  const inviteLink = buildMeetingJoinUrl(roomId);

  return (
    <PageBody className="space-y-6">
      <PageHeader
        title="Personal Room"
        description="A permanent room assigned to you — share the link anytime for ad-hoc meetings."
      />

      <div className="ms-panel overflow-hidden">
        <div
          className="border-b px-5 py-8"
          style={{
            borderColor: "var(--border)",
            background:
              "linear-gradient(120deg, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)",
          }}
        >
          <p className="ms-section-label text-sky-700 dark:text-sky-400">
            {user?.name}&apos;s room
          </p>
          <p className="ms-text-heading mt-2 font-mono text-2xl font-semibold tracking-tight md:text-3xl">
            {roomId}
          </p>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="ms-text-muted text-xs font-medium uppercase tracking-wide">
              Invite link
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <code
                className="flex-1 truncate rounded-lg border px-3 py-2.5 text-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--foreground)",
                }}
              >
                {inviteLink}
              </code>
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLink);
                  toast({ variant: "success", title: "Link copied" });
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          <ul className="ms-text-muted space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              Waiting room and mute-on-entry can be set as defaults in Settings.
            </li>
            <li className="flex items-start gap-2">
              <Video className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              Anyone with the link reaches your lobby; you control when to admit.
            </li>
          </ul>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="lg" onClick={() => router.push(meetingLobbyPath(roomId))}>
              <Video className="h-4 w-4" />
              Start personal meeting
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(roomId);
                toast({ variant: "success", title: "Meeting ID copied" });
              }}
            >
              Copy meeting ID
            </Button>
          </div>
        </div>
      </div>
    </PageBody>
  );
}
