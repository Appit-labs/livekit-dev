import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CallRoom {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  created_by: string;
  created_at: string;
}

export interface JoinRoomResponse {
  token: string;
  livekit_url: string;
  room_id: string;
  room_name: string;
}

export function useCallRooms(workspaceId: string) {
  return useQuery<CallRoom[]>({
    queryKey: ["call-rooms", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/calls/rooms`).then((r) => r.data),
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });
}

export function useCreateCallRoom(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post(`/workspaces/${workspaceId}/calls/rooms`, { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-rooms", workspaceId] }),
  });
}

export function useJoinRoom() {
  return useMutation<JoinRoomResponse, Error, string>({
    mutationFn: (roomId: string) => api.post(`/calls/rooms/${roomId}/join`).then((r) => r.data),
  });
}

export function useLeaveRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => api.post(`/calls/rooms/${roomId}/leave`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-rooms"] }),
  });
}

export function useEndRoom(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => api.post(`/calls/rooms/${roomId}/end`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call-rooms", workspaceId] }),
  });
}
