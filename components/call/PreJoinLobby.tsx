"use client";

import { useEffect, useRef, useState } from "react";
import {
  createLocalAudioTrack,
  createLocalVideoTrack,
  type LocalAudioTrack,
  type LocalVideoTrack,
} from "livekit-client";
import { Lock, Mic, MicOff, Settings, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeviceSettingsModal } from "./DeviceSettingsModal";
import { useMediaDevices } from "@/lib/hooks/use-media-devices";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { applyBackgroundEffect } from "@/lib/livekit/background-effects";

interface PreJoinLobbyProps {
  roomName?: string;
  displayName?: string;
  allowEditDisplayName?: boolean;
  requiresPasscode?: boolean;
  passcodeError?: string | null;
  onJoin: (options: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    cameraId: string | null;
    micId: string | null;
    passcode: string;
    displayName: string;
  }) => void | Promise<void>;
  isJoining?: boolean;
}

export function PreJoinLobby({
  roomName,
  displayName: initialDisplayName,
  allowEditDisplayName,
  requiresPasscode,
  passcodeError,
  onJoin,
  isJoining,
}: PreJoinLobbyProps) {
  const [passcode, setPasscode] = useState("");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTrack, setVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const preferredCameraId = usePreferencesStore((s) => s.preferredCameraId);
  const preferredMicId = usePreferencesStore((s) => s.preferredMicId);
  const defaultVideoEnabled = usePreferencesStore((s) => s.defaultVideoEnabled);
  const defaultAudioEnabled = usePreferencesStore((s) => s.defaultAudioEnabled);
  const backgroundEffect = usePreferencesStore((s) => s.backgroundEffect);
  const customBackgroundImage = usePreferencesStore((s) => s.customBackgroundImage);
  const { permissionError } = useMediaDevices();

  useEffect(() => {
    setVideoEnabled(defaultVideoEnabled);
    setAudioEnabled(defaultAudioEnabled);
  }, [defaultVideoEnabled, defaultAudioEnabled]);

  useEffect(() => {
    let cancelled = false;
    let currentVideo: LocalVideoTrack | null = null;
    let currentAudio: LocalAudioTrack | null = null;

    async function setup() {
      setPreviewError(null);
      try {
        if (videoEnabled) {
          currentVideo = await createLocalVideoTrack({
            deviceId: preferredCameraId ?? undefined,
          });
          if (cancelled) {
            currentVideo.stop();
            return;
          }
          setVideoTrack(currentVideo);
          if (videoRef.current) {
            currentVideo.attach(videoRef.current);
          }
        } else {
          setVideoTrack(null);
        }

        if (audioEnabled) {
          currentAudio = await createLocalAudioTrack({
            deviceId: preferredMicId ?? undefined,
          });
          if (cancelled) {
            currentAudio.stop();
            return;
          }
          setAudioTrack(currentAudio);
        } else {
          setAudioTrack(null);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to access camera or microphone.";
        setPreviewError(
          message.includes("Permission") || message.includes("NotAllowed")
            ? "Camera or microphone access was denied. Check browser permissions, then try again."
            : message,
        );
      }
    }

    void setup();

    return () => {
      cancelled = true;
      currentVideo?.stop();
      currentAudio?.stop();
      setVideoTrack(null);
      setAudioTrack(null);
    };
  }, [videoEnabled, audioEnabled, preferredCameraId, preferredMicId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack) return;
    videoTrack.attach(el);
    return () => {
      videoTrack.detach(el);
    };
  }, [videoTrack]);

  useEffect(() => {
    if (!videoTrack) return;
    void applyBackgroundEffect(videoTrack, backgroundEffect, customBackgroundImage);
  }, [videoTrack, backgroundEffect, customBackgroundImage]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
          <Video className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-400">
          Ready to join
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          {roomName || "Meeting lobby"}
        </h1>
        {displayName && !allowEditDisplayName ? (
          <p className="mt-1.5 text-sm text-slate-400">Joining as {displayName}</p>
        ) : null}
      </div>

      {allowEditDisplayName ? (
        <div className="mx-auto w-full max-w-xs">
          <Input
            label="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How others will see you"
          />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900/90 shadow-2xl shadow-black/40 ring-1 ring-white/5">
        <div className="relative aspect-video bg-gradient-to-b from-slate-950 to-slate-900">
          {videoEnabled && videoTrack ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover mirror"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
              <VideoOff className="h-8 w-8 opacity-50" />
              <span className="text-sm">Camera is off</span>
            </div>
          )}
        </div>

        {(previewError || permissionError) && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {previewError || permissionError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-800 p-4">
          <Button
            variant={audioEnabled ? "secondary" : "danger"}
            className="rounded-xl"
            onClick={() => setAudioEnabled((v) => !v)}
            aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {audioEnabled ? "Mic on" : "Mic off"}
          </Button>
          <Button
            variant={videoEnabled ? "secondary" : "danger"}
            className="rounded-xl"
            onClick={() => setVideoEnabled((v) => !v)}
            aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            {videoEnabled ? "Camera on" : "Camera off"}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-slate-700 bg-slate-950/50"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open device settings"
          >
            <Settings className="h-4 w-4" />
            Devices
          </Button>
        </div>
      </div>

      {requiresPasscode ? (
        <div className="mx-auto w-full max-w-xs space-y-1.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-200">
            <Lock className="h-3.5 w-3.5" />
            Meeting passcode
          </span>
          <Input
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter passcode"
            autoFocus
          />
          {passcodeError ? (
            <p className="text-xs text-red-400">{passcodeError}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-center">
        <Button
          size="lg"
          className="min-w-[200px] rounded-2xl shadow-lg shadow-sky-600/25"
          isLoading={isJoining}
          disabled={
            (requiresPasscode ? passcode.trim().length === 0 : false) ||
            (allowEditDisplayName ? displayName.trim().length === 0 : false)
          }
          onClick={async () => {
            videoTrack?.stop();
            audioTrack?.stop();
            await onJoin({
              audioEnabled,
              videoEnabled,
              cameraId: preferredCameraId,
              micId: preferredMicId,
              passcode,
              displayName: displayName.trim() || initialDisplayName || "Guest",
            });
          }}
        >
          Join now
        </Button>
      </div>

      <DeviceSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
