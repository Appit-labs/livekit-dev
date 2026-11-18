import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Workspace } from "@/types";

export interface InvitePreview {
  workspace_name: string;
  workspace_slug: string;
  email: string;
  expires_at: string;
  valid: boolean;
}

export interface CreateInviteResult {
  invite_url: string;
  expires_at: string;
}

export function useWorkspaces() {
  return useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => api.get("/workspaces").then((r) => r.data),
  });
}

export function useWorkspace(id: string) {
  return useQuery<Workspace>({
    queryKey: ["workspace", id],
    queryFn: () => api.get(`/workspaces/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post("/workspaces", { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}

export function useWorkspaceMembers(workspaceId: string, params?: { q?: string; department?: string; status?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId, params],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`, { params }).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useInvitePreview(token: string) {
  return useQuery<InvitePreview>({
    queryKey: ["invite-preview", token],
    queryFn: () => api.get(`/workspaces/invites/${token}/preview`).then((r) => r.data),
    enabled: !!token,
    retry: false,
  });
}

export function useCreateInvite(workspaceId: string) {
  return useMutation<CreateInviteResult, Error, { email: string; role?: string }>({
    mutationFn: (body) => api.post(`/workspaces/${workspaceId}/invites`, body).then((r) => r.data),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation<Workspace, Error, string>({
    mutationFn: (token) => api.post("/workspaces/invites/accept", { token }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workspaces"] }),
  });
}
