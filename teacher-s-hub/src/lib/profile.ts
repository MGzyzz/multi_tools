import { apiRequest, resolveBackendBaseUrl, setStoredUser, type AuthUser } from "@/lib/auth";

export const PROFILE_ROLE_OPTIONS = [
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
] as const;

export type ProfileUpdatePayload = {
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  description?: string;
};

export const getProfile = async () => {
  const user = await apiRequest<AuthUser>("/api/me/");
  return setStoredUser(user);
};

export const updateProfile = async (payload: ProfileUpdatePayload) => {
  const user = await apiRequest<AuthUser>("/api/edit_profile/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return setStoredUser(user);
};

export const resolveProfileAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  return `${resolveBackendBaseUrl()}${avatar}`;
};
