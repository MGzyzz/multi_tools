import { apiRequest } from "@/lib/auth";

export type SystemStatusLevel = "operational" | "degraded" | "outage" | "unknown";

export type SystemStatusService = {
  key: string;
  name: string;
  status: SystemStatusLevel;
  latency_ms: number;
  message: string;
  critical: boolean;
  severity?: number;
  details?: Record<string, unknown>;
};

export type SystemStatusResponse = {
  status: SystemStatusLevel;
  checked_at: string;
  services: SystemStatusService[];
};

export type SystemStatusHistoryPoint = {
  checked_at: string;
  overall_severity: number;
  services: Record<string, number>;
};

export type SystemStatusHistory = {
  window_minutes: number;
  points: SystemStatusHistoryPoint[];
};

export const getSystemStatus = (signal?: AbortSignal) =>
  apiRequest<SystemStatusResponse>(
    "/api/system/status/",
    { signal },
    { auth: false },
  );

export const getSystemStatusHistory = (windowMinutes = 30, signal?: AbortSignal) =>
  apiRequest<SystemStatusHistory>(
    `/api/system/status/history/?window=${windowMinutes}`,
    { signal },
    { auth: false },
  );

/** Pivot history points into a per-service severity series (time-ordered). */
export function pivotHistory(history: SystemStatusHistory | null): Record<string, number[]> {
  const series: Record<string, number[]> = {};
  if (!history) return series;
  for (const point of history.points) {
    for (const [key, sev] of Object.entries(point.services)) {
      (series[key] ??= []).push(sev);
    }
  }
  return series;
}
