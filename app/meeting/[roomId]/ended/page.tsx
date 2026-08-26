"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getRoom, getRoomRecordings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/hooks/use-auth";

export default function MeetingEndedPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth({ required: true });

  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom(roomId),
    enabled: Boolean(roomId) && Boolean(user),
    retry: false,
  });

  const recordingsQuery = useQuery({
    queryKey: ["recordings", roomId],
    queryFn: () => getRoomRecordings(roomId),
    enabled: Boolean(roomId) && Boolean(user) && !user?.isGuest,
    retry: false,
  });

  if (authLoading || !user) {
    return <LoadingState className="min-h-screen" label="Loading…" />;
  }

  const homeHref = user.isGuest ? "/" : "/dashboard";
  const isHost = !user.isGuest && roomQuery.data?.hostId === user.id;
  const recordings = recordingsQuery.data ?? [];

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="ms-panel w-full max-w-lg p-8 text-center">
        <p className="text-sm uppercase tracking-wide text-sky-600 dark:text-sky-400">
          Call ended
        </p>
        <h1 className="ms-text-heading mt-2 text-2xl font-semibold">
          {roomQuery.data?.name || "Meeting"}
        </h1>
        <p className="ms-text-muted mt-2 text-sm">
          Thanks for joining. You can rejoin or head back home.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => router.push(`/meeting/${roomId}/lobby`)}>
            Rejoin
          </Button>
          <Button variant="secondary" onClick={() => router.push(homeHref)}>
            {user.isGuest ? "Back home" : "Back to dashboard"}
          </Button>
        </div>

        {isHost ? (
          <div className="mt-8 text-left">
            <h2 className="ms-text-heading text-sm font-semibold">Recordings</h2>
            {recordingsQuery.isLoading ? (
              <LoadingState label="Loading recordings…" className="min-h-[100px]" />
            ) : recordings.length === 0 ? (
              <EmptyState
                title="No recordings yet"
                description="Host recordings will appear here when available."
                className="mt-2"
              />
            ) : (
              <ul className="mt-2 space-y-2">
                {recordings.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <span className="ms-text-muted">
                      {r.status === "ready" ? "Ready" : r.status}
                    </span>
                    {r.url ? (
                      <Link
                        href={r.url}
                        className="text-sky-600 hover:text-sky-500 dark:text-sky-400"
                        target="_blank"
                      >
                        Open
                      </Link>
                    ) : r.status === "failed" ? (
                      <span className="text-red-600 dark:text-red-400">Failed</span>
                    ) : (
                      <span className="ms-text-muted">Processing…</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
