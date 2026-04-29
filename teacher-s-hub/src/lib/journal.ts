import { apiRequest } from "@/lib/auth";

export type ApiSubject = { id: number; name: string; description: string };

export type JournalEntryStatus = "present" | "absent" | "late" | "not_marked";

export type JournalEntry = {
  id: number;
  schedule_id: number;
  date: string;
  time: string;
  status: JournalEntryStatus;
  marked_at: string | null;
  score: string | null;
};

export type StudentJournalData = {
  student: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    age: number;
    telegram_username: string | null;
    face_image: string | null;
  };
  group: { id: number; name: string };
  subject: { id: number; name: string };
  summary: {
    attendance_percent: number;
    total_lessons: number;
    attended_lessons: number;
    missed_lessons: number;
    average_score: number | null;
    open_risks: number;
  };
  journal: JournalEntry[];
};

export const getGroupSubjects = (groupId: number, signal?: AbortSignal) =>
  apiRequest<ApiSubject[]>(`/api/get_group/${groupId}/subjects/`, { signal });

export const getStudentJournal = (
  groupId: number,
  subjectId: number,
  studentId: number,
  signal?: AbortSignal,
) =>
  apiRequest<StudentJournalData>(
    `/api/get_group/${groupId}/subjects/${subjectId}/students/${studentId}/journal/`,
    { signal },
  );
