"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, Film, Link2, Loader2 } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
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
import { listRecordings, setRecordingShareExpiry } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api/client";
import { useClientPagination } from "@/lib/hooks/use-client-pagination";
import { useToast } from "@/lib/hooks/use-toast";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { PageInset } from "./page-inset";
import { PageHeader } from "./page-header";
import type { RecordingSummary } from "@/types";

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const STATUS_STYLE: Record<RecordingSummary["status"], string> = {
  ready: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  processing: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  failed: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const EXPIRY_OPTIONS = [
  { value: "", label: "No expiry" },
  { value: "1", label: "Expires in 1 day" },
  { value: "7", label: "Expires in 7 days" },
  { value: "30", label: "Expires in 30 days" },
];

function shareLinkFor(recordingId: string): string {
  return `${getApiBaseUrl()}/recordings/${recordingId}/share`;
}

export function RecordingsView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["recordings"],
    queryFn: listRecordings,
  });

  const expiryMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number | null }) =>
      setRecordingShareExpiry(id, days),
    onSuccess: () => {
      toast({ variant: "success", title: "Share link updated" });
      void queryClient.invalidateQueries({ queryKey: ["recordings"] });
    },
    onError: () => toast({ variant: "error", title: "Could not update share link" }),
  });

  const items = query.data ?? [];
  const { page, setPage, pageCount, pageSize, setPageSize, paged, totalItems } =
    useClientPagination(items);

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <PageInset className="shrink-0 pb-4 pt-5 md:pt-6">
        <PageHeader
          title="Recordings"
          description="Cloud recordings from meetings you hosted or were invited to."
        />
      </PageInset>

      <DataTablePanel>
        <DataTableScroll>
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead className="w-[22%]">Recording</DataTableHead>
                <DataTableHead className="w-[14%]">Recorded</DataTableHead>
                <DataTableHead className="w-[10%]">Duration</DataTableHead>
                <DataTableHead className="w-[12%]">Host</DataTableHead>
                <DataTableHead className="w-[10%]">Status</DataTableHead>
                <DataTableHead className="w-[18%]">Share link</DataTableHead>
                <DataTableHead className="w-[14%] text-right">Actions</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {query.isLoading ? (
                <DataTablePlaceholder colSpan={7}>
                  <LoadingState label="Loading recordings…" className="min-h-[200px] w-full" />
                </DataTablePlaceholder>
              ) : items.length === 0 ? (
                <DataTablePlaceholder colSpan={7}>
                  <EmptyState
                    title="No recordings yet"
                    description="When a host records a meeting, files appear here."
                    icon={<Film className="h-5 w-5" />}
                    className="min-h-[200px] border-0 bg-transparent"
                  />
                </DataTablePlaceholder>
              ) : (
                paged.map((rec) => (
                  <DataTableRow key={rec.id}>
                    <DataTableCell className="max-w-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            background: "var(--surface-muted)",
                            color: "var(--muted-strong)",
                          }}
                        >
                          <Film className="h-4 w-4" />
                        </span>
                        <p className="ms-text-heading truncate font-medium">
                          {rec.name}
                        </p>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <span className="ms-text-heading">
                        {formatDateTime(rec.createdAt)}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="whitespace-nowrap">
                      <span className="ms-text-heading">
                        {formatDuration(rec.durationSeconds)}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      <span className="ms-text-heading">{rec.hostName ?? "—"}</span>
                    </DataTableCell>
                    <DataTableCell>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          STATUS_STYLE[rec.status],
                        )}
                      >
                        {rec.status}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      {rec.status === "ready" && rec.url ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2"
                            onClick={async () => {
                              await navigator.clipboard.writeText(shareLinkFor(rec.id));
                              toast({ variant: "success", title: "Share link copied" });
                            }}
                            aria-label={`Copy share link for ${rec.name}`}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                          <select
                            className="ms-select h-8 flex-1 text-xs"
                            value={
                              rec.shareExpiresAt
                                ? String(
                                    Math.max(
                                      1,
                                      Math.round(
                                        (new Date(rec.shareExpiresAt).getTime() - Date.now()) /
                                          86_400_000,
                                      ),
                                    ),
                                  )
                                : ""
                            }
                            onChange={(e) =>
                              expiryMutation.mutate({
                                id: rec.id,
                                days: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                            aria-label={`Share link expiry for ${rec.name}`}
                          >
                            {EXPIRY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="ms-text-muted text-xs">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex justify-end">
                        {rec.status === "ready" && rec.url ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              window.open(rec.url, "_blank", "noopener,noreferrer");
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        ) : rec.status === "failed" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-200/80">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Processing
                          </span>
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))
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
