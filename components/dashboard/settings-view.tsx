"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/use-auth";
import { usePreferencesStore } from "@/lib/store/preferences-store";
import { useMediaDevices } from "@/lib/hooks/use-media-devices";
import { LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PageBody } from "./page-inset";
import { PageHeader } from "./page-header";
import { updateProfile, uploadAvatar } from "@/lib/api";
import { useToast } from "@/lib/hooks/use-toast";
import { ApiError } from "@/lib/api/client";

export function SettingsView() {
  const { user, isLoading, logout } = useAuth({ required: true });
  const { devices, permissionError } = useMediaDevices();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setTitle(user.title ?? "");
    }
  }, [user]);

  const preferredCameraId = usePreferencesStore((s) => s.preferredCameraId);
  const preferredMicId = usePreferencesStore((s) => s.preferredMicId);
  const preferredSpeakerId = usePreferencesStore((s) => s.preferredSpeakerId);
  const defaultVideoEnabled = usePreferencesStore((s) => s.defaultVideoEnabled);
  const defaultAudioEnabled = usePreferencesStore((s) => s.defaultAudioEnabled);
  const setPreferredCameraId = usePreferencesStore((s) => s.setPreferredCameraId);
  const setPreferredMicId = usePreferencesStore((s) => s.setPreferredMicId);
  const setPreferredSpeakerId = usePreferencesStore((s) => s.setPreferredSpeakerId);
  const setDefaultVideoEnabled = usePreferencesStore((s) => s.setDefaultVideoEnabled);
  const setDefaultAudioEnabled = usePreferencesStore((s) => s.setDefaultAudioEnabled);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        name: name.trim(),
        title: title.trim() || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      toast({ variant: "success", title: "Profile saved" });
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Could not save profile",
        description: err instanceof ApiError ? err.message : "Try again",
      });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (updated) => {
      queryClient.setQueryData(["auth", "me"], updated);
      toast({ variant: "success", title: "Avatar updated" });
    },
    onError: (err: unknown) => {
      toast({
        variant: "error",
        title: "Avatar upload failed",
        description: err instanceof ApiError ? err.message : "Configure R2 storage",
      });
    },
  });

  if (isLoading || !user) {
    return <LoadingState label="Loading settings…" />;
  }

  return (
    <PageBody className="space-y-6">
      <PageHeader
        title="Settings"
        description="Profile, appearance, devices, and account preferences."
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="ms-panel space-y-4 p-5">
            <p className="ms-section-label">Profile</p>
            <h3 className="ms-text-heading -mt-1 text-sm font-semibold tracking-tight">
              How you appear to others
            </h3>
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-sm font-semibold"
                style={{ background: "var(--surface-muted)", color: "var(--foreground)" }}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  user.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <label className="cursor-pointer text-sm font-medium text-[var(--accent)]">
                Change avatar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) avatarMutation.mutate(file);
                  }}
                />
              </label>
            </div>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Product designer"
            />
            <Input label="Email" value={user.email} readOnly />
            <Button
              onClick={() => saveMutation.mutate()}
              isLoading={saveMutation.isPending}
              disabled={!name.trim()}
            >
              Save profile
            </Button>
          </section>

          <section className="ms-panel space-y-4 p-5">
            <p className="ms-section-label">Appearance</p>
            <h3 className="ms-text-heading -mt-1 text-sm font-semibold tracking-tight">
              Theme preference
            </h3>
            <p className="ms-text-muted text-sm">
              Light theme is default. Switch to dark anytime — applied across the whole app.
            </p>
            <div className="flex flex-wrap gap-2">
              <ThemeToggle showLabel size="md" />
            </div>
          </section>

          <section className="ms-panel p-5">
            <p className="ms-section-label">Account</p>
            <h3 className="ms-text-heading mt-1 text-sm font-semibold tracking-tight">
              Session
            </h3>
            <p className="ms-text-muted mt-1 text-sm">
              Sign out of MeetSpace on this device.
            </p>
            <Button variant="danger" className="mt-4" onClick={() => logout()}>
              Log out
            </Button>
          </section>
        </div>

        <div className="space-y-6">
          <section className="ms-panel space-y-4 p-5">
            <p className="ms-section-label">Devices</p>
            <h3 className="ms-text-heading -mt-1 text-sm font-semibold tracking-tight">
              Defaults for every meeting
            </h3>
            {permissionError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                {permissionError}
              </p>
            ) : null}

            {(
              [
                ["Camera", preferredCameraId, setPreferredCameraId, devices.cameras],
                ["Microphone", preferredMicId, setPreferredMicId, devices.microphones],
                ["Speaker", preferredSpeakerId, setPreferredSpeakerId, devices.speakers],
              ] as const
            ).map(([label, value, setter, list]) => (
              <label key={label} className="block space-y-1.5">
                <span className="ms-text-muted text-sm">{label}</span>
                <select
                  className="ms-select"
                  value={value ?? ""}
                  onChange={(e) => setter(e.target.value || null)}
                >
                  <option value="">System default</option>
                  {list.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || d.deviceId}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            <label className="ms-text-muted flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={defaultVideoEnabled}
                onChange={(e) => setDefaultVideoEnabled(e.target.checked)}
              />
              Start with camera on
            </label>
            <label className="ms-text-muted flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={defaultAudioEnabled}
                onChange={(e) => setDefaultAudioEnabled(e.target.checked)}
              />
              Start with microphone on
            </label>
          </section>
        </div>
      </div>
    </PageBody>
  );
}
