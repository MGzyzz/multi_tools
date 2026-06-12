import { apiRequest } from "@/lib/auth";

export type ApiGroup = {
  id: number;
  name: string;
  course: string;
  teacher: number | null;
  students_count: number;
  group_specialty: string;
  marks_count: number;
};

type GroupListResponse = {
  total_students: number;
  groups: ApiGroup[];
};

type CreateGroupInput = {
  name: string;
  course: string;
  group_specialty: string;
};

export const getGroupList = async (signal?: AbortSignal) => {
  return apiRequest<GroupListResponse>("/api/get_groups_list/", { signal });
};

export const createGroup = async (payload: CreateGroupInput) => {
  return apiRequest<ApiGroup>("/api/create_group/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const formatCourseLabel = (course: string) => {
  const normalized = course.trim();
  if (!normalized) return "Course not specified";
  return /^\d+$/.test(normalized) ? `Course ${normalized}` : normalized;
};
