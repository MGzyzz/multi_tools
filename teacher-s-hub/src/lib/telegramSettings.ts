import { apiRequest } from "./auth";

export type TeacherNotificationSettings = {
  lesson_reminder_enabled: boolean;
  reminder_minutes_before: number;
};

export type GroupLeader = {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  telegram_connected: boolean;
};

export type BroadcastResult = {
  detail: string;
  recipients: number;
  group_names: string[];
};

export function getTelegramStatus() {
  return apiRequest<{ connected: boolean }>("/api/teacher/telegram/status/");
}

export function disconnectTelegram() {
  return apiRequest<void>("/api/teacher/telegram/status/", { method: "DELETE" });
}

export function generateLinkToken() {
  return apiRequest<{ token: string; expires_in_seconds: number }>(
    "/api/teacher/telegram/link-token/",
    { method: "POST" }
  );
}

export function getNotificationSettings() {
  return apiRequest<TeacherNotificationSettings>("/api/teacher/notification-settings/");
}

export function updateNotificationSettings(data: Partial<TeacherNotificationSettings>) {
  return apiRequest<TeacherNotificationSettings>("/api/teacher/notification-settings/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function getGroupLeaders(groupId: number) {
  return apiRequest<GroupLeader[]>(`/api/groups/${groupId}/leaders/`);
}

export function assignGroupLeader(groupId: number, studentId: number) {
  return apiRequest<GroupLeader>(`/api/groups/${groupId}/leaders/`, {
    method: "POST",
    body: JSON.stringify({ student_id: studentId }),
  });
}

export function removeGroupLeader(groupId: number, studentId: number) {
  return apiRequest<void>(`/api/groups/${groupId}/leaders/`, {
    method: "DELETE",
    body: JSON.stringify({ student_id: studentId }),
  });
}

export function sendBroadcast(groupIds: number[], message: string) {
  return apiRequest<BroadcastResult>("/api/teacher/broadcast/", {
    method: "POST",
    body: JSON.stringify({ group_ids: groupIds, message }),
  });
}
