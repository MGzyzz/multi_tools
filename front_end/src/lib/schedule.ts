import { apiRequest } from "@/lib/auth";

export type ApiScheduleEntry = {
  id: number;
  group: number;
  group_name: string;
  subject: number;
  auditorium: number | null;
  teacher: number | null;
  time: string;
  date: string;
  subject_name: string;
  auditorium_name: string | null;
  auditorium_building: string | null;
  auditorium_building_label: string | null;
  is_mine: boolean;
};

export type ApiScheduleSubject = {
  id: number;
  name: string;
  description: string;
};

export type ApiAuditorium = {
  id: number;
  name: string;
  building: "main" | "other";
  building_label: string;
};

export type TeachingTimeSlot = {
  start: string;
  end: string;
  label: string;
};

type ApplyRecurringScheduleInput = {
  groupId: number;
  subjectId: number;
  auditoriumId?: number | null;
  startDate: string;
  endDate: string;
  time: string;
  weekday: number;
};

type CreateScheduleLessonInput = {
  groupId: number;
  subjectId: number;
  auditoriumId?: number | null;
  date: string;
  time: string;
  startDate: string;
  endDate: string;
};

type GetScheduleListOptions = {
  dateFrom: string;
  dateTo: string;
  groupId?: number;
  showAll?: boolean;
  signal?: AbortSignal;
};

type CreateAuditoriumInput = {
  name: string;
  building: ApiAuditorium["building"];
};

type UpdateScheduleLessonInput = {
  groupId: number;
  lessonId: number;
  subjectId: number;
  auditoriumId?: number | null;
  date: string;
  time: string;
  startDate: string;
  endDate: string;
};

type DeleteScheduleLessonInput = {
  groupId: number;
  lessonId: number;
  startDate: string;
  endDate: string;
};

const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 22 * 60;
const LESSON_DURATION_MINUTES = 50;
const BREAK_DURATION_MINUTES = 10;
const LUNCH_START_MINUTES = 13 * 60;
const LUNCH_END_MINUTES = 14 * 60;
const POST_LUNCH_BREAK_MINUTES = 10;

const padTime = (value: number) => String(value).padStart(2, "0");

const toTimeString = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${padTime(hours)}:${padTime(mins)}`;
};

export const getScheduleList = async ({
  dateFrom,
  dateTo,
  groupId,
  showAll,
  signal,
}: GetScheduleListOptions) => {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
  });

  if (groupId) params.set("group_id", String(groupId));
  if (showAll) params.set("show_all", "true");

  return apiRequest<ApiScheduleEntry[]>(`/api/get_schedule_list/?${params.toString()}`, {
    signal,
  });
};

export const getGroupScheduleSubjects = async (groupId: number, signal?: AbortSignal) => {
  return apiRequest<ApiScheduleSubject[]>(`/api/get_group/${groupId}/subjects/`, { signal });
};

export const getAuditoriumList = async (signal?: AbortSignal) => {
  return apiRequest<{ auditoriums: ApiAuditorium[] }>("/api/auditoriums/", { signal });
};

export const createAuditorium = async (payload: CreateAuditoriumInput) => {
  return apiRequest<ApiAuditorium>("/api/auditoriums/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const createScheduleLesson = async ({
  groupId,
  subjectId,
  auditoriumId,
  date,
  time,
  startDate,
  endDate,
}: CreateScheduleLessonInput) => {
  return apiRequest("/api/schedule-planner/", {
    method: "POST",
    body: JSON.stringify({
      group_id: groupId,
      start_date: startDate,
      end_date: endDate,
      create: [
        {
          date,
          time,
          subject_id: subjectId,
          auditorium_id: auditoriumId ?? null,
        },
      ],
    }),
  });
};

export const updateScheduleLesson = async ({
  groupId,
  lessonId,
  subjectId,
  auditoriumId,
  date,
  time,
  startDate,
  endDate,
}: UpdateScheduleLessonInput) => {
  return apiRequest("/api/schedule-planner/", {
    method: "POST",
    body: JSON.stringify({
      group_id: groupId,
      start_date: startDate,
      end_date: endDate,
      update: [
        {
          id: lessonId,
          date,
          time,
          subject_id: subjectId,
          auditorium_id: auditoriumId ?? null,
        },
      ],
    }),
  });
};

export const deleteScheduleLesson = async ({
  groupId,
  lessonId,
  startDate,
  endDate,
}: DeleteScheduleLessonInput) => {
  return apiRequest("/api/schedule-planner/", {
    method: "POST",
    body: JSON.stringify({
      group_id: groupId,
      start_date: startDate,
      end_date: endDate,
      delete: [lessonId],
    }),
  });
};

export const applyRecurringSchedule = async ({
  groupId,
  subjectId,
  auditoriumId,
  startDate,
  endDate,
  time,
  weekday,
}: ApplyRecurringScheduleInput) => {
  return apiRequest("/api/schedule-planner/semester/apply/", {
    method: "POST",
    body: JSON.stringify({
      group_id: groupId,
      start_date: startDate,
      end_date: endDate,
      pattern: [
        {
          weekday,
          time,
          subject_id: subjectId,
          auditorium_id: auditoriumId ?? null,
        },
      ],
    }),
  });
};

export const getTeachingTimeSlots = (): TeachingTimeSlot[] => {
  const slots: TeachingTimeSlot[] = [];
  let currentStart = DAY_START_MINUTES;

  while (currentStart + LESSON_DURATION_MINUTES <= DAY_END_MINUTES) {
    const currentEnd = currentStart + LESSON_DURATION_MINUTES;

    if (currentStart < LUNCH_END_MINUTES && currentEnd > LUNCH_START_MINUTES) {
      currentStart = LUNCH_END_MINUTES + POST_LUNCH_BREAK_MINUTES;
      continue;
    }

    slots.push({
      start: toTimeString(currentStart),
      end: toTimeString(currentEnd),
      label: `${toTimeString(currentStart)} - ${toTimeString(currentEnd)}`,
    });

    currentStart = currentEnd + BREAK_DURATION_MINUTES;

    if (currentStart >= LUNCH_START_MINUTES && currentStart < LUNCH_END_MINUTES) {
      currentStart = LUNCH_END_MINUTES + POST_LUNCH_BREAK_MINUTES;
    }
  }

  return slots;
};

export const getTimeLabel = (value: string) => value.slice(0, 5);
