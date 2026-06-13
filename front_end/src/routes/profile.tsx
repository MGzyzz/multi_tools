import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Camera, Mail, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, getUserInitials, type AuthUser } from "@/lib/auth";
import {
  getProfile,
  PROFILE_ROLE_OPTIONS,
  resolveProfileAvatarUrl,
  updateProfile,
} from "@/lib/profile";
import { requireAuth } from "@/lib/route-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Profile - Lectern" },
      {
        name: "description",
        content: "Your teacher profile powered by the current account API.",
      },
    ],
  }),
  component: ProfilePage,
});

type ProfileFormState = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  description: string;
};

const createFormState = (user: AuthUser): ProfileFormState => ({
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  role: user.role ?? "teacher",
  description: user.description,
});

function ProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<ProfileFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const user = await getProfile();
        if (controller.signal.aborted) return;

        setProfile(user);
        setForm(createFormState(user));
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(
          loadError instanceof ApiError ? loadError.message : "Unable to load your profile.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();
    return () => controller.abort();
  }, []);

  const avatarUrl = useMemo(
    () => resolveProfileAvatarUrl(profile?.avatar ?? null),
    [profile?.avatar],
  );

  const displayName = useMemo(() => {
    if (!profile) return "Teacher";
    return `${profile.first_name} ${profile.last_name}`.trim() || profile.username || "Teacher";
  }, [profile]);

  const hasChanges = useMemo(() => {
    if (!profile || !form) return false;

    const initialForm = createFormState(profile);
    return JSON.stringify(initialForm) !== JSON.stringify(form);
  }, [form, profile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !profile) return;

    setSaving(true);
    setError("");

    try {
      const updatedUser = await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        role: form.role,
        description: form.description.trim(),
      });

      setProfile(updatedUser);
      setForm(createFormState(updatedUser));

      toast.success("Profile updated", {
        description: "Your account details were saved successfully.",
      });
    } catch (saveError) {
      const message =
        saveError instanceof ApiError ? saveError.message : "The profile could not be updated.";

      setError(message);
      toast.error("Could not save profile", {
        description: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!profile) return;
    setForm(createFormState(profile));
    setError("");
  };

  return (
    <>
      <PageHeader
        title={t("profile.title")}
        description={t("profile.description")}
      />
      <PageBody>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {loading || !form ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Account snapshot card skeleton */}
            <div className="rounded-lg border border-border bg-card lg:col-span-1">
              <div className="border-b border-border px-4 py-3">
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="p-4">
                <div className="flex flex-col items-center text-center space-y-2">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="mt-5 h-16 w-full rounded-md" />
              </div>
            </div>
            {/* Personal details card skeleton */}
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-lg border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="space-y-1.5">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-9 w-full rounded-md" />
                      </div>
                    ))}
                    <div className="sm:col-span-2 space-y-1.5">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-9 w-full rounded-md" />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-28 w-full rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard className="lg:col-span-1" title={t("profile.accountSnapshot")}>
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                      {getUserInitials(profile)}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                    <Camera className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold">{displayName}</div>
                <div className="text-sm capitalize text-muted-foreground">
                  {profile.role || t("profile.teacherAccount")}
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserCircle2 className="h-4 w-4" /> {profile.username || t("profile.noUsername")}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {profile.email || t("profile.noEmail")}
                </div>
              </div>

              <div className="mt-5 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {t("profile.avatarNote")}
              </div>
            </SectionCard>

            <div className="space-y-4 lg:col-span-2">
              <SectionCard title={t("profile.personalDetails")}>
                <form onSubmit={(event) => void handleSubmit(event)}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="profile-first-name">{t("profile.firstName")}</Label>
                      <Input
                        id="profile-first-name"
                        value={form.first_name}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, first_name: event.target.value } : current,
                          )
                        }
                        className="mt-1.5"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile-last-name">{t("profile.lastName")}</Label>
                      <Input
                        id="profile-last-name"
                        value={form.last_name}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, last_name: event.target.value } : current,
                          )
                        }
                        className="mt-1.5"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile-email">{t("profile.email")}</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, email: event.target.value } : current,
                          )
                        }
                        className="mt-1.5"
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile-role">{t("profile.role")}</Label>
                      <select
                        id="profile-role"
                        value={form.role}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, role: event.target.value } : current,
                          )
                        }
                        className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={saving}
                      >
                        {PROFILE_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="profile-username">{t("profile.username")}</Label>
                      <Input
                        id="profile-username"
                        value={profile.username}
                        className="mt-1.5"
                        disabled
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t("profile.usernameNote")}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="profile-description">{t("profile.description2")}</Label>
                      <Textarea
                        id="profile-description"
                        value={form.description}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, description: event.target.value } : current,
                          )
                        }
                        rows={5}
                        className="mt-1.5"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={saving || !hasChanges}
                    >
                      {t("profile.reset")}
                    </Button>
                    <Button type="submit" size="sm" disabled={saving || !hasChanges}>
                      {saving ? t("profile.saving") : t("profile.saveChanges")}
                    </Button>
                  </div>
                </form>
              </SectionCard>

              <SectionCard title={t("profile.notConnectedTitle")}>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>{t("profile.notConnectedP1")}</p>
                  <p>{t("profile.notConnectedP2")}</p>
                  <p>{t("profile.notConnectedP3")}</p>
                </div>
              </SectionCard>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
