"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  scheduleMeeting,
  updateRoom,
} from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { useAuth } from "@/lib/hooks/use-auth";
import { downloadIcsFile, googleCalendarUrl } from "@/lib/utils/ics";
import { buildMeetingJoinUrl } from "@/lib/utils/format";
import { RoomSettingsFields, type RoomSettingsValue } from "./room-settings-fields";
import type { MeetingSummary, MeetingTemplate, RecurrenceRule } from "@/types";

interface ScheduleMeetingModalProps {
  open: boolean;
  onClose: () => void;
  /** When set, the modal edits this existing scheduled meeting instead of creating a new one. */
  editMeeting?: MeetingSummary | null;
}

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const defaultRoomSettings: RoomSettingsValue = {
  mode: "conference",
  waitingRoom: false,
  maxParticipants: 100,
  muteOnEntry: false,
  videoOffOnEntry: false,
  allowChat: true,
  allowScreenShare: true,
  passcode: "",
};

function defaultLocalDateTime(): string {
  const d = new Date(Date.now() + 3600_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EmailChipsField({
  label,
  placeholder,
  emails,
  onChange,
}: {
  label: string;
  placeholder?: string;
  emails: string[];
  onChange: (emails: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim().replace(/,$/, "");
    if (!value) return;
    if (/^\S+@\S+\.\S+$/.test(value) && !emails.includes(value)) {
      onChange([...emails, value]);
    }
    setDraft("");
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <div className="ms-input flex min-h-11 flex-wrap items-center gap-1.5 py-1.5">
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--foreground)]"
          >
            {email}
            <button
              type="button"
              onClick={() => onChange(emails.filter((e) => e !== email))}
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) {
              setDraft(v);
              commit();
            } else {
              setDraft(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={emails.length ? "" : (placeholder ?? "name@company.com")}
          className="min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm outline-none"
        />
      </div>
    </div>
  );
}

function TemplatesField({
  duration,
  settings,
  onApply,
}: {
  duration: string;
  settings: RoomSettingsValue;
  onApply: (template: MeetingTemplate) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [draftName, setDraftName] = useState("");

  const templatesQuery = useQuery({
    queryKey: ["meeting-templates"],
    queryFn: listTemplates,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTemplate({
        name: draftName.trim(),
        mode: settings.mode,
        durationMinutes: Number(duration) || 30,
        settings: {
          waitingRoom: settings.waitingRoom,
          maxParticipants: settings.maxParticipants,
          muteOnEntry: settings.muteOnEntry,
          videoOffOnEntry: settings.videoOffOnEntry,
          allowChat: settings.allowChat,
          allowScreenShare: settings.allowScreenShare,
        },
      }),
    onSuccess: () => {
      toast({ variant: "success", title: "Template saved" });
      void queryClient.invalidateQueries({ queryKey: ["meeting-templates"] });
      setDraftName("");
      setIsSaving(false);
    },
    onError: () => toast({ variant: "error", title: "Could not save template" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meeting-templates"] });
    },
    onError: () => toast({ variant: "error", title: "Could not delete template" }),
  });

  const templates = templatesQuery.data ?? [];
  if (!templates.length && !isSaving) {
    return (
      <button
        type="button"
        onClick={() => setIsSaving(true)}
        className="inline-flex items-center gap-1 self-start rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)]"
      >
        <Bookmark className="h-3 w-3" />
        Save current settings as a template
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-[var(--foreground)]">Templates</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {templates.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs text-[var(--foreground)]"
          >
            <button
              type="button"
              onClick={() => onApply(t)}
              className="font-medium hover:underline"
            >
              {t.name}
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(t.id)}
              aria-label={`Delete template ${t.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
        {isSaving ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (draftName.trim()) createMutation.mutate();
                } else if (e.key === "Escape") {
                  setIsSaving(false);
                  setDraftName("");
                }
              }}
              placeholder="Template name"
              className="ms-input h-7 w-36 px-2 py-0 text-xs"
            />
            <Button
              type="button"
              size="sm"
              disabled={!draftName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Save
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsSaving(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] hover:bg-[var(--hover)]"
          >
            <Bookmark className="h-3 w-3" />
            Save current
          </button>
        )}
      </div>
    </div>
  );
}

export function ScheduleMeetingModal({
  open,
  onClose,
  editMeeting,
}: ScheduleMeetingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(editMeeting);
  const isRecurring = Boolean(editMeeting?.recurrenceGroupId);

  const [name, setName] = useState("Team sync");
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState(defaultLocalDateTime);
  const [duration, setDuration] = useState("30");
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [alternateHosts, setAlternateHosts] = useState<string[]>([]);
  const [editScope, setEditScope] = useState<"this" | "all">("this");
  const [settings, setSettings] = useState<RoomSettingsValue>(defaultRoomSettings);
  const [lastScheduled, setLastScheduled] = useState<{
    roomId: string;
    joinCode?: string;
    joinLink?: string;
    name: string;
    description?: string;
    start: Date;
    durationMinutes: number;
  } | null>(null);

  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  const reset = () => {
    setName("Team sync");
    setDescription("");
    setWhen(defaultLocalDateTime());
    setRecurrence("none");
    setInvitedEmails([]);
    setAlternateHosts([]);
    setEditScope("this");
    setSettings(defaultRoomSettings);
  };

  useEffect(() => {
    if (!open) return;
    if (editMeeting) {
      setName(editMeeting.name);
      setDescription(editMeeting.description ?? "");
      setWhen(toLocalDateTimeInput(editMeeting.scheduledAt));
      setDuration(String(editMeeting.durationMinutes ?? 30));
      setInvitedEmails(editMeeting.invitedEmails ?? []);
      setAlternateHosts(editMeeting.alternateHosts ?? []);
      setSettings({
        mode: editMeeting.mode ?? defaultRoomSettings.mode,
        waitingRoom: editMeeting.settings?.waitingRoom ?? defaultRoomSettings.waitingRoom,
        maxParticipants:
          editMeeting.settings?.maxParticipants ?? defaultRoomSettings.maxParticipants,
        muteOnEntry: editMeeting.settings?.muteOnEntry ?? defaultRoomSettings.muteOnEntry,
        videoOffOnEntry:
          editMeeting.settings?.videoOffOnEntry ?? defaultRoomSettings.videoOffOnEntry,
        allowChat: editMeeting.settings?.allowChat ?? defaultRoomSettings.allowChat,
        allowScreenShare:
          editMeeting.settings?.allowScreenShare ?? defaultRoomSettings.allowScreenShare,
        passcode: editMeeting.passcode ?? "",
      });
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editMeeting?.id]);

  const mutation = useMutation({
    mutationFn: async (): Promise<{
      roomId: string;
      name: string;
      joinCode?: string;
      joinLink?: string;
    }> => {
      const settingsPayload = {
        waitingRoom: settings.waitingRoom,
        maxParticipants: settings.maxParticipants,
        muteOnEntry: settings.muteOnEntry,
        videoOffOnEntry: settings.videoOffOnEntry,
        allowChat: settings.allowChat,
        allowScreenShare: settings.allowScreenShare,
      };
      const passcode = settings.passcode.trim() || null;
      if (editMeeting) {
        const room = await updateRoom(editMeeting.roomId, {
          name: name.trim() || "Scheduled meeting",
          description: description.trim(),
          scheduledAt: new Date(when).toISOString(),
          durationMinutes: Number(duration) || 30,
          scope: isRecurring ? editScope : "this",
          settings: settingsPayload,
          invitedEmails,
          alternateHosts,
          passcode,
        });
        return {
          roomId: room.id,
          joinCode: room.joinCode,
          joinLink: room.joinLink,
          name: room.name,
        };
      }
      const meeting = await scheduleMeeting({
        name: name.trim() || "Scheduled meeting",
        scheduledAt: new Date(when).toISOString(),
        durationMinutes: Number(duration) || 30,
        mode: settings.mode,
        description: description.trim() || undefined,
        timezone,
        invitedEmails: invitedEmails.length ? invitedEmails : undefined,
        alternateHosts: alternateHosts.length ? alternateHosts : undefined,
        recurrence,
        settings: settingsPayload,
        passcode,
      });
      return {
        roomId: meeting.roomId,
        joinCode: meeting.joinCode,
        joinLink: meeting.joinLink,
        name: meeting.name,
      };
    },
    onSuccess: (meeting) => {
      void queryClient.invalidateQueries({ queryKey: ["meetings"] });
      if (editMeeting) {
        toast({ variant: "success", title: "Meeting updated" });
        reset();
        onClose();
        return;
      }
      toast({ variant: "success", title: "Meeting scheduled" });
      setLastScheduled({
        roomId: meeting.roomId,
        joinCode: meeting.joinCode,
        joinLink: meeting.joinLink,
        name: meeting.name,
        description: description.trim() || undefined,
        start: new Date(when),
        durationMinutes: Number(duration) || 30,
      });
      reset();
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: isEdit ? "Could not update meeting" : "Could not schedule",
        description: err instanceof Error ? err.message : "Try again",
      });
    },
  });

  if (lastScheduled) {
    const joinLink =
      lastScheduled.joinLink?.startsWith("http")
        ? lastScheduled.joinLink
        : buildMeetingJoinUrl(lastScheduled.joinCode || lastScheduled.roomId);

    return (
      <Modal
        open={open}
        onClose={() => {
          setLastScheduled(null);
          onClose();
        }}
        title="Meeting scheduled"
      >
        <div className="space-y-4">
          <p className="ms-text-muted text-sm">
            <span className="font-medium text-[var(--foreground)]">{lastScheduled.name}</span>{" "}
            is on the calendar. Add it to your calendar app or copy the invite link.
          </p>
          <div
            className="rounded-xl border px-3 py-2.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <p className="ms-text-muted text-[11px] font-semibold uppercase tracking-wide">
              Invite link
            </p>
            <p className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{joinLink}</p>
            <p className="ms-text-muted mt-2 text-[11px] font-semibold uppercase tracking-wide">
              Meeting ID
            </p>
            <p className="mt-1 font-mono text-sm tracking-wide text-[var(--foreground)]">
              {lastScheduled.joinCode || lastScheduled.roomId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                downloadIcsFile(
                  {
                    title: lastScheduled.name,
                    description: lastScheduled.description,
                    location: joinLink,
                    start: lastScheduled.start,
                    durationMinutes: lastScheduled.durationMinutes,
                  },
                  `${lastScheduled.name}.ics`,
                )
              }
            >
              Download .ics
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                window.open(
                  googleCalendarUrl({
                    title: lastScheduled.name,
                    description: lastScheduled.description,
                    location: joinLink,
                    start: lastScheduled.start,
                    durationMinutes: lastScheduled.durationMinutes,
                  }),
                  "_blank",
                )
              }
            >
              Add to Google Calendar
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(joinLink);
                toast({ variant: "success", title: "Invite link copied" });
              }}
            >
              Copy invite link
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setLastScheduled(null);
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit meeting" : "Schedule a meeting"}
      className="max-w-3xl"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Input
              label="Topic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Date & time"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Duration
                </span>
                <select
                  className="ms-select"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                </select>
              </label>
            </div>
            {!isEdit ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[var(--foreground)]">Repeat</span>
                <select
                  className="ms-select"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </label>
            ) : null}
            {timezone ? (
              <p className="ms-text-muted text-xs">Timezone: {timezone}</p>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                Description (optional)
              </span>
              <textarea
                className="ms-input min-h-20 resize-y py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agenda, links, or notes for attendees"
                maxLength={2000}
              />
            </label>
            <EmailChipsField
              label="Invite people (optional)"
              emails={invitedEmails}
              onChange={setInvitedEmails}
            />
            <div className="space-y-1">
              <EmailChipsField
                label="Alternate hosts (optional)"
                placeholder="cohost@company.com"
                emails={alternateHosts}
                onChange={setAlternateHosts}
              />
              <p className="ms-text-muted text-xs">
                Alternate hosts can start this meeting and have full host controls,
                even before you join.
              </p>
            </div>
          </div>
        </div>

        <TemplatesField
          duration={duration}
          settings={settings}
          onApply={(template) => {
            setDuration(String(template.durationMinutes));
            setSettings({
              mode: isEdit ? settings.mode : template.mode,
              waitingRoom: template.settings.waitingRoom ?? defaultRoomSettings.waitingRoom,
              maxParticipants:
                template.settings.maxParticipants ?? defaultRoomSettings.maxParticipants,
              muteOnEntry: template.settings.muteOnEntry ?? defaultRoomSettings.muteOnEntry,
              videoOffOnEntry:
                template.settings.videoOffOnEntry ?? defaultRoomSettings.videoOffOnEntry,
              allowChat: template.settings.allowChat ?? defaultRoomSettings.allowChat,
              allowScreenShare:
                template.settings.allowScreenShare ?? defaultRoomSettings.allowScreenShare,
              passcode: settings.passcode,
            });
            toast({ variant: "success", title: `Applied "${template.name}"` });
          }}
        />

        <RoomSettingsFields value={settings} onChange={setSettings} disableModeSelector={isEdit} />

        {isEdit && isRecurring ? (
          <div>
            <span className="text-sm font-medium text-[var(--foreground)]">
              Apply changes to
            </span>
            <div className="mt-1.5 flex gap-3 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={editScope === "this"}
                  onChange={() => setEditScope("this")}
                />
                This event
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={editScope === "all"}
                  onChange={() => setEditScope("all")}
                />
                This and following events
              </label>
            </div>
            {editScope === "all" ? (
              <p className="ms-text-muted mt-1.5 text-xs">
                Topic, description, and duration apply to every event in the series.
                The date &amp; time only apply to this occurrence.
              </p>
            ) : null}
          </div>
        ) : null}

        {!isEdit ? (
          <p className="ms-text-muted text-xs">
            Hosted by {user?.name ?? "you"}. Invitees can join from the Meetings list.
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEdit ? "Save changes" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
