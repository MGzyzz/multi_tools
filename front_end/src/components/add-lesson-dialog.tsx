import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CalendarDays, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  applyRecurringSchedule,
  createAuditorium,
  createScheduleLesson,
  getAuditoriumList,
  getGroupScheduleSubjects,
  type ApiAuditorium,
  type ApiScheduleSubject,
  type TeachingTimeSlot,
} from "@/lib/schedule";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type ScheduleGroupOption = {
  id: number;
  name: string;
  course?: string;
  specialty?: string;
};

type AddLessonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ScheduleGroupOption[];
  timeOptions: TeachingTimeSlot[];
  weekRange: {
    startDate: string;
    endDate: string;
  };
  initialDate?: string | null;
  initialTime?: string | null;
  onLessonAdded?: () => Promise<void> | void;
};

const getDefaultGroupId = (groups: ScheduleGroupOption[]) =>
  groups.length === 1 ? String(groups[0].id) : "";

const getDefaultTime = (timeOptions: TeachingTimeSlot[]) => timeOptions[0]?.start ?? "08:00";
const addDays = (value: string, amount: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const next = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
  next.setDate(next.getDate() + amount);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toPlannerWeekday = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
  return (date.getDay() + 6) % 7;
};

const formatGroupMeta = (group: ScheduleGroupOption) => {
  const parts = [group.course ? `Course ${group.course}` : "", group.specialty ?? ""].filter(
    Boolean,
  );
  return parts.join(" · ");
};

const formatAuditoriumLabel = (auditorium: ApiAuditorium) =>
  `${auditorium.building_label} · ${auditorium.name}`;

const formatRequestError = (error: ApiError | Error) => {
  if (!(error instanceof ApiError)) {
    return "Unable to create the lesson right now.";
  }

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

  return error.message || "Unable to create the lesson right now.";
};

export function AddLessonDialog({
  open,
  onOpenChange,
  groups,
  timeOptions,
  weekRange,
  initialDate,
  initialTime,
  onLessonAdded,
}: AddLessonDialogProps) {
  const { t } = useI18n();
  const [groupId, setGroupId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(getDefaultTime(timeOptions));
  const [auditoriumId, setAuditoriumId] = useState("");
  const [repeatWeekly, setRepeatWeekly] = useState(true);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [auditoriums, setAuditoriums] = useState<ApiAuditorium[]>([]);
  const [loadingAuditoriums, setLoadingAuditoriums] = useState(false);
  const [auditoriumsError, setAuditoriumsError] = useState("");
  const [createAuditoriumOpen, setCreateAuditoriumOpen] = useState(false);
  const [newAuditoriumName, setNewAuditoriumName] = useState("");
  const [newAuditoriumBuilding, setNewAuditoriumBuilding] =
    useState<ApiAuditorium["building"]>("main");
  const [creatingAuditorium, setCreatingAuditorium] = useState(false);
  const [subjects, setSubjects] = useState<ApiScheduleSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === groupId) ?? null,
    [groupId, groups],
  );

  useEffect(() => {
    if (!open) return;

    setGroupId(getDefaultGroupId(groups));
    setSubjectId("");
    setSubjects([]);
    setSubjectsError("");
    setAuditoriums([]);
    setAuditoriumsError("");
    setAuditoriumId("");
    setCreateAuditoriumOpen(false);
    setNewAuditoriumName("");
    setNewAuditoriumBuilding("main");
    setSubmitError("");
    const nextDate = initialDate ?? weekRange.startDate;
    const nextTime =
      initialTime && timeOptions.some((option) => option.start === initialTime)
        ? initialTime
        : getDefaultTime(timeOptions);
    setDate(nextDate);
    setTime(nextTime);
    setRepeatWeekly(true);
    setRepeatUntil(addDays(nextDate, 119));
  }, [groups, initialDate, initialTime, open, timeOptions, weekRange.startDate]);

  useEffect(() => {
    if (!repeatWeekly || !date) return;
    setRepeatUntil((current) => (current && current >= date ? current : addDays(date, 119)));
  }, [date, repeatWeekly]);

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
        setAuditoriumId((current) => {
          if (
            current &&
            response.auditoriums.some((auditorium) => String(auditorium.id) === current)
          ) {
            return current;
          }
          return response.auditoriums[0] ? String(response.auditoriums[0].id) : "";
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setAuditoriums([]);
        setAuditoriumId("");
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

  useEffect(() => {
    if (!open || !groupId) {
      setSubjects([]);
      setSubjectsError("");
      setSubjectId("");
      return;
    }

    const controller = new AbortController();

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setSubjectsError("");

      try {
        const response = await getGroupScheduleSubjects(Number(groupId), controller.signal);
        if (controller.signal.aborted) return;

        setSubjects(response);
        setSubjectId((current) => {
          if (current && response.some((subject) => String(subject.id) === current)) {
            return current;
          }
          return response[0] ? String(response[0].id) : "";
        });
      } catch (error) {
        if (controller.signal.aborted) return;

        setSubjects([]);
        setSubjectId("");
        setSubjectsError(
          error instanceof ApiError ? error.message : "Unable to load subjects for this group.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSubjects(false);
        }
      }
    };

    void loadSubjects();

    return () => controller.abort();
  }, [groupId, open]);

  const handleCreateAuditorium = async () => {
    const normalizedName = newAuditoriumName.trim();
    if (!normalizedName) {
      setSubmitError(t("addLesson.validationAuditoriumName"));
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
      toast.success(t("addLesson.toastCreatedAuditorium"), {
        description: formatAuditoriumLabel(created),
      });
    } catch (error) {
      const message =
        error instanceof Error ? formatRequestError(error) : "Unable to create auditorium.";
      setSubmitError(message);
      toast.error(t("addLesson.toastErrorAuditorium"), { description: message });
    } finally {
      setCreatingAuditorium(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");

    if (!groupId || !subjectId || !date || !time) {
      setSubmitError(t("addLesson.validationGroupSubject"));
      return;
    }

    if (repeatWeekly && (!repeatUntil || repeatUntil < date)) {
      setSubmitError(t("addLesson.validationRepeatUntil"));
      return;
    }

    setSubmitting(true);

    try {
      if (repeatWeekly) {
        await applyRecurringSchedule({
          groupId: Number(groupId),
          subjectId: Number(subjectId),
          auditoriumId: auditoriumId ? Number(auditoriumId) : null,
          startDate: date,
          endDate: repeatUntil,
          time,
          weekday: toPlannerWeekday(date),
        });
      } else {
        await createScheduleLesson({
          groupId: Number(groupId),
          subjectId: Number(subjectId),
          auditoriumId: auditoriumId ? Number(auditoriumId) : null,
          date,
          time,
          startDate: weekRange.startDate,
          endDate: weekRange.endDate,
        });
      }

      await onLessonAdded?.();

      onOpenChange(false);
      toast.success(t("addLesson.toastSuccess"), {
        description: repeatWeekly
          ? `${selectedGroup?.name ?? "Selected group"} · every week until ${repeatUntil}`
          : `${selectedGroup?.name ?? "Selected group"} · ${date} · ${time}`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? formatRequestError(error)
          : "Unable to create the lesson right now.";
      setSubmitError(message);
      toast.error(t("addLesson.toastErrorLesson"), { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </div>
          <DialogTitle>{t("addLesson.title")}</DialogTitle>
          <DialogDescription>{t("addLesson.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="group">{t("addLesson.labelGroup")}</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger id="group" className="mt-1.5">
                  <SelectValue placeholder={t("addLesson.placeholderGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {formatGroupMeta(group)
                        ? `${group.name} · ${formatGroupMeta(group)}`
                        : group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="subject">{t("addLesson.labelSubject")}</Label>
              <Select
                value={subjectId}
                onValueChange={setSubjectId}
                disabled={!groupId || loadingSubjects || subjects.length === 0}
              >
                <SelectTrigger id="subject" className="mt-1.5">
                  <SelectValue
                    placeholder={
                      !groupId
                        ? t("addLesson.placeholderSubjectFirst")
                        : loadingSubjects
                          ? t("addLesson.placeholderSubjectLoading")
                          : t("addLesson.placeholderSubject")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">{t("addLesson.labelDate")}</Label>
              <Input
                id="date"
                type="date"
                min={weekRange.startDate}
                max={weekRange.endDate}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="time">{t("addLesson.labelTime")}</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger id="time" className="mt-1.5">
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
                <Label htmlFor="auditorium">{t("addLesson.labelAuditorium")}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  onClick={() => setCreateAuditoriumOpen((current) => !current)}
                >
                  {createAuditoriumOpen
                    ? t("addLesson.cancelNewAuditorium")
                    : t("addLesson.createNewAuditorium")}
                </Button>
              </div>
              <Select
                value={auditoriumId}
                onValueChange={setAuditoriumId}
                disabled={loadingAuditoriums || auditoriums.length === 0}
              >
                <SelectTrigger id="auditorium" className="mt-1.5">
                  <SelectValue
                    placeholder={
                      loadingAuditoriums
                        ? t("addLesson.placeholderAuditoriumLoading")
                        : auditoriums.length === 0
                          ? t("addLesson.placeholderAuditoriumEmpty")
                          : t("addLesson.placeholderAuditorium")
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
                  <Label htmlFor="new-auditorium-name">{t("addLesson.newAuditoriumTitle")}</Label>
                  <Input
                    id="new-auditorium-name"
                    placeholder={t("addLesson.placeholderAuditoriumName")}
                    value={newAuditoriumName}
                    onChange={(event) => setNewAuditoriumName(event.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="new-auditorium-building">{t("addLesson.labelBuilding")}</Label>
                  <Select
                    value={newAuditoriumBuilding}
                    onValueChange={(value) =>
                      setNewAuditoriumBuilding(value as ApiAuditorium["building"])
                    }
                  >
                    <SelectTrigger id="new-auditorium-building" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">{t("addLesson.buildingMain")}</SelectItem>
                      <SelectItem value="other">{t("addLesson.buildingOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={creatingAuditorium}
                    onClick={() => void handleCreateAuditorium()}
                  >
                    {creatingAuditorium ? t("addLesson.creating") : t("addLesson.saveAuditorium")}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{t("addLesson.repeatWeekly")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("addLesson.repeatWeeklyDesc")}
                </div>
              </div>
              <Switch checked={repeatWeekly} onCheckedChange={setRepeatWeekly} />
            </div>

            {repeatWeekly ? (
              <div className="mt-3">
                <Label htmlFor="repeat-until">{t("addLesson.repeatUntil")}</Label>
                <Input
                  id="repeat-until"
                  type="date"
                  min={date || weekRange.startDate}
                  value={repeatUntil}
                  onChange={(event) => setRepeatUntil(event.target.value)}
                  className="mt-1.5"
                />
              </div>
            ) : null}
          </div>

          {loadingSubjects ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("addLesson.loadingSubjects")}
            </div>
          ) : null}

          {loadingAuditoriums ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("addLesson.loadingAuditoriums")}
            </div>
          ) : null}

          {subjectsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {subjectsError}
            </div>
          ) : null}

          {auditoriumsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {auditoriumsError}
            </div>
          ) : null}

          {!loadingSubjects && groupId && !subjectsError && subjects.length === 0 ? (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              {t("addLesson.noSubjects")}
            </div>
          ) : null}

          {!loadingAuditoriums && !auditoriumsError && auditoriums.length === 0 ? (
            <div className="rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
              {t("addLesson.noAuditoriums")}
            </div>
          ) : null}

          {submitError ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("addLesson.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingSubjects || !groupId || !subjectId || !date || !time}
            >
              {submitting ? t("addLesson.adding") : t("addLesson.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
