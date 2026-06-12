import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CalendarDays, Loader2, PencilLine, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/auth";
import {
  createAuditorium,
  deleteScheduleLesson,
  getAuditoriumList,
  updateScheduleLesson,
  type ApiAuditorium,
  type ApiScheduleEntry,
  type TeachingTimeSlot,
} from "@/lib/schedule";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type EditLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessons: ApiScheduleEntry[];
  groupNames: Record<number, string>;
  timeOptions: TeachingTimeSlot[];
  weekRange: {
    startDate: string;
    endDate: string;
  };
  onLessonUpdated?: () => Promise<void> | void;
};

const formatAuditoriumLabel = (auditorium: ApiAuditorium) =>
  `${auditorium.building_label} · ${auditorium.name}`;

const formatLessonLabel = (lesson: ApiScheduleEntry, groupNames: Record<number, string>) =>
  `${lesson.subject_name} · ${groupNames[lesson.group] ?? `Group #${lesson.group}`}`;

const getLessonStatus = (lesson: ApiScheduleEntry) => {
  const start = new Date(`${lesson.date}T${lesson.time.slice(0, 5)}:00`);
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  const openAt = new Date(start.getTime() - 15 * 60 * 1000);
  const now = new Date();

  if (now < openAt) return "upcoming" as const;
  if (now > end) return "ended" as const;
  return "live" as const;
};

const formatRequestError = (error: ApiError | Error, fallback: string) => {
  if (!(error instanceof ApiError)) return fallback;

  const payload = error.data;
  if (payload && typeof payload === "object") {
    const record = payload as {
      conflicts?: Array<{ date: string; time: string; subject_name: string }>;
      detail?: string;
    };

    if (record.conflicts?.length) {
      const firstConflict = record.conflicts[0];
      return `This slot is already busy: ${firstConflict.date} ${String(firstConflict.time).slice(0, 5)} · ${firstConflict.subject_name}.`;
    }

    if (typeof record.detail === "string" && record.detail.trim()) {
      return record.detail;
    }
  }

  return error.message || fallback;
};

export function EditLessonDialog({
  open,
  onOpenChange,
  lessons,
  groupNames,
  timeOptions,
  weekRange,
  onLessonUpdated,
}: EditLessonDialogProps) {
  const { t } = useI18n();
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(timeOptions[0]?.start ?? "08:00");
  const [auditoriumId, setAuditoriumId] = useState("");
  const [auditoriums, setAuditoriums] = useState<ApiAuditorium[]>([]);
  const [loadingAuditoriums, setLoadingAuditoriums] = useState(false);
  const [auditoriumsError, setAuditoriumsError] = useState("");
  const [createAuditoriumOpen, setCreateAuditoriumOpen] = useState(false);
  const [newAuditoriumName, setNewAuditoriumName] = useState("");
  const [newAuditoriumBuilding, setNewAuditoriumBuilding] =
    useState<ApiAuditorium["building"]>("main");
  const [creatingAuditorium, setCreatingAuditorium] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => String(lesson.id) === selectedLessonId) ?? lessons[0] ?? null,
    [lessons, selectedLessonId],
  );
  const isPastLesson = selectedLesson ? getLessonStatus(selectedLesson) === "ended" : false;

  useEffect(() => {
    if (!open) return;

    setSelectedLessonId(lessons[0] ? String(lessons[0].id) : "");
    setCreateAuditoriumOpen(false);
    setNewAuditoriumName("");
    setNewAuditoriumBuilding("main");
    setSubmitError("");
  }, [lessons, open]);

  useEffect(() => {
    if (!open || !selectedLesson) return;

    setDate(selectedLesson.date);
    setTime(
      timeOptions.some((option) => option.start === selectedLesson.time.slice(0, 5))
        ? selectedLesson.time.slice(0, 5)
        : (timeOptions[0]?.start ?? "08:00"),
    );
    setAuditoriumId(selectedLesson.auditorium ? String(selectedLesson.auditorium) : "");
  }, [open, selectedLesson, timeOptions]);

  useEffect(() => {
    if (!open) {
      setAuditoriums([]);
      setAuditoriumsError("");
      return;
    }

    const controller = new AbortController();

    const loadAuditoriums = async () => {
      setLoadingAuditoriums(true);
      setAuditoriumsError("");

      try {
        const response = await getAuditoriumList(controller.signal);
        if (controller.signal.aborted) return;
        setAuditoriums(response.auditoriums);
      } catch (error) {
        if (controller.signal.aborted) return;
        setAuditoriums([]);
        setAuditoriumsError(
          error instanceof ApiError ? error.message : "Unable to load auditoriums right now.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingAuditoriums(false);
        }
      }
    };

    void loadAuditoriums();

    return () => controller.abort();
  }, [open]);

  const handleCreateAuditorium = async () => {
    const normalizedName = newAuditoriumName.trim();
    if (!normalizedName) {
      setSubmitError(t("editLesson.validationAuditoriumName"));
      return;
    }

    setCreatingAuditorium(true);
    setSubmitError("");

    try {
      const created = await createAuditorium({
        name: normalizedName,
        building: newAuditoriumBuilding,
      });

      setAuditoriums((current) => [...current, created]);
      setAuditoriumId(String(created.id));
      setCreateAuditoriumOpen(false);
      setNewAuditoriumName("");
      setNewAuditoriumBuilding("main");
      toast.success(t("editLesson.toastCreatedAuditorium"), {
        description: formatAuditoriumLabel(created),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? formatRequestError(error, "Unable to create auditorium.")
          : "Unable to create auditorium.";
      setSubmitError(message);
      toast.error(t("editLesson.toastErrorAuditorium"), { description: message });
    } finally {
      setCreatingAuditorium(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");

    if (!selectedLesson || !date || !time) {
      setSubmitError(t("editLesson.validationDateTime"));
      return;
    }
    if (isPastLesson) {
      setSubmitError(t("editLesson.pastLocked"));
      return;
    }

    setSaving(true);

    try {
      await updateScheduleLesson({
        groupId: selectedLesson.group,
        lessonId: selectedLesson.id,
        subjectId: selectedLesson.subject,
        auditoriumId: auditoriumId ? Number(auditoriumId) : null,
        date,
        time,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
      });

      await onLessonUpdated?.();
      onOpenChange(false);
      toast.success(t("editLesson.toastUpdated"), {
        description: `${selectedLesson.subject_name} · ${date} · ${time}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? formatRequestError(error, "Unable to update the lesson right now.")
          : "Unable to update the lesson right now.";
      setSubmitError(message);
      toast.error(t("editLesson.toastErrorUpdate"), { description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLesson) return;
    if (isPastLesson) {
      setSubmitError(t("editLesson.pastLocked"));
      return;
    }

    setDeleting(true);
    setSubmitError("");

    try {
      await deleteScheduleLesson({
        groupId: selectedLesson.group,
        lessonId: selectedLesson.id,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
      });

      await onLessonUpdated?.();
      onOpenChange(false);
      toast.success(t("editLesson.toastDeleted"), {
        description: `${selectedLesson.subject_name} removed from this schedule slot.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? formatRequestError(error, "Unable to delete the lesson right now.")
          : "Unable to delete the lesson right now.";
      setSubmitError(message);
      toast.error(t("editLesson.toastErrorDelete"), { description: message });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <PencilLine className="h-4 w-4" />
          </div>
          <DialogTitle>{t("editLesson.title")}</DialogTitle>
          <DialogDescription>{t("editLesson.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          {isPastLesson ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("editLesson.pastLocked")}</span>
            </div>
          ) : null}

          {lessons.length > 1 ? (
            <div>
              <Label htmlFor="lesson">{t("editLesson.labelLesson")}</Label>
              <Select
                value={selectedLessonId}
                onValueChange={setSelectedLessonId}
                disabled={isPastLesson}
              >
                <SelectTrigger id="lesson" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={String(lesson.id)}>
                      {formatLessonLabel(lesson, groupNames)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedLesson ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("editLesson.labelSubject")}
                </div>
                <div className="mt-1 text-sm font-medium">{selectedLesson.subject_name}</div>
              </div>
              <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("editLesson.labelGroup")}
                </div>
                <div className="mt-1 text-sm font-medium">
                  {groupNames[selectedLesson.group] ?? `Group #${selectedLesson.group}`}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-date">{t("editLesson.labelDate")}</Label>
              <Input
                id="edit-date"
                type="date"
                min={weekRange.startDate}
                max={weekRange.endDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1.5"
                disabled={isPastLesson}
              />
            </div>

            <div>
              <Label htmlFor="edit-time">{t("editLesson.labelTime")}</Label>
              <Select value={time} onValueChange={setTime} disabled={isPastLesson}>
                <SelectTrigger id="edit-time" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((slot) => (
                    <SelectItem key={slot.start} value={slot.start}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="edit-auditorium">{t("editLesson.labelAuditorium")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  onClick={() => setCreateAuditoriumOpen((current) => !current)}
                  disabled={isPastLesson}
                >
                  {createAuditoriumOpen
                    ? t("editLesson.cancelNewAuditorium")
                    : t("editLesson.createNewAuditorium")}
                </Button>
              </div>
              <Select
                value={auditoriumId}
                onValueChange={setAuditoriumId}
                disabled={isPastLesson || loadingAuditoriums || auditoriums.length === 0}
              >
                <SelectTrigger id="edit-auditorium" className="mt-1.5">
                  <SelectValue
                    placeholder={
                      loadingAuditoriums
                        ? t("editLesson.placeholderAuditoriumLoading")
                        : auditoriums.length === 0
                          ? t("editLesson.placeholderAuditoriumEmpty")
                          : t("editLesson.placeholderAuditorium")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {auditoriums.map((auditorium) => (
                    <SelectItem key={auditorium.id} value={String(auditorium.id)}>
                      {formatAuditoriumLabel(auditorium)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {createAuditoriumOpen ? (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="edit-new-auditorium-name">
                    {t("editLesson.newAuditoriumTitle")}
                  </Label>
                  <Input
                    id="edit-new-auditorium-name"
                    placeholder={t("editLesson.placeholderAuditoriumName")}
                    value={newAuditoriumName}
                    onChange={(event) => setNewAuditoriumName(event.target.value)}
                    className="mt-1.5"
                    disabled={isPastLesson}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-new-auditorium-building">
                    {t("editLesson.labelBuilding")}
                  </Label>
                  <Select
                    value={newAuditoriumBuilding}
                    onValueChange={(value) =>
                      setNewAuditoriumBuilding(value as ApiAuditorium["building"])
                    }
                    disabled={isPastLesson}
                  >
                    <SelectTrigger id="edit-new-auditorium-building" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">{t("editLesson.buildingMain")}</SelectItem>
                      <SelectItem value="other">{t("editLesson.buildingOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isPastLesson || creatingAuditorium}
                    onClick={() => void handleCreateAuditorium()}
                  >
                    {creatingAuditorium ? t("editLesson.creating") : t("editLesson.saveAuditorium")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {loadingAuditoriums ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("editLesson.loadingAuditoriums")}
            </div>
          ) : null}

          {auditoriumsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {auditoriumsError}
            </div>
          ) : null}

          {!loadingAuditoriums && !auditoriumsError && auditoriums.length === 0 ? (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              {t("editLesson.noAuditoriums")}
            </div>
          ) : null}

          {submitError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={!selectedLesson || isPastLesson || deleting || saving}
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? t("editLesson.deleting") : t("editLesson.delete")}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("editLesson.cancel")}
            </Button>
            <Button type="submit" disabled={!selectedLesson || isPastLesson || saving || deleting}>
              {saving ? t("editLesson.saving") : t("editLesson.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
