import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  X,
  Clock,
  Search,
  Save,
  Users,
  CalendarCheck2,
  ScanFace,
  KeyboardIcon,
  AlertCircle,
} from "lucide-react";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  formatMarkedAtTime,
  getAttendanceScheduleDetail,
  getAttendanceStudentName,
  markAttendance,
  updateAttendance,
  type ApiAttendanceRow,
} from "@/lib/attendance";
import { ApiError } from "@/lib/auth";
import { requireAuth } from "@/lib/route-auth";
import { getScheduleList, getTimeLabel, type ApiScheduleEntry } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attendance")({
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>) => ({
    scheduleId: search.scheduleId ? Number(search.scheduleId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Attendance - Lectern" },
      { name: "description", content: "Manual roll call powered by the live attendance API." },
    ],
  }),
  component: AttendancePage,
});

type AttendanceStatus = "present" | "absent" | "unmarked";

type AttendanceStudent = {
  id: number;
  attendanceId: number;
  studentId: number;
  name: string;
  telegram: string | null;
  score: string | null;
  status: AttendanceStatus;
  markedAt: string | null;
};

const statusToneClass: Record<Exclude<AttendanceStatus, "unmarked">, string> = {
  present: "bg-success/10 text-success border-success/30",
  absent: "bg-destructive/10 text-destructive border-destructive/30",
};

function mapAttendanceRow(row: ApiAttendanceRow): AttendanceStudent {
  return {
    id: row.student.id,
    attendanceId: row.id,
    studentId: row.student.id,
    name: getAttendanceStudentName(row),
    telegram: row.student.telegram_username,
    score: row.score,
    status: row.status === "present" ? "present" : row.status === "absent" || row.status === "late" ? "absent" : "unmarked",
    markedAt: formatMarkedAtTime(row.marked_at),
  };
}

function startOfCurrentWeek() {
  const today = new Date();
  const currentWeekDay = today.getDay();
  const mondayOffset = currentWeekDay === 0 ? -6 : 1 - currentWeekDay;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + mondayOffset);
  return monday;
}

function toIsoDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatScheduleLabel(entry: ApiScheduleEntry, locale: string) {
  const date = new Date(`${entry.date}T00:00:00`);
  const day = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return `${day} · ${getTimeLabel(entry.time)} · ${entry.subject_name}`;
}

function getScheduleSessionStatus(entry: ApiScheduleEntry) {
  const lessonStart = new Date(`${entry.date}T${getTimeLabel(entry.time)}:00`);
  const lessonEnd = new Date(lessonStart.getTime() + 90 * 60 * 1000);
  const now = new Date();

  if (now < lessonStart) return "upcoming" as const;
  if (now > lessonEnd) return "ended" as const;
  return "live" as const;
}

function AttendancePage() {
  const { t, lang } = useI18n();
  const locale = lang === "ru" ? "ru-RU" : lang === "kk" ? "kk-KZ" : "en-US";
  const { scheduleId: scheduleIdParam } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [scheduleOptions, setScheduleOptions] = useState<ApiScheduleEntry[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    scheduleIdParam ?? null,
  );
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [sessionInfo, setSessionInfo] = useState<{
    id: number;
    date: string;
    time: string;
    groupName: string;
    subjectName: string;
  } | null>(null);

  const weekRange = useMemo(() => {
    const monday = startOfCurrentWeek();
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: toIsoDate(monday),
      endDate: toIsoDate(sunday),
      todayDate: toIsoDate(new Date()),
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadSchedules = async () => {
      setScheduleLoading(true);
      setScheduleError("");

      try {
        const response = await getScheduleList({
          dateFrom: weekRange.startDate,
          dateTo: weekRange.endDate,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setScheduleOptions(response);

        // Only today's or upcoming lessons are selectable (matches the dropdown
        // filter below). Without this, days with no lesson today fell back to
        // response[0] — a past lesson — and showed stale attendance marks.
        const selectableEntries = response.filter(
          (entry) => entry.date >= weekRange.todayDate,
        );

        const nextSelectedId =
          scheduleIdParam && response.some((entry) => entry.id === scheduleIdParam)
            ? scheduleIdParam
            : (selectableEntries.find((entry) => getScheduleSessionStatus(entry) === "live")?.id ??
              selectableEntries.find((entry) => entry.date === weekRange.todayDate)?.id ??
              selectableEntries[0]?.id ??
              null);

        setSelectedScheduleId(nextSelectedId);
      } catch (error) {
        if (controller.signal.aborted) return;

        setScheduleError(
          error instanceof ApiError ? error.message : "Unable to load this week's lessons.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setScheduleLoading(false);
        }
      }
    };

    void loadSchedules();

    return () => controller.abort();
  }, [weekRange.endDate, weekRange.startDate, weekRange.todayDate]);

  useEffect(() => {
    if (scheduleLoading) return;
    if (!selectedScheduleId) {
      setStudents([]);
      setSessionInfo(null);
      return;
    }

    const controller = new AbortController();

    const loadAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError("");

      try {
        const response = await getAttendanceScheduleDetail(selectedScheduleId, controller.signal);

        if (controller.signal.aborted) return;

        setSessionInfo({
          id: response.schedule.id,
          date: response.schedule.date,
          time: getTimeLabel(response.schedule.time),
          groupName: response.schedule.group.name,
          subjectName: response.schedule.subject.name,
        });
        setStudents(response.attendances.map(mapAttendanceRow));
      } catch (error) {
        if (controller.signal.aborted) return;

        setAttendanceError(
          error instanceof ApiError ? error.message : "Unable to load attendance rows.",
        );
        setStudents([]);
        setSessionInfo(null);
      } finally {
        if (!controller.signal.aborted) {
          setAttendanceLoading(false);
        }
      }
    };

    void loadAttendance();

    return () => controller.abort();
  }, [scheduleLoading, selectedScheduleId]);

  const sessionTimeStatus = useMemo<"upcoming" | "live" | "ended" | null>(() => {
    if (!sessionInfo) return null;

    const lessonStart = new Date(`${sessionInfo.date}T${sessionInfo.time}:00`);
    const lessonEnd = new Date(lessonStart.getTime() + 90 * 60 * 1000);
    const now = new Date();

    if (now < lessonStart) return "upcoming";
    if (now > lessonEnd) return "ended";
    return "live";
  }, [sessionInfo]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return students;

    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(normalizedQuery) ||
        (student.telegram ?? "").toLowerCase().includes(normalizedQuery),
    );
  }, [query, students]);

  const counts = useMemo(
    () =>
      students.reduce(
        (accumulator, student) => {
          accumulator[student.status] += 1;
          return accumulator;
        },
        { present: 0, absent: 0, unmarked: 0 },
      ),
    [students],
  );

  const handleMarkStudent = async (studentId: number, markAsPresent: boolean) => {
    const current = students.find((student) => student.id === studentId);
    if (!current) return;

    const optimisticMarkedAt = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    setStudents((previous) =>
      previous.map((student) =>
        student.id === studentId
          ? {
              ...student,
              status: markAsPresent ? "present" : "absent",
              markedAt: optimisticMarkedAt,
            }
          : student,
      ),
    );

    try {
      const response = await updateAttendance(current.attendanceId, {
        status: markAsPresent ? "present" : "absent",
      });

      setStudents((previous) =>
        previous.map((student) =>
          student.id === studentId ? mapAttendanceRow(response.attendance) : student,
        ),
      );
    } catch (error) {
      setStudents((previous) =>
        previous.map((student) => (student.id === studentId ? current : student)),
      );

      toast.error("Could not update attendance", {
        description:
          error instanceof ApiError ? error.message : "The change was not saved to the server.",
      });
    }
  };

  const reloadSelectedSchedule = async () => {
    if (!selectedScheduleId) return;

    const response = await getAttendanceScheduleDetail(selectedScheduleId);
    setSessionInfo({
      id: response.schedule.id,
      date: response.schedule.date,
      time: getTimeLabel(response.schedule.time),
      groupName: response.schedule.group.name,
      subjectName: response.schedule.subject.name,
    });
    setStudents(response.attendances.map(mapAttendanceRow));
  };

  const handleMarkAllPresent = async () => {
    if (!sessionInfo) return;

    setSavingAll(true);

    try {
      await markAttendance(
        sessionInfo.id,
        students.map((student) => student.studentId),
      );
      await reloadSelectedSchedule();
      toast.success("Attendance updated", {
        description: "All students were marked present for this lesson.",
      });
    } catch (error) {
      toast.error("Could not mark everyone present", {
        description: error instanceof ApiError ? error.message : "The bulk update was not saved.",
      });
    } finally {
      setSavingAll(false);
    }
  };

  const handleSaveSession = async () => {
    if (!sessionInfo) return;

    setSavingAll(true);

    try {
      const presentIds = students
        .filter((student) => student.status === "present")
        .map((student) => student.studentId);

      await markAttendance(sessionInfo.id, presentIds);
      await reloadSelectedSchedule();
      toast.success("Session saved", {
        description: "Current manual roll call was synced with the backend.",
      });
    } catch (error) {
      toast.error("Could not save session", {
        description:
          error instanceof ApiError ? error.message : "The current attendance state was not saved.",
      });
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t("attendance.title")}
        description={t("attendance.description")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleMarkAllPresent()}
              disabled={
                !sessionInfo || savingAll || attendanceLoading || sessionTimeStatus !== "live"
              }
            >
              <Check className="h-4 w-4" /> {t("attendance.markAllPresent")}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveSession()}
              disabled={
                !sessionInfo || savingAll || attendanceLoading || sessionTimeStatus !== "live"
              }
            >
              <Save className="h-4 w-4" /> {t("attendance.saveSession")}
            </Button>
          </>
        }
      />
      <PageBody>
        {scheduleLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-16 w-full rounded-md" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-md" />
              ))}
            </div>
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border p-2.5">
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
              <ul className="divide-y divide-border">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 inline-flex rounded-md border border-border bg-card p-0.5">
              <button
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-medium",
                  "bg-accent text-accent-foreground",
                )}
                type="button"
              >
                <KeyboardIcon className="h-3.5 w-3.5" /> {t("attendance.modeManual")}
              </button>
              <Link
                to="/scan"
                className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                <ScanFace className="h-3.5 w-3.5" /> {t("attendance.modeFaceScan")}
                <span className="rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-primary">
                  AI
                </span>
              </Link>
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CalendarCheck2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold">
                    {sessionInfo
                      ? `${sessionInfo.subjectName} · ${sessionInfo.groupName}`
                      : t("attendance.selectLesson")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {sessionInfo
                      ? `${sessionInfo.date} · ${sessionInfo.time} · ${students.length} ${t("attendance.studentsCount")}`
                      : t("attendance.selectLessonDesc")}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-[12px]">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={selectedScheduleId ?? ""}
                    onChange={(event) =>
                      setSelectedScheduleId(event.target.value ? Number(event.target.value) : null)
                    }
                    className="bg-transparent outline-none"
                    disabled={scheduleLoading || scheduleOptions.length === 0}
                  >
                    {scheduleOptions.length === 0 ? (
                      <option value="">{t("attendance.noLessonsWeek")}</option>
                    ) : (
                      scheduleOptions
                        .filter((entry) => entry.date >= weekRange.todayDate)
                        .map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {formatScheduleLabel(entry, locale)}
                          </option>
                        ))
                    )}
                  </select>
                </div>
                {sessionInfo && (
                  <Button variant="outline" size="sm" className="h-8">
                    <Clock className="h-3.5 w-3.5" /> {sessionInfo.time}
                  </Button>
                )}
              </div>
            </div>

            {scheduleError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{scheduleError}</span>
                </div>
              </div>
            )}

            {attendanceError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{attendanceError}</span>
                </div>
              </div>
            )}

            {!scheduleLoading && scheduleOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <div className="text-base font-medium">{t("attendance.noLessonsWeekTitle")}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("attendance.noLessonsWeekDesc")}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      key: "present",
                      labelKey: "attendance.statPresent",
                      value: counts.present,
                      className: "text-success",
                    },
                    {
                      key: "absent",
                      labelKey: "attendance.statAbsent",
                      value: counts.absent,
                      className: "text-destructive",
                    },
                    {
                      key: "unmarked",
                      labelKey: "attendance.statUnmarked",
                      value: counts.unmarked,
                      className: "text-muted-foreground",
                    },
                    {
                      key: "rate",
                      labelKey: "attendance.statAttendance",
                      value:
                        students.length > 0
                          ? `${Math.round((counts.present / students.length) * 100)}%`
                          : "—",
                      className: "text-foreground",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t(item.labelKey)}
                      </div>
                      <div className={cn("text-base font-semibold tabular-nums", item.className)}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <SectionCard padded={false}>
                  <div className="flex flex-col gap-2 border-b border-border p-2.5 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t("attendance.searchPlaceholder")}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        className="h-8 pl-8 text-[13px]"
                      />
                    </div>
                  </div>

                  {attendanceLoading ? (
                    <ul className="divide-y divide-border">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-2">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-36" />
                            <Skeleton className="h-3 w-48" />
                          </div>
                          <Skeleton className="h-7 w-7 rounded-md" />
                          <Skeleton className="h-7 w-7 rounded-md" />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <>
                      <ul className="divide-y divide-border">
                        {filtered.map((student, index) => (
                          <li
                            key={student.attendanceId}
                            className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-accent/30"
                          >
                            <div className="w-6 text-right text-[11px] tabular-nums text-muted-foreground">
                              {index + 1}
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                              {student.name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join("")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-medium">{student.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {student.telegram
                                  ? `Telegram: ${student.telegram}`
                                  : t("attendance.telegramNotConnected")}
                                {student.markedAt
                                  ? ` · ${t("attendance.markedAt")} ${student.markedAt}`
                                  : ` · ${t("attendance.notMarkedYet")}`}
                              </div>
                            </div>

                            {student.score !== null && (
                              <span className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground sm:inline-flex">
                                {student.score}
                              </span>
                            )}

                            {student.status !== "unmarked" && (
                              <span
                                className={cn(
                                  "hidden rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize sm:inline-flex",
                                  statusToneClass[student.status],
                                )}
                              >
                                {student.status}
                              </span>
                            )}

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleMarkStudent(student.id, true)}
                                title={t("attendance.statPresent")}
                                disabled={sessionTimeStatus !== "live"}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                  student.status === "present"
                                    ? statusToneClass.present
                                    : "border-border bg-background hover:bg-accent",
                                )}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleMarkStudent(student.id, false)}
                                title={t("attendance.statAbsent")}
                                disabled={sessionTimeStatus !== "live"}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                  student.status === "absent"
                                    ? statusToneClass.absent
                                    : "border-border bg-background hover:bg-accent",
                                )}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                        {filtered.length === 0 && (
                          <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                            {t("attendance.noMatchQuery")}
                          </li>
                        )}
                      </ul>

                      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
                        <span>
                          {counts.unmarked === 0
                            ? t("attendance.allReviewed")
                            : `${counts.unmarked} ${t("attendance.stillUnmarked")}`}
                        </span>
                        <Link to="/groups" className="text-primary hover:underline">
                          {t("attendance.openGroupRoster")}
                        </Link>
                      </div>
                    </>
                  )}
                </SectionCard>
              </>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
