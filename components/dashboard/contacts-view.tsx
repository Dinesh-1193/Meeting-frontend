"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, MessageSquare, UserPlus, Video } from "lucide-react";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AddContactModal } from "./add-contact-modal";
import { PageInset } from "./page-inset";
import { PageHeader } from "./page-header";
import { createRoom, listContacts } from "@/lib/api";
import { useClientPagination } from "@/lib/hooks/use-client-pagination";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import { meetingLobbyPath } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Contact } from "@/types";

const STATUS_STYLE: Record<Contact["status"], string> = {
  online: "bg-emerald-400",
  "in-meeting": "bg-sky-400",
  away: "bg-amber-400",
  offline: "bg-slate-400",
};

export function ContactsView() {
  const router = useRouter();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [meetingContactId, setMeetingContactId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["contacts"],
    queryFn: listContacts,
    refetchInterval: 30_000,
  });

  const meetMutation = useMutation({
    mutationFn: async (contact: Contact) =>
      createRoom({
        name: `Meeting with ${contact.name}`,
        invitedEmails: [contact.email],
      }),
    onSuccess: (room) => {
      router.push(meetingLobbyPath(room.joinCode || room.id));
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Could not start meeting",
        description: err instanceof ApiError ? err.message : "Try again",
      });
      setMeetingContactId(null);
    },
  });

  const filtered = useMemo(() => {
    const list = query.data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (c.title ?? "").toLowerCase().includes(term),
    );
  }, [query.data, q]);

  const { page, setPage, resetPage, pageCount, pageSize, setPageSize, paged, totalItems } =
    useClientPagination(filtered);

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <PageInset className="shrink-0 space-y-4 pb-4 pt-5 md:pt-6">
        <PageHeader
          title="Contacts"
          description="People you meet with often — invite or start a call in one click."
          actions={
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add contact
            </Button>
          }
        />

        <div className="w-full max-w-md">
          <Input
            placeholder="Search contacts…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetPage();
            }}
            aria-label="Search contacts"
          />
        </div>
      </PageInset>

      <DataTablePanel>
        <DataTableScroll>
          <DataTable>
            <DataTableHeader>
              <tr>
                <DataTableHead className="w-[30%]">Name</DataTableHead>
                <DataTableHead className="w-[32%]">Email</DataTableHead>
                <DataTableHead className="w-[16%]">Status</DataTableHead>
                <DataTableHead className="w-[22%] text-right">Actions</DataTableHead>
              </tr>
            </DataTableHeader>
            <DataTableBody>
              {query.isLoading ? (
                <DataTablePlaceholder colSpan={4}>
                  <LoadingState label="Loading contacts…" className="min-h-[200px] w-full" />
                </DataTablePlaceholder>
              ) : filtered.length === 0 ? (
                <DataTablePlaceholder colSpan={4}>
                  <EmptyState
                    title="No contacts found"
                    description="Add someone to invite them quickly next time."
                    icon={<UserPlus className="h-5 w-5" />}
                    className="min-h-[200px] border-0 bg-transparent"
                  />
                </DataTablePlaceholder>
              ) : (
                paged.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    meetPending={meetingContactId === c.id && meetMutation.isPending}
                    onMeet={() => {
                      setMeetingContactId(c.id);
                      meetMutation.mutate(c);
                    }}
                    onMessage={() => router.push(`/dashboard/chat?userId=${c.id}`)}
                  />
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

      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function ContactRow({
  contact,
  onMeet,
  onMessage,
  meetPending,
}: {
  contact: Contact;
  onMeet: () => void;
  onMessage: () => void;
  meetPending?: boolean;
}) {
  return (
    <DataTableRow>
      <DataTableCell className="max-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                background: "var(--surface-muted)",
                color: "var(--foreground)",
              }}
            >
              {contact.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span
              className={cn(
                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)]",
                STATUS_STYLE[contact.status],
              )}
              title={contact.status}
            />
          </div>
          <div className="min-w-0">
            <p className="ms-text-heading truncate font-medium">{contact.name}</p>
            {contact.title ? (
              <p className="ms-text-muted truncate text-xs">{contact.title}</p>
            ) : null}
          </div>
        </div>
      </DataTableCell>
      <DataTableCell className="max-w-0">
        <span className="ms-text-muted block truncate">{contact.email}</span>
      </DataTableCell>
      <DataTableCell className="capitalize">
        <span className="ms-text-muted">{contact.status.replace("-", " ")}</span>
      </DataTableCell>
      <DataTableCell>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onMeet} isLoading={meetPending}>
            <Video className="h-3.5 w-3.5" />
            Meet
          </Button>
          <Button size="sm" variant="secondary" onClick={onMessage}>
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              window.location.href = `mailto:${contact.email}`;
            }}
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </Button>
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}
