import { ApiError, apiRequest } from "@/lib/auth";

export type ApiStudent = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  age: number;
  telegram_username: string | null;
  telegram_id: string | null;
  platonus_id: number | null;
  face_image: string | null;
  groups: Array<{ id: number; name: string }>;
};

export const getAllStudents = async (signal?: AbortSignal) => {
  return apiRequest<ApiStudent[]>("/api/get_all_students/", { signal });
};

export const getStudentFullName = (student: ApiStudent) => {
  return (
    `${student.first_name} ${student.last_name}`.trim() || student.email || `Student #${student.id}`
  );
};

export const updateStudentTelegramId = async (studentId: number, telegramId: string) => {
  return apiRequest<ApiStudent>(`/api/edit_student/${studentId}/`, {
    method: "PATCH",
    body: JSON.stringify({ telegram_id: telegramId || null }),
  });
};

export const getStudentInitials = (student: ApiStudent) => {
  const initials = [student.first_name, student.last_name]
    .map((part) => part?.trim()?.[0] ?? "")
    .join("")
    .toUpperCase();

  return initials || "ST";
};

export const uploadStudentFacePhoto = async (
  studentId: number,
  file: Blob | File,
): Promise<void> => {
  const form = new FormData();
  form.append("file", file instanceof File ? file : new File([file], "photo.jpg", { type: "image/jpeg" }));
  try {
    await apiRequest<unknown>(`/api/students/${studentId}/face_embedding/`, {
      method: "POST",
      body: form,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      const data = error.data as Record<string, unknown> | null;
      if (data?.error === "no_face") {
        throw new Error("Лицо не обнаружено на фото. Убедитесь, что лицо чётко видно и хорошо освещено.");
      }
    }
    throw error;
  }
};
