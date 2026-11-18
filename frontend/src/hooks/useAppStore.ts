import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSection } from "@/types";

interface AppStore {
  activeWorkspaceId: string | null;
  activeSection: AppSection;
  activeChannelId: string | null;
  activeDMConversationId: string | null;
  activeBoardId: string | null;
  threadMessageId: string | null;
  threadChannelId: string | null;

  setActiveWorkspace: (id: string) => void;
  setActiveSection: (section: AppSection) => void;
  setActiveChannel: (id: string) => void;
  setActiveDMConversation: (id: string) => void;
  setActiveBoard: (id: string) => void;
  openThread: (messageId: string, channelId: string) => void;
  closeThread: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      activeSection: "channel",
      activeChannelId: null,
      activeDMConversationId: null,
      activeBoardId: null,
      threadMessageId: null,
      threadChannelId: null,

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setActiveSection: (section) => set({ activeSection: section }),
      setActiveChannel: (id) => set({ activeChannelId: id, activeSection: "channel" }),
      setActiveDMConversation: (id) => set({ activeDMConversationId: id, activeSection: "dm" }),
      setActiveBoard: (id) => set({ activeBoardId: id, activeSection: "board" }),
      openThread: (messageId, channelId) => set({ threadMessageId: messageId, threadChannelId: channelId }),
      closeThread: () => set({ threadMessageId: null, threadChannelId: null }),
    }),
    { name: "lively-app-store", partialize: (s) => ({ activeWorkspaceId: s.activeWorkspaceId }) }
  )
);
