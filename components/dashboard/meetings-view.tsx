"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, MoreHorizontal, Pencil, Trash2, Video } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { PopoverMenu, PopoverMenuItem } from "@/components/ui/popover-menu";
import { Pagination } from "@/components/ui/pagination";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTablePanel,
  DataTablePlaceholder,
  DataTableRow,
  DataTableScroll,
} from "@/components/ui/data-table";
import { StatusBadge } from "./meeting-list-item";
import { useAuth } from "@/lib/hooks/use-auth";
import { useClientPagination } from "@/lib/hooks/use-client-pagination";
import { useToast } from "@/lib/hooks/use-toast";
import { listMeetings, cancelRoom } from "@/lib/api";
import { buildMeetingJoinUrl, formatDateTime, formatRelativeTime, meetingLobbyPath } from "@/lib/utils/format";
import { useWorkspaceActions } from "./app-shell";
import { PageInset } from "./page-inset";
import { PageHeader } from "./page-header";
import type { MeetingSummary } from "@/types";

type Tab = "upcoming" | "past" | "all";

export function MeetingsView() {
  const router = useRouter();
  const { user } = useAuth();
  const { openSchedule } = useWorkspaceActions();
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const [tab, setTab] = useState<Tab>("upcoming");

  const meetingsQuery = useQuery({
    queryKey: ["meetings", user?.id],
    queryFn: () => listMeetings(user!.id),
    enabled: Boolean(user?.id),
  });

  const filtered = useMemo(() => {
    let list = meetingsQuery.data ?? [];
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.roomId.toLowerCase().includes(q) ||
          (m.hostName ?? "").toLowerCase().includes(q),
      );
    }
    if (tab === "upcoming") {
      return list
        .filter(
          (m) =>
            m.status === "scheduled" ||
            m.status === "waiting" ||
            m.status === "live",
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledAt ?? 0).getTime() -
            new Date(b.scheduledAt ?? 0).getTime(),
        );
    }
    if (tab === "past") {
      return list
        .filter((m) => m.status === "ended")
        .sort(
          (a, b) =>
            new Date(b.endedAt ?? 0).getTime() -
            new Date(a.endedAt ?? 0).getTime(),
        );
    }
    return list;
  }, [meetingsQuery.data, tab, q]);

  const { page, setPage, resetPage, pageCount, pageSize, setPageSize, paged, totalItems } =
    useClientPagination(filtered);

  const setTabAndResetPage = (next: Tab) => {
    setTab(next);
    resetPage();
  };

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <PageInset className="shrink-0 space-y-4 pb-4 pt-5 md:pt-6">
        <PageHeader
          title="Meetings"
          description="Manage upcoming sessions and review past calls."
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/calendar")}
              >
                Open calendar
              </Button>
              <Button onClick={() => openSchedule()}>Schedule meeting</Button>
            </>
          }
        />

        <div className="ms-segment">
          {(
            [
              ["upcoming", "Upcoming"],
              ["past", "Past"],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="ms-segment-item"
              data-active={tab === value}
              onClick={() => setTabAndResetPage(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {q ? (
          <p className="ms-text-muted text-xs">
            Showing results for “{searchParams.get("q")}”
          </p>
        ) : null}
      </PageInset>

      <DataTablePanel>
        <DataTableScroll>
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead className="w-[28%]">Meeting</DataTableHead>
                <DataTableHead className="w-[12%]">Status</DataTableHead>
                <DataTableHead className="w-[22%]">Date &amp; time</DataTableHead>
                <DataTableHead className="w-[16%]">Host</DataTableHead>
                <DataTableHead className="w-[22%] text-right">Actions</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {meetingsQuery.isLoading ? (
                <DataTablePlaceholder colSpan={5}>
                  <LoadingState label="Loading meetings…" className="min-h-[200px] w-full" />
                </DataTablePlaceholder>
              ) : filtered.length === 0 ? (
                <DataTablePlaceholder colSpan={5}>
                  <EmptyState
                    title="No meetings here"
                    description={
                      tab === "upcoming"
                        ? "Schedule a meeting to see it listed."
                        : "Past meetings will show up after you host or join a call."
                    }
                    icon={<Video className="h-5 w-5" />}
                    className="min-h-[200px] border-0 bg-transparent"
                  />
                </DataTablePlaceholder>
              ) : (
                paged.map((m) => <MeetingTableRow key={m.id} meeting={m} />)
              )}
            </DataTableBody>
          </DataTable>
        </DataTableScroll>
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </DataTablePanel>
    </div>
  );
}

function MeetingTableRow({ meeting }: { meeting: MeetingSummary }) {
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
    <DataTableRow>
      <DataTableCell className="max-w-0">
        <p className="ms-text-heading truncate font-medium">{meeting.name}</p>
        <p className="ms-text-muted mt-0.5 truncate text-xs">
          {meeting.durationMinutes ? `${meeting.durationMinutes} min` : ""}
          {meeting.participantCount != null
            ? `${meeting.durationMinutes ? " · " : ""}${meeting.participantCount} people`
            : ""}
        </p>
      </DataTableCell>
      <DataTableCell>
        <StatusBadge status={meeting.status} />
      </DataTableCell>
      <DataTableCell>
        <p className="ms-text-heading whitespace-nowrap">
          {isUpcoming ? formatDateTime(meeting.scheduledAt) : "—"}
        </p>
        <p className="ms-text-muted mt-0.5 whitespace-nowrap text-xs">
          {isUpcoming
            ? formatRelativeTime(meeting.scheduledAt)
            : `Ended ${formatRelativeTime(meeting.endedAt)}`}
        </p>
      </DataTableCell>
      <DataTableCell>
        <span className="ms-text-heading">{meeting.hostName ?? "—"}</span>
      </DataTableCell>
      <DataTableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          {isUpcoming ? (
            <>
              <Button
                size="sm"
                className="shrink-0"
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
                className="h-8 w-8 shrink-0 rounded-lg"
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
              className="shrink-0"
              onClick={() => router.push(`/meeting/${meeting.roomId}/ended`)}
            >
              Details
            </Button>
          )}
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}

