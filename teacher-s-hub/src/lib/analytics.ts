import { apiRequest } from "@/lib/auth";

export type AnalyticsSummary = {
  avg_attendance: number;
  total_students: number;
  risk_breakdown: {
    high: number;
    medium: number;
    low: number;
  };
  attendance_trend: { week: string; value: number }[];
};

export type AnalyticsGroup = {
  id: number;
  name: string;
  subject: string;
  avg_attendance: number;
  at_risk: number;
};

export const getAnalyticsSummary = (signal?: AbortSignal) =>
  apiRequest<AnalyticsSummary>("/api/analytics/summary/", { signal });

export const getAnalyticsGroups = (signal?: AbortSignal) =>
  apiRequest<AnalyticsGroup[]>("/api/analytics/groups/", { signal });

export type StudentRisk = {
  student_id: number;
  risk: "high" | "medium" | "low";
  attendance_pct: number;
};

export const getGroupStudentRisks = (groupId: number, signal?: AbortSignal) =>
  apiRequest<StudentRisk[]>(`/api/analytics/groups/${groupId}/students/`, { signal });
