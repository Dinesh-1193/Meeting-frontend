import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BackgroundEffect } from "@/lib/livekit/background-effects";

interface PreferencesState {
  preferredCameraId: string | null;
  preferredMicId: string | null;
  preferredSpeakerId: string | null;
  defaultVideoEnabled: boolean;
  defaultAudioEnabled: boolean;
  backgroundEffect: BackgroundEffect;
  /** Data URL of the user's uploaded custom background image, if any. */
  customBackgroundImage: string | null;
  setPreferredCameraId: (id: string | null) => void;
  setPreferredMicId: (id: string | null) => void;
  setPreferredSpeakerId: (id: string | null) => void;
  setDefaultVideoEnabled: (value: boolean) => void;
  setDefaultAudioEnabled: (value: boolean) => void;
  setBackgroundEffect: (effect: BackgroundEffect) => void;
  setCustomBackgroundImage: (image: string | null) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferredCameraId: null,
      preferredMicId: null,
      preferredSpeakerId: null,
      defaultVideoEnabled: true,
      defaultAudioEnabled: true,
      backgroundEffect: "none",
      customBackgroundImage: null,
      setPreferredCameraId: (id) => set({ preferredCameraId: id }),
      setPreferredMicId: (id) => set({ preferredMicId: id }),
      setPreferredSpeakerId: (id) => set({ preferredSpeakerId: id }),
      setDefaultVideoEnabled: (value) => set({ defaultVideoEnabled: value }),
      setDefaultAudioEnabled: (value) => set({ defaultAudioEnabled: value }),
      setBackgroundEffect: (effect) => set({ backgroundEffect: effect }),
      setCustomBackgroundImage: (image) => set({ customBackgroundImage: image }),
    }),
    { name: "meeting-preferences" },
  ),
);
