import { apiRequest } from "./auth";

export type ApiNotification = {
  id: number;
  title: string;
  message: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  is_read: boolean;
  readt_at: string | null;
  created_at: string;
};

export async function getNotifications(
  params: { limit?: number; offset?: number; is_read?: boolean } = {},
  signal?: AbortSignal,
): Promise<ApiNotification[]> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.offset !== undefined) qs.set("offset", String(params.offset));
  if (params.is_read !== undefined) qs.set("is_read", String(params.is_read));
  return apiRequest<ApiNotification[]>(`/api/notifications/?${qs.toString()}`, { signal });
}

export async function markNotificationRead(id: number): Promise<ApiNotification> {
  return apiRequest<ApiNotification>(`/api/notifications/${id}/read/`, { method: "PATCH" });
}
