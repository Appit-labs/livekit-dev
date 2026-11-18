import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { NotificationPrefs, AppearanceSettings } from "@/types";

export function useNotificationPrefs() {
  return useQuery<NotificationPrefs>({
    queryKey: ["notification-prefs"],
    queryFn: () => api.get("/settings/notifications").then((r) => r.data),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationPrefs>) => api.patch("/settings/notifications", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
  });
}

export function useAppearance() {
  return useQuery<AppearanceSettings>({
    queryKey: ["appearance"],
    queryFn: () => api.get("/settings/appearance").then((r) => r.data),
  });
}

export function useUpdateAppearance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppearanceSettings>) => api.patch("/settings/appearance", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appearance"] }),
  });
}
