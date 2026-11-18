import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { DMConversation, DirectMessage } from "@/types";

export function useDMConversations(workspaceId: string) {
  return useQuery<DMConversation[]>({
    queryKey: ["dm-conversations", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/dm/conversations`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useCreateDMConversation(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantIds: string[]) =>
      api.post(`/workspaces/${workspaceId}/dm/conversations`, { participant_ids: participantIds }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dm-conversations", workspaceId] }),
  });
}

export function useDMMessages(workspaceId: string, conversationId: string) {
  return useQuery<DirectMessage[]>({
    queryKey: ["dm-messages", conversationId],
    queryFn: () =>
      api.get(`/workspaces/${workspaceId}/dm/conversations/${conversationId}/messages`).then((r) => r.data),
    enabled: !!conversationId,
  });
}

export function useSendDM(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      api.post(`/workspaces/${workspaceId}/dm/conversations/${conversationId}/messages`, { content }).then((r) => r.data),
    onSuccess: (_, { conversationId }) => qc.invalidateQueries({ queryKey: ["dm-messages", conversationId] }),
  });
}
