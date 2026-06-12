import { apiRequest } from "@/lib/auth";

export type AttendanceRowStatus = "present" | "absent" | "late" | "not_marked";

export type ApiAttendanceRow = {
  id: number;
  status: AttendanceRowStatus;
  marked_at: string | null;
  score: string | null;
  student: {
    id: number;
    first_name: string;
    last_name: string;
    telegram_username: string | null;
  };
};

export type AttendanceScheduleDetail = {
  schedule: {
    id: number;
    date: string;
    time: string;
    group: {
      id: number;
      name: string;
    };
    subject: {
      id: number;
      name: string;
    };
  };
  attendances: ApiAttendanceRow[];
};

type MarkAttendanceResponse = {
  schedule_id: number;
  group_id: number;
  subject_id: number;
  total_students_in_group: number;
  present_count: number;
  changed_to_present: number;
  changed_to_absent: number;
};

export const getAttendanceScheduleDetail = async (scheduleId: number, signal?: AbortSignal) => {
  return apiRequest<AttendanceScheduleDetail>(`/api/attendance/schedule/${scheduleId}/`, {
    signal,
  });
};

export const updateAttendance = async (
  attendanceId: number,
  payload: {
    status?: AttendanceRowStatus;
    marked_at?: string;
    score?: string | null;
  },
) => {
  return apiRequest<{
    message: string;
    attendance: ApiAttendanceRow;
  }>(`/api/edit_attendance/${attendanceId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const markAttendance = async (scheduleId: number, presentStudentIds: number[]) => {
  return apiRequest<MarkAttendanceResponse>("/api/attendance/mark/", {
    method: "POST",
    body: JSON.stringify({
      schedule_id: scheduleId,
      present_student_ids: presentStudentIds,
    }),
  });
};

export const getAttendanceStudentName = (row: ApiAttendanceRow) =>
  `${row.student.last_name} ${row.student.first_name}`.trim();

export const formatMarkedAtTime = (value: string | null) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};
