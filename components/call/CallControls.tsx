"use client";

import { useEffect, useRef, useState } from "react";
import { Track, type LocalVideoTrack } from "livekit-client";
import {
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  Circle,
  Grid2x2,
  Info,
  Keyboard,
  LayoutGrid,
  Lock,
  Mic,
  MicOff,
  MonitorUp,
  MoreVertical,
  PanelRight,
  PhoneOff,
  PictureInPicture2,
  Settings,
  Unlock,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceSettingsModal } from "./DeviceSettingsModal";
import { MeetingInfoModal } from "./MeetingInfoModal";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { applyBackgroundEffect } from "@/lib/livekit/background-effects";
import { ReactionsBar } from "./ReactionsBar";
import { RaiseHandButton } from "./RaiseHandButton";
import { useCallStore } from "@/lib/store/call-store";
import { useCallKeyboardShortcuts } from "@/lib/hooks/use-call-keyboard-shortcuts";
import { useToast } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils/cn";
import {
  getRecordingStatus,
  getRoom,
  muteAllParticipants,
  setMeetingLocked,
  startRecording,
  stopRecording,
} from "@/lib/api/rooms";
import { ApiError } from "@/lib/api/client";
import type { CallLayout, ParticipantRole } from "@/types";

interface CallControlsProps {
  roomId: string;
  onLeave: () => void;
  isHost?: boolean;
  role?: ParticipantRole;
  className?: string;
}

const layoutOptions: { value: CallLayout; label: string; icon: typeof LayoutGrid }[] = [
  { value: "grid", label: "Tiled", icon: LayoutGrid },
  { value: "speaker", label: "Spotlight", icon: PictureInPicture2 },
  { value: "sidebar", label: "Sidebar", icon: PanelRight },
];

export function CallControls({ roomId, onLeave, isHost, role, className }: CallControlsProps) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canPublish = role !== "attendee";
  const isModerator = Boolean(isHost) || role === "cohost";

  const isMoreMenuOpen = useCallStore((s) => s.isMoreMenuOpen);
  const isDeviceSettingsOpen = useCallStore((s) => s.isDeviceSettingsOpen);
  const isPollsOpen = useCallStore((s) => s.isPollsOpen);
  const isRecording = useCallStore((s) => s.isRecording);
  const isMeetingInfoOpen = useCallStore((s) => s.isMeetingInfoOpen);
  const isShortcutsOpen = useCallStore((s) => s.isShortcutsOpen);
  const layout = useCallStore((s) => s.layout);
  const setMoreMenuOpen = useCallStore((s) => s.setMoreMenuOpen);
  const setPollsOpen = useCallStore((s) => s.setPollsOpen);
  const setBreakoutOpen = useCallStore((s) => s.setBreakoutOpen);
  const setDeviceSettingsOpen = useCallStore((s) => s.setDeviceSettingsOpen);
  const setMeetingInfoOpen = useCallStore((s) => s.setMeetingInfoOpen);
  const setShortcutsOpen = useCallStore((s) => s.setShortcutsOpen);
  const setLayout = useCallStore((s) => s.setLayout);
  const setRecording = useCallStore((s) => s.setRecording);

  const [isLayoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const recordingQuery = useQuery({
    queryKey: ["recording-status", roomId],
    queryFn: () => getRecordingStatus(roomId),
    refetchInterval: 6000,
  });

  const roomQuery = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => getRoom(roomId),
    refetchInterval: 8000,
  });
  const allowScreenShare = roomQuery.data?.settings?.allowScreenShare !== false;
  const isLocked = Boolean(roomQuery.data?.isLocked);

  const muteAllMutation = useMutation({
    mutationFn: () => muteAllParticipants(roomId),
    onSuccess: () => toast({ variant: "info", title: "Everyone has been muted" }),
    onError: () => toast({ variant: "error", title: "Could not mute everyone" }),
  });

  const lockMutation = useMutation({
    mutationFn: (locked: boolean) => setMeetingLocked(roomId, locked),
    onSuccess: (_data, locked) => {
      toast({ variant: "info", title: locked ? "Meeting locked" : "Meeting unlocked" });
      void queryClient.invalidateQueries({ queryKey: ["room", roomId] });
    },
    onError: () => toast({ variant: "error", title: "Could not update meeting lock" }),
  });

  const wasRecordingRef = useRef<boolean | null>(null);
  useEffect(() => {
    const nowRecording = recordingQuery.data?.status === "processing";
    setRecording(nowRecording);
    if (wasRecordingRef.current === false && nowRecording) {
      toast({
        variant: "info",
        title: "Recording started",
        description: "This meeting is now being recorded.",
      });
    }
    wasRecordingRef.current = nowRecording;
  }, [recordingQuery.data?.status, setRecording, toast]);

  const startRecordingMutation = useMutation({
    mutationFn: () => startRecording(roomId),
    onSuccess: () => {
      // The "Recording started" toast fires for everyone via the poll-based
      // watcher above (Meet announces recording to the whole room, not just
      // whoever clicked start) — no separate toast needed here.
      void queryClient.invalidateQueries({ queryKey: ["recording-status", roomId] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError ? err.message : "Could not start recording.";
      toast({ variant: "error", title: "Recording failed", description: message });
    },
  });

  const stopRecordingMutation = useMutation({
    mutationFn: () => stopRecording(roomId),
    onSuccess: () => {
      toast({ variant: "info", title: "Recording stopped" });
      void queryClient.invalidateQueries({ queryKey: ["recording-status", roomId] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError ? err.message : "Could not stop recording.";
      toast({ variant: "error", title: "Recording failed", description: message });
    },
  });

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMoreMenuOpen(false);
        setLayoutMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [setMoreMenuOpen]);

  const toggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch {
      toast({
        variant: "error",
        title: "Microphone unavailable",
        description: "Check device permissions and try again.",
      });
    }
  };

  const toggleCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } catch {
      toast({
        variant: "error",
        title: "Camera unavailable",
        description: "Check device permissions and try again.",
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
      } else {
        // audio: true so the browser's own share picker shows its "Share audio" toggle.
        await localParticipant.setScreenShareEnabled(true, { audio: true });
      }
    } catch {
      toast({
        variant: "error",
        title: "Screen share failed",
        description: "Your browser may have blocked screen capture.",
      });
    }
  };

  const canScreenShare = allowScreenShare || isModerator;

  useCallKeyboardShortcuts({
    canPublish,
    canScreenShare,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  });

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/90 px-3 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl ring-1 ring-white/5",
            className,
          )}
          role="toolbar"
          aria-label="Call controls"
        >
          {canPublish ? (
            <>
              <Button
                variant={isMicrophoneEnabled ? "secondary" : "danger"}
                size="icon"
                className="rounded-full"
                onClick={toggleMic}
                aria-label={isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"}
              >
                {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </Button>

              <Button
                variant={isCameraEnabled ? "secondary" : "danger"}
                size="icon"
                className="rounded-full"
                onClick={toggleCamera}
                aria-label={isCameraEnabled ? "Turn camera off" : "Turn camera on"}
              >
                {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
              </Button>

              {allowScreenShare || isModerator ? (
                <Button
                  variant={isScreenShareEnabled ? "primary" : "secondary"}
                  size="icon"
                  className="rounded-full"
                  onClick={toggleScreenShare}
                  aria-label={isScreenShareEnabled ? "Stop screen share" : "Start screen share"}
                >
                  <MonitorUp className="h-4 w-4" />
                </Button>
              ) : null}
            </>
          ) : (
            <RaiseHandButton />
          )}

          <ReactionsBar />

          <Button
            variant={isPollsOpen ? "primary" : "secondary"}
            size="icon"
            className="rounded-full"
            onClick={() => setPollsOpen(!isPollsOpen)}
            aria-label="Toggle polls and Q&A"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>

          <div className="relative" ref={menuRef}>
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full"
              onClick={() => {
                setMoreMenuOpen(!isMoreMenuOpen);
                setLayoutMenuOpen(false);
              }}
              aria-label="More options"
              aria-expanded={isMoreMenuOpen}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {isMoreMenuOpen ? (
              <div className="absolute bottom-14 right-0 z-20 min-w-[240px] overflow-hidden rounded-xl bg-white py-1.5 text-gray-800 shadow-2xl">
                {canPublish ? (
                  isLayoutMenuOpen ? (
                    <div className="py-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
                        onClick={() => setLayoutMenuOpen(false)}
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Change layout
                      </button>
                      {layoutOptions.map((opt) => {
                        const Icon = opt.icon;
                        const active = layout === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-100"
                            onClick={() => {
                              setLayout(opt.value);
                              setLayoutMenuOpen(false);
                              setMoreMenuOpen(false);
                            }}
                          >
                            <Icon className="h-4 w-4 text-gray-500" />
                            <span className="flex-1">{opt.label}</span>
                            {active ? <Check className="h-4 w-4 text-[#1a73e8]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100"
                      onClick={() => setLayoutMenuOpen(true)}
                    >
                      <LayoutGrid className="h-4 w-4 text-gray-500" />
                      <span className="flex-1">Change layout</span>
                      <span className="text-xs text-gray-400">
                        {layoutOptions.find((o) => o.value === layout)?.label}
                      </span>
                    </button>
                  )
                ) : null}

                {!isLayoutMenuOpen ? (
                  <>
                    {canPublish ? <div className="my-1 border-t border-gray-100" /> : null}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setDeviceSettingsOpen(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Settings className="h-4 w-4 text-gray-500" />
                      Device settings
                    </button>
                    {canPublish ? (
                      <RaiseHandMenuItem onDone={() => setMoreMenuOpen(false)} />
                    ) : null}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setMeetingInfoOpen(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Info className="h-4 w-4 text-gray-500" />
                      Meeting info
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        setShortcutsOpen(true);
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Keyboard className="h-4 w-4 text-gray-500" />
                      Keyboard shortcuts
                    </button>
                    {isModerator ? (
                      <>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          type="button"
                          disabled={muteAllMutation.isPending}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
                          onClick={() => {
                            muteAllMutation.mutate();
                            setMoreMenuOpen(false);
                          }}
                        >
                          <MicOff className="h-4 w-4 text-gray-500" />
                          Mute everyone
                        </button>
                        <button
                          type="button"
                          disabled={lockMutation.isPending}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
                          onClick={() => {
                            lockMutation.mutate(!isLocked);
                            setMoreMenuOpen(false);
                          }}
                        >
                          {isLocked ? (
                            <Unlock className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Lock className="h-4 w-4 text-gray-500" />
                          )}
                          {isLocked ? "Unlock meeting" : "Lock meeting"}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100"
                          onClick={() => {
                            setBreakoutOpen(true);
                            setMoreMenuOpen(false);
                          }}
                        >
                          <Grid2x2 className="h-4 w-4 text-gray-500" />
                          Breakout rooms
                        </button>
                      </>
                    ) : null}
                    {isHost ? (
                      <>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          type="button"
                          disabled={
                            startRecordingMutation.isPending || stopRecordingMutation.isPending
                          }
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
                          onClick={() => {
                            if (isRecording) {
                              stopRecordingMutation.mutate();
                            } else {
                              startRecordingMutation.mutate();
                            }
                            setMoreMenuOpen(false);
                          }}
                        >
                          <Circle
                            className={cn(
                              "h-4 w-4",
                              isRecording ? "fill-red-500 text-red-500" : "text-gray-500",
                            )}
                          />
                          {isRecording ? "Stop recording" : "Start recording"}
                        </button>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <Button
            variant="danger"
            size="icon"
            className="w-16 rounded-full"
            onClick={onLeave}
            aria-label="Leave call"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MeetingInfoModal
        roomId={roomId}
        open={isMeetingInfoOpen}
        onClose={() => setMeetingInfoOpen(false)}
        isRecording={isRecording}
      />

      <KeyboardShortcutsModal
        open={isShortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        canPublish={canPublish}
        canScreenShare={canScreenShare}
      />

      <DeviceSettingsModal
        open={isDeviceSettingsOpen}
        onClose={() => setDeviceSettingsOpen(false)}
        onApply={async ({ cameraId, micId, backgroundEffect, customBackgroundImage }) => {
          try {
            if (cameraId) {
              await room.switchActiveDevice("videoinput", cameraId);
            }
            if (micId) {
              await room.switchActiveDevice("audioinput", micId);
            }
            // Ensure camera/mic track sources stay aligned.
            if (isCameraEnabled) {
              await localParticipant.setCameraEnabled(true, {
                deviceId: cameraId ?? undefined,
              });
            }
            if (isMicrophoneEnabled) {
              await localParticipant.setMicrophoneEnabled(true, {
                deviceId: micId ?? undefined,
              });
            }
            const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera)
              ?.track as LocalVideoTrack | undefined;
            if (cameraTrack) {
              await applyBackgroundEffect(cameraTrack, backgroundEffect, customBackgroundImage);
            }
          } catch {
            toast({
              variant: "error",
              title: "Could not switch devices",
            });
          }
        }}
      />
    </>
  );
}

/** Raise-hand also lives in the "more" menu for hosts/panelists on small screens where the toolbar is tight. */
function RaiseHandMenuItem({ onDone }: { onDone: () => void }) {
  return <RaiseHandButton asMenuItem onToggle={onDone} />;
}
