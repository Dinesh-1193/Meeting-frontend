"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { JoinMeetingModal } from "./join-meeting-modal";
import { ScheduleMeetingModal } from "./schedule-meeting-modal";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/hooks/use-auth";
import { sendPresenceHeartbeat } from "@/lib/api";
import type { MeetingSummary } from "@/types";

interface WorkspaceActions {
  openJoin: () => void;
  openSchedule: (editMeeting?: MeetingSummary) => void;
  newMeeting: () => void;
}

const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);

export function useWorkspaceActions() {
  const ctx = useContext(WorkspaceActionsContext);
  if (!ctx) {
    throw new Error("useWorkspaceActions must be used within AppShell");
  }
  return ctx;
}

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth({ required: true });
  const [joinOpen, setJoinOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editMeeting, setEditMeeting] = useState<MeetingSummary | undefined>(undefined);

  const actions = useMemo<WorkspaceActions>(
    () => ({
      openJoin: () => setJoinOpen(true),
      openSchedule: (meeting) => {
        setEditMeeting(meeting);
        setScheduleOpen(true);
      },
      newMeeting: () => router.push("/meeting/new"),
    }),
    [router],
  );

  useEffect(() => {
    if (user?.isGuest) {
      router.replace("/login");
    }
  }, [user?.isGuest, router]);

  useEffect(() => {
    if (!user || user.isGuest) return;
    void sendPresenceHeartbeat().catch(() => undefined);
    const id = window.setInterval(() => {
      void sendPresenceHeartbeat().catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [user]);

  if (isLoading || !user || user.isGuest) {
    return (
      <LoadingState
        label="Loading workspace…"
        className="min-h-screen bg-[var(--background)]"
      />
    );
  }

  return (
    <WorkspaceActionsContext.Provider value={actions}>
      <div className="flex h-screen overflow-hidden ms-text-heading" style={{ background: "var(--background)" }}>
        <Sidebar user={user} onLogout={() => void logout()} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={title}
            onJoin={actions.openJoin}
            onSchedule={actions.openSchedule}
            onNewMeeting={actions.newMeeting}
          />
          <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
            <div className="box-border flex min-h-0 min-w-0 w-full max-w-none flex-1 flex-col overflow-hidden">
              {children}
            </div>
          </main>
        </div>

        <JoinMeetingModal open={joinOpen} onClose={() => setJoinOpen(false)} />
        <ScheduleMeetingModal
          open={scheduleOpen}
          onClose={() => {
            setScheduleOpen(false);
            setEditMeeting(undefined);
          }}
          editMeeting={editMeeting}
        />
      </div>
    </WorkspaceActionsContext.Provider>
  );
}
