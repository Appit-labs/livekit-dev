import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Draft } from "@/types";

export function useDrafts(sent?: boolean) {
  return useQuery<Draft[]>({
    queryKey: ["drafts", sent],
    queryFn: () => api.get("/drafts", { params: sent !== undefined ? { sent } : {} }).then((r) => r.data),
  });
}

export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; channel_id?: string; conversation_id?: string }) =>
      api.post("/drafts", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drafts"] }),
  });
}

export function useDeleteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => api.delete(`/drafts/${draftId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drafts"] }),
  });
}
