import { create } from "zustand";
import type { CallLayout } from "@/types";

interface CallUIState {
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isPollsOpen: boolean;
  isBreakoutOpen: boolean;
  isMoreMenuOpen: boolean;
  isReactionsOpen: boolean;
  isDeviceSettingsOpen: boolean;
  isMeetingInfoOpen: boolean;
  isShortcutsOpen: boolean;
  layout: CallLayout;
  pinnedIds: string[];
  /** True while the local user has an active manual pin — remote spotlight stops overriding them. */
  isPinnedLocally: boolean;
  unreadChatCount: number;
  isReconnecting: boolean;
  isRecording: boolean;
  gridPage: number;
  raisedHands: Record<string, boolean>;
  isHandRaised: boolean;
  setChatOpen: (open: boolean) => void;
  setParticipantsOpen: (open: boolean) => void;
  setPollsOpen: (open: boolean) => void;
  setBreakoutOpen: (open: boolean) => void;
  setMoreMenuOpen: (open: boolean) => void;
  setReactionsOpen: (open: boolean) => void;
  setDeviceSettingsOpen: (open: boolean) => void;
  setMeetingInfoOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setLayout: (layout: CallLayout) => void;
  togglePin: (id: string) => void;
  applyRemoteSpotlight: (ids: string[]) => void;
  setGridPage: (page: number) => void;
  setHandRaised: (identity: string, raised: boolean) => void;
  setLocalHandRaised: (raised: boolean) => void;
  clearRaisedHands: () => void;
  incrementUnreadChat: () => void;
  clearUnreadChat: () => void;
  setReconnecting: (value: boolean) => void;
  setRecording: (value: boolean) => void;
  reset: () => void;
}

const initialState = {
  isChatOpen: false,
  isParticipantsOpen: false,
  isPollsOpen: false,
  isBreakoutOpen: false,
  isMoreMenuOpen: false,
  isReactionsOpen: false,
  isDeviceSettingsOpen: false,
  isMeetingInfoOpen: false,
  isShortcutsOpen: false,
  layout: "grid" as CallLayout,
  pinnedIds: [] as string[],
  isPinnedLocally: false,
  unreadChatCount: 0,
  isReconnecting: false,
  isRecording: false,
  gridPage: 0,
  raisedHands: {} as Record<string, boolean>,
  isHandRaised: false,
};

export const useCallStore = create<CallUIState>((set) => ({
  ...initialState,
  setChatOpen: (open) =>
    set((state) => ({
      isChatOpen: open,
      unreadChatCount: open ? 0 : state.unreadChatCount,
      isParticipantsOpen: open ? false : state.isParticipantsOpen,
      isPollsOpen: open ? false : state.isPollsOpen,
      isBreakoutOpen: open ? false : state.isBreakoutOpen,
    })),
  setParticipantsOpen: (open) =>
    set((state) => ({
      isParticipantsOpen: open,
      isChatOpen: open ? false : state.isChatOpen,
      isPollsOpen: open ? false : state.isPollsOpen,
      isBreakoutOpen: open ? false : state.isBreakoutOpen,
    })),
  setPollsOpen: (open) =>
    set((state) => ({
      isPollsOpen: open,
      isChatOpen: open ? false : state.isChatOpen,
      isParticipantsOpen: open ? false : state.isParticipantsOpen,
      isBreakoutOpen: open ? false : state.isBreakoutOpen,
    })),
  setBreakoutOpen: (open) =>
    set((state) => ({
      isBreakoutOpen: open,
      isChatOpen: open ? false : state.isChatOpen,
      isParticipantsOpen: open ? false : state.isParticipantsOpen,
      isPollsOpen: open ? false : state.isPollsOpen,
    })),
  setMoreMenuOpen: (open) => set({ isMoreMenuOpen: open }),
  setReactionsOpen: (open) => set({ isReactionsOpen: open }),
  setDeviceSettingsOpen: (open) => set({ isDeviceSettingsOpen: open }),
  setMeetingInfoOpen: (open) => set({ isMeetingInfoOpen: open }),
  setShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
  setLayout: (layout) => set({ layout, gridPage: 0 }),
  togglePin: (id) =>
    set((state) => {
      const next = state.pinnedIds.includes(id)
        ? state.pinnedIds.filter((p) => p !== id)
        : [...state.pinnedIds, id];
      return { pinnedIds: next, isPinnedLocally: next.length > 0 };
    }),
  applyRemoteSpotlight: (ids) =>
    set((state) => (state.isPinnedLocally ? state : { pinnedIds: ids })),
  setGridPage: (page) => set({ gridPage: page }),
  setHandRaised: (identity, raised) =>
    set((state) => {
      const next = { ...state.raisedHands };
      if (raised) next[identity] = true;
      else delete next[identity];
      return { raisedHands: next };
    }),
  setLocalHandRaised: (raised) => set({ isHandRaised: raised }),
  clearRaisedHands: () => set({ raisedHands: {}, isHandRaised: false }),
  incrementUnreadChat: () =>
    set((state) => ({
      unreadChatCount: state.isChatOpen ? 0 : state.unreadChatCount + 1,
    })),
  clearUnreadChat: () => set({ unreadChatCount: 0 }),
  setReconnecting: (value) => set({ isReconnecting: value }),
  setRecording: (value) => set({ isRecording: value }),
  reset: () => set(initialState),
}));
