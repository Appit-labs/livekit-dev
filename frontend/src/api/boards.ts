import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Board, BoardSummary, BoardTask } from "@/types";

export function useBoards(workspaceId: string) {
  return useQuery<BoardSummary[]>({
    queryKey: ["boards", workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/boards`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useBoard(boardId: string) {
  return useQuery<Board>({
    queryKey: ["board", boardId],
    queryFn: () => api.get(`/boards/${boardId}`).then((r) => r.data),
    enabled: !!boardId,
  });
}

export function useCreateBoard(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post(`/workspaces/${workspaceId}/boards`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards", workspaceId] }),
  });
}

export function useCreateTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { column_id: string; title: string; priority?: string; assignee_id?: string; due_date?: string }) =>
      api.post(`/boards/${boardId}/tasks`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useUpdateTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, ...data }: { taskId: string; [key: string]: unknown }) =>
      api.patch(`/boards/${boardId}/tasks/${taskId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useMoveTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { task_id: string; target_column_id: string; position: number }) =>
      api.post(`/boards/${boardId}/tasks/move`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useDeleteTask(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/boards/${boardId}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useCreateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; color?: string }) =>
      api.post(`/boards/${boardId}/columns`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });
}

export function useCompleteAssignedTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, taskId }: { boardId: string; taskId: string }) =>
      api.delete(`/boards/${boardId}/tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assigned-tasks"] }),
  });
}

export function useAssignedTasks() {
  return useQuery<BoardTask[]>({
    queryKey: ["assigned-tasks"],
    queryFn: () => api.get("/tasks/assigned").then((r) => r.data),
  });
}

export function useBoardReports(workspaceId: string, boardId: string) {
  return useQuery({
    queryKey: ["board-reports", boardId],
    queryFn: async () => {
      const [summary, priority, velocity] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/boards/${boardId}/reports/summary`).then((r) => r.data),
        api.get(`/workspaces/${workspaceId}/boards/${boardId}/reports/priority-distribution`).then((r) => r.data),
        api.get(`/workspaces/${workspaceId}/boards/${boardId}/reports/velocity`).then((r) => r.data),
      ]);
      return { summary, priority, velocity };
    },
    enabled: !!boardId,
  });
}
