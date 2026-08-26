"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarPlus,
  CalendarRange,
  Copy,
  DoorOpen,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { MeetingListItem } from "./meeting-list-item";
import { useAuth } from "@/lib/hooks/use-auth";
import { listMeetings } from "@/lib/api";
import { buildMeetingJoinUrl, getPersonalRoomId, meetingLobbyPath } from "@/lib/utils/format";
import { useToast } from "@/lib/hooks/use-toast";
import { useWorkspaceActions } from "./app-shell";
import { PageBody } from "./page-inset";

export function HomeView() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { openJoin, openSchedule } = useWorkspaceActions();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const personalId = user?.id ? getPersonalRoomId(user.id) : null;

  const meetingsQuery = useQuery({
    queryKey: ["meetings", user?.id],
    queryFn: () => listMeetings(user!.id),
    enabled: Boolean(user?.id),
  });

  const meetings = meetingsQuery.data ?? [];
  const upcoming = meetings
    .filter(
      (m) =>
        m.status === "scheduled" || m.status === "waiting" || m.status === "live",
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt ?? 0).getTime() -
        new Date(b.scheduledAt ?? 0).getTime(),
    )
    .slice(0, 4);

  return (
    <PageBody className="space-y-8">
      <div>
        <p className="ms-section-label">Welcome back</p>
        <h2 className="ms-text-heading mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl">
          Hello, {firstName}
        </h2>
        <p className="ms-text-muted mt-2 max-w-xl text-sm leading-relaxed">
          Start an instant meeting, join with a code, or jump into your next scheduled
          call.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ActionTile
          title="New meeting"
          description="Start an instant room"
          icon={<Video className="h-5 w-5" />}
          accent
          onClick={() => router.push("/meeting/new")}
        />
        <ActionTile
          title="Join"
          description="Enter ID or invite link"
          icon={<DoorOpen className="h-5 w-5" />}
          onClick={openJoin}
        />
        <ActionTile
          title="Schedule"
          description="Plan for later"
          icon={<CalendarPlus className="h-5 w-5" />}
          onClick={() => openSchedule()}
        />
        <ActionTile
          title="Personal room"
          description="Your always-on room"
          icon={<Copy className="h-5 w-5" />}
          onClick={() => router.push("/dashboard/personal-room")}
        />
      </div>

      <section className="ms-panel overflow-hidden">
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <h3 className="ms-text-heading text-sm font-semibold tracking-tight">
              Upcoming meetings
            </h3>
            <p className="ms-text-muted text-xs">Your next sessions at a glance</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => router.push("/dashboard/calendar")}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Calendar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => router.push("/dashboard/meetings")}
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {meetingsQuery.isLoading ? (
          <LoadingState label="Loading meetings…" className="min-h-[160px]" />
        ) : upcoming.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nothing scheduled"
              description="Schedule a meeting or start one now."
              icon={<CalendarPlus className="h-5 w-5" />}
              action={
                <Button size="sm" onClick={() => openSchedule()}>
                  Schedule meeting
                </Button>
              }
            />
          </div>
        ) : (
          <ul>
            {upcoming.map((m) => (
              <MeetingListItem key={m.id} meeting={m} compact />
            ))}
          </ul>
        )}
      </section>

      {personalId ? (
        <section
          className="ms-panel overflow-hidden p-5"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface)), var(--surface))",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="ms-section-label">Personal room</p>
              <h3 className="ms-text-heading mt-1 text-sm font-semibold">
                Always ready when you are
              </h3>
              <p className="ms-text-muted mt-1 text-xs">
                Share anytime — ID{" "}
                <span className="font-mono font-medium text-[var(--foreground)]">
                  {personalId}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={async () => {
                  const link = buildMeetingJoinUrl(personalId);
                  await navigator.clipboard.writeText(link);
                  toast({ variant: "success", title: "Invite link copied" });
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy invite
              </Button>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => router.push(meetingLobbyPath(personalId))}
              >
                Enter room
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </PageBody>
  );
}

function ActionTile({
  title,
  description,
  icon,
  onClick,
  accent,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ms-card-interactive flex flex-col items-start p-4 text-left"
    >
      <span
        className={
          accent
            ? "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-md shadow-sky-600/30"
            : "flex h-11 w-11 items-center justify-center rounded-2xl"
        }
        style={
          accent
            ? undefined
            : { background: "var(--surface-muted)", color: "var(--foreground)" }
        }
      >
        {icon}
      </span>
      <span className="ms-text-heading mt-3.5 text-sm font-semibold tracking-tight">
        {title}
      </span>
      <span className="ms-text-muted mt-0.5 text-xs leading-relaxed">{description}</span>
    </button>
  );
}
