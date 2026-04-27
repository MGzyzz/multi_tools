import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageBody, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AddLessonDialog } from "@/components/add-lesson-dialog";
import { EditLessonDialog } from "@/components/edit-lesson-dialog";
import { ApiError } from "@/lib/auth";
import { getGroupList } from "@/lib/groups";
import { requireAuth } from "@/lib/route-auth";
import {
  getScheduleList,
  getTeachingTimeSlots,
  getTimeLabel,
  type ApiScheduleEntry,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

const WEEK_DAY_KEYS = [
  "schedule.dayMon",
  "schedule.dayTue",
  "schedule.dayWed",
  "schedule.dayThu",
  "schedule.dayFri",
  "schedule.daySat",
];
const subjectToneClasses = [
  "border-l-primary bg-primary/[0.06] text-foreground",
  "border-l-info bg-info/[0.08] text-foreground",
  "border-l-success bg-success/[0.08] text-foreground",
  "border-l-warning bg-warning/[0.12] text-foreground",
  "border-l-destructive bg-destructive/[0.08] text-foreground",
];

const pad = (value: number) => String(value).padStart(2, "0");
const formatDateKey = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
const teachingSlots = getTeachingTimeSlots();
const teachingSlotMap = new Map(teachingSlots.map((slot) => [slot.start, slot]));

const getSlotStatus = (date: string, time: string) => {
  const lessonStart = new Date(`${date}T${time}:00`);
  const lessonEnd = new Date(lessonStart.getTime() + 90 * 60 * 1000);
  const openAt = new Date(lessonStart.getTime() - 15 * 60 * 1000);
  const now = new Date();

  if (now < openAt) return "upcoming" as const;
  if (now > lessonEnd) return "ended" as const;
  return "live" as const;
};

export const Route = createFileRoute("/schedule")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Schedule - Lectern" },
      { name: "description", content: "Weekly planner powered by the current schedule API." },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { t } = useI18n();
  const weekDayLabels = WEEK_DAY_KEYS.map((k) => t(k));
  const [weekOffset, setWeekOffset] = useState(0);
  const [allSchedules, setAllSchedules] = useState<ApiScheduleEntry[]>([]);
  const [groupNames, setGroupNames] = useState<Record<number, string>>({});
  const [groupOptions, setGroupOptions] = useState<
    Array<{ id: number; name: string; course: string; specialty: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [editingLessons, setEditingLessons] = useState<ApiScheduleEntry[]>([]);
  const [editLessonOpen, setEditLessonOpen] = useState(false);

  const weekDates = useMemo(() => {
    const today = new Date();
    const currentWeekDay = today.getDay();
    const mondayOffset = currentWeekDay === 0 ? -6 : 1 - currentWeekDay;
    const monday = new Date(today);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);

    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }, [weekOffset]);

  const dateRange = useMemo(() => {
    return {
      startDate: formatDateKey(weekDates[0]),
      endDate: formatDateKey(weekDates[weekDates.length - 1]),
    };
  }, [weekDates]);

  const loadWeek = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");

      try {
        const [scheduleResponse, groupsResponse] = await Promise.all([
          getScheduleList({
            dateFrom: dateRange.startDate,
            dateTo: dateRange.endDate,
            showAll: true,
            signal,
          }),
          getGroupList(signal),
        ]);

        if (signal?.aborted) return;

        setAllSchedules(scheduleResponse);
        setGroupNames(
          Object.fromEntries(groupsResponse.groups.map((group) => [group.id, group.name])),
        );
        setGroupOptions(
          groupsResponse.groups.map((group) => ({
            id: group.id,
            name: group.name,
            course: group.course,
            specialty: group.group_specialty,
          })),
        );
      } catch (err) {
        if (signal?.aborted) return;

        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Unable to load schedule right now.");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [dateRange.endDate, dateRange.startDate],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadWeek(controller.signal);

    return () => controller.abort();
  }, [loadWeek]);

  const schedules = useMemo(
    () => (showAll ? allSchedules : allSchedules.filter((item) => item.is_mine !== false)),
    [allSchedules, showAll],
  );

  const subjectClassMap = useMemo(() => {
    const subjects = Array.from(new Set(schedules.map((item) => item.subject_name))).sort();
    return Object.fromEntries(
      subjects.map((subject, index) => [
        subject,
        subjectToneClasses[index % subjectToneClasses.length],
      ]),
    ) as Record<string, string>;
  }, [schedules]);

  const legendSubjects = useMemo(
    () => Array.from(new Set(schedules.map((item) => item.subject_name))).sort(),
    [schedules],
  );

  const timeSlots = useMemo(() => {
    const apiSlots = schedules.map((entry) => getTimeLabel(entry.time));
    return Array.from(new Set([...teachingSlots.map((slot) => slot.start), ...apiSlots])).sort();
  }, [schedules]);

  const scheduleMap = useMemo(() => {
    const entries = new Map<string, ApiScheduleEntry[]>();

    for (const entry of schedules) {
      const key = `${entry.date}-${getTimeLabel(entry.time)}`;
      const current = entries.get(key) ?? [];
      current.push(entry);
      entries.set(key, current);
    }

    return entries;
  }, [schedules]);

  const allScheduleMap = useMemo(() => {
    const entries = new Map<string, ApiScheduleEntry[]>();

    for (const entry of allSchedules) {
      const key = `${entry.date}-${getTimeLabel(entry.time)}`;
      const current = entries.get(key) ?? [];
      current.push(entry);
      entries.set(key, current);
    }

    return entries;
  }, [allSchedules]);

  const weekDescription = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return `${t("schedule.weeklyPlanner")} · ${formatter.format(weekDates[0])} - ${formatter.format(weekDates[5])}`;
  }, [weekDates, t]);

  const activeDaysCount = useMemo(() => {
    const daysWithLessons = new Set(schedules.map((entry) => entry.date));
    return daysWithLessons.size;
  }, [schedules]);

  const freeSlotsCount = Math.max(timeSlots.length * weekDates.length - schedules.length, 0);

  const formatDayOfMonth = (value: Date) =>
    new Intl.DateTimeFormat("en-US", { day: "numeric" }).format(value);

  const todayKey = formatDateKey(new Date());

  const openAddLessonDialog = (slot?: { date: string; time: string }) => {
    setSelectedSlot(slot ?? null);
    setAddLessonOpen(true);
  };

  const openEditLessonDialog = (lessons: ApiScheduleEntry[]) => {
    setEditingLessons(lessons);
    setEditLessonOpen(true);
  };

  const handleLessonAdded = async () => {
    await loadWeek();
    setSelectedSlot(null);
  };

  const handleLessonEdited = async () => {
    await loadWeek();
    setEditingLessons([]);
  };

  return (
    <>
      <PageHeader
        title={t("schedule.title")}
        description={weekDescription}
        actions={
          <>
            <div className="inline-flex h-9 items-center rounded-md border border-input bg-background">
              <button
                type="button"
                className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setWeekOffset((current) => current - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="border-x border-input px-3 text-sm font-medium"
              >
                {t("schedule.today")}
              </button>
              <button
                type="button"
                className="flex h-full w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setWeekOffset((current) => current + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant={showAll ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAll ? t("schedule.hideOccupied") : t("schedule.showOccupied")}
            </Button>
            <Button size="sm" onClick={() => openAddLessonDialog()}>
              <Plus className="h-4 w-4" /> {t("schedule.addLesson")}
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {legendSubjects.length > 0 ? (
            legendSubjects.map((subject) => (
              <div key={subject} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-sm",
                    subjectClassMap[subject]?.includes("bg-info")
                      ? "bg-info"
                      : subjectClassMap[subject]?.includes("bg-success")
                        ? "bg-success"
                        : subjectClassMap[subject]?.includes("bg-warning")
                          ? "bg-warning"
                          : subjectClassMap[subject]?.includes("bg-destructive")
                            ? "bg-destructive"
                            : "bg-primary",
                  )}
                />
                {subject}
              </div>
            ))
          ) : (
            <div>{t("schedule.noLessonsWeek")}</div>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {t("schedule.week")}{" "}
            {weekOffset === 0
              ? t("schedule.weekCurrent")
              : weekOffset > 0
                ? `+${weekOffset}`
                : weekOffset}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">
            {t("schedule.loading")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="grid grid-cols-[80px_repeat(6,1fr)] border-b border-border bg-muted/30">
              <div className="flex items-center justify-center px-2 py-2.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              {weekDates.map((date, index) => (
                <div
                  key={formatDateKey(date)}
                  className={cn(
                    "px-3 py-2.5 text-xs font-medium",
                    formatDateKey(date) === todayKey && weekOffset === 0 && "bg-primary/[0.04]",
                  )}
                >
                  <div className="text-foreground">{weekDayLabels[index]}</div>
                  <div className="tabular-nums text-muted-foreground">{formatDayOfMonth(date)}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[80px_repeat(6,1fr)]">
              {timeSlots.map((time) => (
                <div key={time} className="contents">
                  <div className="border-b border-r border-border bg-muted/20 px-2 py-3 text-right text-[11px] tabular-nums text-muted-foreground">
                    <div>{time}</div>
                    {teachingSlotMap.get(time) ? (
                      <div className="text-[10px] text-muted-foreground/70">
                        {teachingSlotMap.get(time)?.end}
                      </div>
                    ) : null}
                  </div>
                  {weekDates.map((date) => {
                    const dateKey = formatDateKey(date);
                    const slotEntries = scheduleMap.get(`${dateKey}-${time}`) ?? [];
                    const allSlotEntries = allScheduleMap.get(`${dateKey}-${time}`) ?? [];
                    const slot = slotEntries[0];
                    const canCreateInSlot = teachingSlotMap.has(time);
                    const slotStatus = getSlotStatus(dateKey, time);
                    const isPastSlot = slotStatus === "ended";
                    const hasHiddenOccupied =
                      !showAll && !slot && allSlotEntries.some((entry) => entry.is_mine === false);
                    const groupName = slot ? groupNames[slot.group] || `Group #${slot.group}` : "";
                    const auditoriumLabel =
                      slot && slot.auditorium_name
                        ? `${slot.auditorium_building_label ?? "Auditorium"} · ${slot.auditorium_name}`
                        : "";

                    const isMine = slot?.is_mine !== false;

                    return slot && !isMine ? (
                      <div
                        key={`${dateKey}-${time}`}
                        className={cn(
                          "min-h-[64px] border-b border-r border-border p-1.5",
                          dateKey === todayKey && weekOffset === 0 && "bg-primary/[0.02]",
                        )}
                        title={t("schedule.occupiedTooltip")}
                      >
                        <div className="flex h-full w-full flex-col items-start gap-0.5 rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 p-2 cursor-not-allowed">
                          <div className="text-[11px] font-medium leading-tight text-foreground/70">
                            {slot.subject_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{groupName}</div>
                          <div className="text-[10px] font-medium text-muted-foreground">
                            {t("schedule.anotherTeacher")}
                          </div>
                        </div>
                      </div>
                    ) : slot && isPastSlot ? (
                      <div
                        key={`${dateKey}-${time}`}
                        className={cn(
                          "min-h-[64px] cursor-not-allowed border-b border-r border-border p-1.5",
                          dateKey === todayKey && weekOffset === 0 && "bg-primary/[0.02]",
                        )}
                        title={t("schedule.pastTooltip")}
                      >
                        <div className="flex h-full w-full flex-col items-start gap-0.5 rounded-md border border-border bg-muted/55 p-2 text-left shadow-sm">
                          <div className="text-[11px] font-semibold leading-tight text-foreground/90">
                            {slot.subject_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground/90">{groupName}</div>
                          {auditoriumLabel ? (
                            <div className="text-[10px] text-muted-foreground/90">
                              {auditoriumLabel}
                            </div>
                          ) : null}
                          {slotEntries.length > 1 && (
                            <div className="text-[10px] text-muted-foreground/90">
                              +{slotEntries.length - 1} {t("schedule.moreInSlot")}
                            </div>
                          )}
                          <div className="mt-1 rounded-full border border-border bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                            {t("schedule.past")}
                          </div>
                        </div>
                      </div>
                    ) : slot ? (
                      <button
                        type="button"
                        key={`${dateKey}-${time}`}
                        onClick={() => openEditLessonDialog(slotEntries)}
                        className={cn(
                          "min-h-[64px] w-full border-b border-r border-border p-1.5 text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-[-2px]",
                          dateKey === todayKey && weekOffset === 0 && "bg-primary/[0.02]",
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-full w-full flex-col items-start gap-0.5 rounded-md border-l-2 p-2 text-left",
                            subjectClassMap[slot.subject_name] ?? "border-l-muted bg-muted/30",
                          )}
                        >
                          <div className="text-[11px] font-medium leading-tight">
                            {slot.subject_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{groupName}</div>
                          {auditoriumLabel ? (
                            <div className="text-[10px] text-muted-foreground">
                              {auditoriumLabel}
                            </div>
                          ) : null}
                          {slotEntries.length > 1 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{slotEntries.length - 1} {t("schedule.moreInSlot")}
                            </div>
                          )}
                        </div>
                      </button>
                    ) : hasHiddenOccupied ? (
                      <TooltipProvider delayDuration={120}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              key={`${dateKey}-${time}`}
                              className={cn(
                                "min-h-[64px] cursor-not-allowed border-b border-r border-border p-1.5",
                                dateKey === todayKey && weekOffset === 0 && "bg-primary/[0.02]",
                              )}
                            >
                              <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/30 text-[10px] font-medium text-muted-foreground/75">
                                {t("schedule.unavailable")}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            sideOffset={8}
                            className="max-w-56 border border-border bg-card px-3 py-2 text-[11px] leading-relaxed text-foreground shadow-2xl"
                          >
                            {t("schedule.occupiedAddBlocked")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : canCreateInSlot && isPastSlot ? (
                      <div
                        key={`${dateKey}-${time}`}
                        className={cn(
                          "min-h-[64px] cursor-not-allowed border-b border-r border-border p-1.5",
                          dateKey === todayKey && weekOffset === 0 && "bg-primary/[0.02]",
                        )}
                        title={t("schedule.pastTooltip")}
                      >
                        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-[10px] font-semibold tracking-wide text-foreground/65">
                          {t("schedule.past")}
                        </div>
                      </div>
                    ) : canCreateInSlot ? (
                      <button
                        type="button"
                        key={`${dateKey}-${time}`}
                        onClick={() => openAddLessonDialog({ date: dateKey, time })}
                        className={cn(
                          "min-h-[64px] w-full border-b border-r border-border p-1.5 text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-[-2px]",
                          dateKey === todayKey && weekOffset === 0 && "bg-primary/[0.02]",
                        )}
                      >
                        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border/70 text-[10px] text-muted-foreground/60">
                          {t("schedule.clickToAdd")}
                        </div>
                      </button>
                    ) : (
                      <div
                        key={`${dateKey}-${time}`}
                        className={cn(
                          "min-h-[64px] border-b border-r border-border p-1.5",
                          dateKey === todayKey && weekOffset === 0 && "bg-primary/[0.02]",
                        )}
                      >
                        <div className="flex h-full w-full items-center justify-center rounded-md text-[10px] text-muted-foreground/35">
                          {t("schedule.unavailable")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("schedule.statLessonsWeek")}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{schedules.length}</div>
          </div>
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("schedule.statActiveDays")}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{activeDaysCount}</div>
          </div>
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("schedule.statFreeSlots")}
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{freeSlotsCount}</div>
          </div>
        </div>

        <AddLessonDialog
          open={addLessonOpen}
          onOpenChange={(open) => {
            setAddLessonOpen(open);
            if (!open) {
              setSelectedSlot(null);
            }
          }}
          groups={groupOptions}
          timeOptions={teachingSlots}
          weekRange={dateRange}
          initialDate={selectedSlot?.date}
          initialTime={selectedSlot?.time}
          onLessonAdded={handleLessonAdded}
        />
        <EditLessonDialog
          open={editLessonOpen}
          onOpenChange={(open) => {
            setEditLessonOpen(open);
            if (!open) {
              setEditingLessons([]);
            }
          }}
          lessons={editingLessons}
          groupNames={groupNames}
          timeOptions={teachingSlots}
          weekRange={dateRange}
          onLessonUpdated={handleLessonEdited}
        />
      </PageBody>
    </>
  );
}
