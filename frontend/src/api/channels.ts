import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Channel, Message } from "@/types";

export function useChannels(workspaceId: string) {
  return useQuery<Channel[]>({
    queryKey: ["channels", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/channels`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useCreateChannel(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; is_private?: boolean }) =>
      api.post(`/workspaces/${workspaceId}/channels`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", workspaceId] }),
  });
}

export function useMessages(channelId: string) {
  return useInfiniteQuery<Message[]>({
    queryKey: ["messages", channelId],
    queryFn: ({ pageParam }) =>
      api.get(`/channels/${channelId}/messages`, { params: { before: pageParam, limit: 50 } }).then((r) => r.data),
    initialPageParam: undefined,
    getNextPageParam: (page) => (page.length === 50 ? page[0]?.id : undefined),
    enabled: !!channelId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, content, parentId }: { channelId: string; content: string; parentId?: string }) =>
      api.post(`/channels/${channelId}/messages`, { content, parent_id: parentId }).then((r) => r.data),
    onSuccess: (_, { channelId }) => qc.invalidateQueries({ queryKey: ["messages", channelId] }),
  });
}

export function useMarkChannelRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => api.post(`/channels/${channelId}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useAddReaction() {
  return useMutation({
    mutationFn: ({ channelId, messageId, emoji }: { channelId: string; messageId: string; emoji: string }) =>
      api.post(`/channels/${channelId}/messages/${messageId}/reactions`, { emoji }),
  });
}

export function useThread(channelId: string, messageId: string) {
  return useQuery<Message[]>({
    queryKey: ["thread", channelId, messageId],
    queryFn: () => api.get(`/channels/${channelId}/messages/${messageId}/thread`).then((r) => r.data),
    enabled: !!messageId,
  });
}
