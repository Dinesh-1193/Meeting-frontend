"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { RoomMode } from "@/types";

export interface RoomSettingsValue {
  mode: RoomMode;
  waitingRoom: boolean;
  maxParticipants: number;
  muteOnEntry: boolean;
  videoOffOnEntry: boolean;
  allowChat: boolean;
  allowScreenShare: boolean;
  passcode: string;
}

interface RoomSettingsFieldsProps {
  value: RoomSettingsValue;
  onChange: (value: RoomSettingsValue) => void;
  /** Meeting type can't be changed once a room exists — hide the picker when editing. */
  disableModeSelector?: boolean;
}

const modeOptions: { value: RoomMode; label: string; description: string; defaultCap: number }[] = [
  {
    value: "conference",
    label: "Conference",
    description: "Everyone can turn on camera and mic. Best for small groups.",
    defaultCap: 100,
  },
  {
    value: "webinar",
    label: "Webinar",
    description: "Host and panelists present; attendees watch and chat. Scales up to 1000.",
    defaultCap: 1000,
  },
];

const meetingOptions: {
  key: "muteOnEntry" | "videoOffOnEntry" | "allowChat" | "allowScreenShare";
  label: string;
}[] = [
  { key: "muteOnEntry", label: "Mute participants on entry" },
  { key: "videoOffOnEntry", label: "Turn off participant cameras on entry" },
  { key: "allowChat", label: "Allow in-meeting chat" },
  { key: "allowScreenShare", label: "Allow participants to share their screen" },
];

export function RoomSettingsFields({
  value,
  onChange,
  disableModeSelector,
}: RoomSettingsFieldsProps) {
  return (
    <div className="space-y-4">
      {!disableModeSelector ? (
        <div>
          <span className="text-sm font-medium text-[var(--foreground)]">Meeting type</span>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {modeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "rounded-xl border p-3 text-left text-sm transition",
                  value.mode === opt.value
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                    : "border-[var(--border)] hover:bg-[var(--hover)]",
                )}
                onClick={() =>
                  onChange({ ...value, mode: opt.value, maxParticipants: opt.defaultCap })
                }
              >
                <p className="font-medium text-[var(--foreground)]">{opt.label}</p>
                <p className="ms-text-muted mt-0.5 text-xs">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Input
        label="Max participants"
        type="number"
        min={2}
        max={1000}
        value={value.maxParticipants}
        onChange={(e) =>
          onChange({
            ...value,
            maxParticipants: Math.max(2, Math.min(1000, Number(e.target.value) || 2)),
          })
        }
      />

      <div className="space-y-2">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Security &amp; meeting options
        </span>
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[var(--border)]"
            checked={value.waitingRoom}
            onChange={(e) => onChange({ ...value, waitingRoom: e.target.checked })}
          />
          Waiting room — host admits each participant before they join
        </label>
        <Input
          label="Passcode (optional)"
          placeholder="Leave blank for no passcode"
          maxLength={20}
          value={value.passcode}
          onChange={(e) => onChange({ ...value, passcode: e.target.value })}
        />
        {meetingOptions.map((opt) => (
          <label
            key={opt.key}
            className="flex items-center gap-2 text-sm text-[var(--foreground)]"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[var(--border)]"
              checked={value[opt.key]}
              onChange={(e) => onChange({ ...value, [opt.key]: e.target.checked })}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
