"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { createRoom } from "@/lib/api";
import { LoadingState } from "@/components/ui/states";
import { useAuth } from "@/lib/hooks/use-auth";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { meetingLobbyPath } from "@/lib/utils/format";
import {
  RoomSettingsFields,
  type RoomSettingsValue,
} from "@/components/dashboard/room-settings-fields";

export default function NewMeetingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth({ required: true });
  const { toast } = useToast();
  const [settings, setSettings] = useState<RoomSettingsValue>({
    mode: "conference",
    waitingRoom: false,
    maxParticipants: 100,
    muteOnEntry: false,
    videoOffOnEntry: false,
    allowChat: true,
    allowScreenShare: true,
    passcode: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      createRoom({
        name: `${user?.name ?? "Meeting"}'s room`,
        mode: settings.mode,
        settings: {
          waitingRoom: settings.waitingRoom,
          maxParticipants: settings.maxParticipants,
          muteOnEntry: settings.muteOnEntry,
          videoOffOnEntry: settings.videoOffOnEntry,
          allowChat: settings.allowChat,
          allowScreenShare: settings.allowScreenShare,
        },
        passcode: settings.passcode.trim() || null,
      }),
    onSuccess: (room) => {
      router.replace(meetingLobbyPath(room.joinCode || room.id));
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError ? err.message : "Could not create meeting.";
      toast({ variant: "error", title: "Create failed", description: message });
    },
  });

  if (isLoading || !user) {
    return <LoadingState className="min-h-screen" label="Checking session…" />;
  }

  if (mutation.isPending) {
    return <LoadingState className="min-h-screen" label="Creating meeting…" />;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="ms-text-heading text-xl font-semibold">Start a new meeting</h1>
        <p className="ms-text-muted mt-1 text-sm">
          Choose how this meeting should run before you start it.
        </p>
      </div>

      <RoomSettingsFields value={settings} onChange={setSettings} />

      {mutation.isError ? (
        <p className="text-sm text-[var(--danger)]">
          Unable to create a room right now. Try again.
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Cancel
        </Button>
        <Button onClick={() => mutation.mutate()}>Start meeting</Button>
      </div>
    </div>
  );
}
