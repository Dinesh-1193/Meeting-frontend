"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { createDirectChannel, createGroupChannel, listContacts } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}

export function NewChatModal({ open, onClose, onCreated }: NewChatModalProps) {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  const contactsQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: listContacts,
    enabled: open,
  });

  const filtered = useMemo(() => {
    const list = contactsQuery.data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (c) => c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term),
    );
  }, [contactsQuery.data, q]);

  const reset = () => {
    setQ("");
    setSelected([]);
    setGroupName("");
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      if (selected.length === 1) {
        const channel = await createDirectChannel(selected[0]);
        return channel.id;
      }
      const channel = await createGroupChannel(groupName.trim() || null, selected);
      return channel.id;
    },
    onSuccess: (channelId) => {
      onCreated(channelId);
      reset();
      onClose();
    },
    onError: () => toast({ variant: "error", title: "Could not start chat" }),
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New chat"
    >
      <div className="space-y-3">
        <Input
          placeholder="Search contacts…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search contacts"
        />

        <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
          {contactsQuery.isLoading ? (
            <LoadingState label="Loading contacts…" className="min-h-[120px]" />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No contacts found"
              className="min-h-[120px] border-0 bg-transparent"
            />
          ) : (
            filtered.map((c) => {
              const isChecked = selected.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-[var(--hover)]",
                    isChecked && "bg-[var(--accent-soft)]",
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border)]"
                    checked={isChecked}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                      )
                    }
                  />
                  <div className="min-w-0">
                    <p className="ms-text-heading truncate font-medium">{c.name}</p>
                    <p className="ms-text-muted truncate text-xs">{c.email}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {selected.length >= 2 ? (
          <Input
            label="Group name (optional)"
            placeholder="e.g. Project Falcon"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={120}
          />
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={selected.length === 0 || startMutation.isPending}
            isLoading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            {selected.length >= 2 ? "Create group" : "Start chat"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
