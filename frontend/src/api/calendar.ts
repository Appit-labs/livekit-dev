import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { CalendarEvent } from "@/types";

export function useCalendarEvents(workspaceId: string, startDate: string, endDate: string) {
  return useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events", workspaceId, startDate, endDate],
    queryFn: () =>
      api.get(`/workspaces/${workspaceId}/calendar/events`, { params: { start_date: startDate, end_date: endDate } }).then((r) => r.data),
    enabled: !!workspaceId && !!startDate && !!endDate,
  });
}

export function useCreateEvent(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CalendarEvent>) =>
      api.post(`/workspaces/${workspaceId}/calendar/events`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events", workspaceId] }),
  });
}

export function useUpdateEvent(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, ...data }: { eventId: string; [key: string]: unknown }) =>
      api.patch(`/workspaces/${workspaceId}/calendar/events/${eventId}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events", workspaceId] }),
  });
}

export function useDeleteEvent(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete(`/workspaces/${workspaceId}/calendar/events/${eventId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-events", workspaceId] }),
  });
}
