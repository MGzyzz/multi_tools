import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CircleDot,
  Clock,
  GraduationCap,
  ScanFace,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { NewGroupDialog } from "@/components/new-group-dialog";
import {
  formatMarkedAtTime,
  getAttendanceScheduleDetail,
  type AttendanceScheduleDetail,
} from "@/lib/attendance";
import { ApiError, apiRequest } from "@/lib/auth";
import { getGroupList, type ApiGroup } from "@/lib/groups";
import { requireAuth } from "@/lib/route-auth";
import { getScheduleList, getTimeLabel, type ApiScheduleEntry } from "@/lib/schedule";
import { getAllStudents, type ApiStudent } from "@/lib/students";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Dashboard - Lectern" },
      {
        name: "description",
        content:
          "Teacher dashboard powered by the current schedule, groups, students, and attendance APIs.",
      },
    ],
  }),
  component: Dashboard,
});

type LessonStatus = "earlier" | "next" | "scheduled";

type TodayLesson = ApiScheduleEntry & {
  groupName: string;
  status: LessonStatus;
  endTime: string;
  isActionable: boolean;
};

const lessonStatusClasses: Record<LessonStatus, string> = {
  earlier: "bg-muted text-muted-foreground",
  next: "bg-primary/10 text-primary",
  scheduled: "bg-accent text-accent-foreground",
};

function StatusBadge({ status, label }: { status: LessonStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        lessonStatusClasses[status],
      )}
    >
      {status === "next" && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      {label}
    </span>
  );
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

function addMinutesToTimeString(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function toIsoDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function Dashboard() {
  const { t } = useI18n();
  const [scheduleEntries, setScheduleEntries] = useState<ApiScheduleEntry[]>([]);
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [focusAttendance, setFocusAttendance] = useState<AttendanceScheduleDetail | null>(null);
  const [focusAttendanceLoading, setFocusAttendanceLoading] = useState(false);
  const [focusAttendanceError, setFocusAttendanceError] = useState("");
  const [demoSending, setDemoSending] = useState(false);

  useEffect(() => {
    setNow(new Date());

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const monday = startOfCurrentWeek();
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);

        const [scheduleResponse, groupsResponse, studentsResponse] = await Promise.all([
          getScheduleList({
            dateFrom: toIsoDate(monday),
            dateTo: toIsoDate(saturday),
            signal: controller.signal,
          }),
          getGroupList(controller.signal),
          getAllStudents(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setScheduleEntries(scheduleResponse);
        setGroups(groupsResponse.groups);
        setStudents(studentsResponse);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(
          loadError instanceof ApiError ? loadError.message : "Unable to load dashboard data.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();
    return () => controller.abort();
  }, []);

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );

  const todayLessons = useMemo(() => {
    if (!now) return [] as TodayLesson[];

    const todayDate = toIsoDate(now);
    const currentTime = now.toTimeString().slice(0, 8);

    const entries = scheduleEntries
      .filter((entry) => entry.date === todayDate)
      .sort((left, right) => left.time.localeCompare(right.time));

    const nextIndex = entries.findIndex((entry) => {
      const startLabel = getTimeLabel(entry.time);
      const endTimeStr = addMinutesToTimeString(startLabel, 50);
      return endTimeStr > currentTime.slice(0, 5);
    });

    return entries.map((entry, index) => {
      let status: LessonStatus = "scheduled";

      if (nextIndex === -1 || index < nextIndex) {
        status = "earlier";
      } else if (index === nextIndex) {
        status = "next";
      }

      const startLabel = getTimeLabel(entry.time);
      const endTime = addMinutesToTimeString(startLabel, 50);

      const lessonStart = new Date(`${entry.date}T${startLabel}:00`);
      const closeAt = new Date(lessonStart.getTime() + 90 * 60 * 1000);
      const isActionable = now >= lessonStart && now <= closeAt;

      return {
        ...entry,
        groupName: groupNameById.get(entry.group) ?? `Group #${entry.group}`,
        status,
        endTime,
        isActionable,
      };
    });
  }, [groupNameById, now, scheduleEntries]);

  const focusLesson = useMemo(() => {
    return todayLessons.find((lesson) => lesson.status === "next") ?? todayLessons.at(-1) ?? null;
  }, [todayLessons]);

  const todaySummary = useMemo(
    () =>
      todayLessons.reduce(
        (accumulator, lesson) => {
          accumulator[lesson.status] += 1;
          return accumulator;
        },
        { earlier: 0, next: 0, scheduled: 0 },
      ),
    [todayLessons],
  );

  const todayGroups = useMemo(() => {
    return Array.from(new Set(todayLessons.map((lesson) => lesson.groupName)));
  }, [todayLessons]);

  const faceImageCount = useMemo(
    () => students.filter((student) => Boolean(student.face_image)).length,
    [students],
  );

  useEffect(() => {
    if (!focusLesson) {
      setFocusAttendance(null);
      setFocusAttendanceError("");
      return;
    }

    const controller = new AbortController();

    const loadFocusAttendance = async () => {
      setFocusAttendanceLoading(true);
      setFocusAttendanceError("");

      try {
        const response = await getAttendanceScheduleDetail(focusLesson.id, controller.signal);

        if (controller.signal.aborted) return;
        setFocusAttendance(response);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setFocusAttendance(null);
        setFocusAttendanceError(
          loadError instanceof ApiError
            ? loadError.message
            : "Unable to load roster details for the focused lesson.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setFocusAttendanceLoading(false);
        }
      }
    };

    void loadFocusAttendance();
    return () => controller.abort();
  }, [focusLesson]);

  const focusCounts = useMemo(() => {
    if (!focusAttendance) {
      return { total: 0, present: 0, unmarked: 0, lastMarkedAt: null as string | null };
    }

    return focusAttendance.attendances.reduce(
      (accumulator, attendance) => {
        accumulator.total += 1;
        if (attendance.marked_at && attendance.presense) {
          accumulator.present += 1;
        } else if (!attendance.marked_at) {
          accumulator.unmarked += 1;
        }

        if (attendance.marked_at) {
          const formatted = formatMarkedAtTime(attendance.marked_at);
          if (formatted) {
            accumulator.lastMarkedAt = formatted;
          }
        }

        return accumulator;
      },
      { total: 0, present: 0, unmarked: 0, lastMarkedAt: null as string | null },
    );
  }, [focusAttendance]);

  const sendDemoNotification = async () => {
    setDemoSending(true);
    try {
      const data = await apiRequest<{ detail: string }>("/api/demo/send-notification/", {
        method: "POST",
      });
      toast.success(data?.detail ?? "Demo notification sent!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send demo notification.");
    } finally {
      setDemoSending(false);
    }
  };

  const dashboardDescription = loading
    ? t("dashboard.loadingDesc")
    : `${todayLessons.length} ${t("dashboard.descLessonsToday")} - ${groups.length} ${t("dashboard.descGroups")} - ${students.length} ${t("dashboard.descStudents")}`;

  const focusTitle = focusLesson
    ? focusLesson.status === "next"
      ? t("dashboard.focusNextLesson")
      : t("dashboard.focusMostRecent")
    : t("dashboard.focusNoLessons");

  const focusDescription = focusLesson
    ? `${focusLesson.subject_name} - ${focusLesson.groupName}`
    : t("dashboard.focusNoLessonsDesc");

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={dashboardDescription}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void sendDemoNotification()}
              disabled={demoSending}
            >
              <Bell className="h-4 w-4" />
              {demoSending ? t("dashboard.sending") : t("dashboard.sendTestEmail")}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/attendance">
                <CalendarCheck2 className="h-4 w-4" /> {t("dashboard.manualAttendance")}
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/scan">
                <ScanFace className="h-4 w-4" /> {t("dashboard.openFaceScan")}
              </Link>
            </Button>
          </>
        }
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="mt-3 h-7 w-16" />
                <Skeleton className="mt-2 h-3 w-36" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                label={t("dashboard.statTodayLessons")}
                value={todayLessons.length}
                hint={`${todaySummary.earlier} ${t("dashboard.statEarlierAhead")} - ${todaySummary.next + todaySummary.scheduled} ${t("dashboard.statAhead")}`}
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <StatCard
                label={t("dashboard.statTeachingGroups")}
                value={groups.length}
                hint={`${groups.reduce((sum, group) => sum + group.students_count, 0)} ${t("dashboard.statStudentsTotal")}`}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label={t("dashboard.statStudentDirectory")}
                value={students.length}
                hint={`${faceImageCount} ${t("dashboard.statStudentsWithPhoto")}`}
                icon={<GraduationCap className="h-4 w-4" />}
              />
              <StatCard
                label={t("dashboard.statFocusedLesson")}
                value={
                  !focusLesson
                    ? t("dashboard.statFocusedLessonNone")
                    : focusAttendanceLoading
                      ? getTimeLabel(focusLesson.time)
                      : focusAttendance
                        ? `${focusCounts.present}/${focusCounts.total}`
                        : getTimeLabel(focusLesson.time)
                }
                hint={
                  focusLesson
                    ? focusAttendanceLoading
                      ? t("dashboard.statFocusedLessonLoadingAttendance")
                      : `${focusCounts.present} ${t("dashboard.focusPresentUnmarked")} · ${focusCounts.unmarked} ${t("dashboard.focusUnmarkedCount")}`
                    : t("dashboard.statFocusedLessonNoLesson")
                }
                icon={<BookOpen className="h-4 w-4" />}
              />
            </>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title={t("dashboard.todayScheduleTitle")}
            description={t("dashboard.todayScheduleDesc")}
            actions={
              <Button variant="ghost" size="sm" asChild className="h-7">
                <Link to="/schedule">
                  {t("dashboard.fullWeek")} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
            padded={false}
          >
            {loading ? (
              <ul className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-4 px-4 py-2.5">
                    <div className="w-16 shrink-0 space-y-1.5">
                      <Skeleton className="h-3.5 w-10" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-4 w-14 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : todayLessons.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                {t("dashboard.noLessonsToday")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {todayLessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-accent/40",
                      lesson.status === "next" && "bg-primary/[0.025]",
                    )}
                  >
                    <div className="w-16 shrink-0 text-[13px] tabular-nums">
                      <div className="font-semibold">{getTimeLabel(lesson.time)}</div>
                      <div className="text-[11px] text-muted-foreground">{lesson.endTime}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium">
                          {lesson.subject_name}
                        </span>
                        <StatusBadge
                          status={lesson.status}
                          label={t(
                            `dashboard.lessonStatus${lesson.status.charAt(0).toUpperCase()}${lesson.status.slice(1)}`,
                          )}
                        />
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> {lesson.groupName}
                        </span>
                      </div>
                    </div>
                    {lesson.isActionable && (
                      <div className="hidden items-center gap-1 sm:flex">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px]"
                          asChild
                        >
                          <Link to="/attendance" search={{ scheduleId: lesson.id }}>
                            {t("dashboard.manual")}
                          </Link>
                        </Button>
                        <Button size="sm" className="h-7 px-2 text-[11px]" asChild>
                          <Link to="/scan" search={{ scheduleId: lesson.id }}>
                            <ScanFace className="h-3.5 w-3.5" /> {t("dashboard.scan")}
                          </Link>
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="space-y-4">
            <SectionCard padded={false} title={focusTitle} description={focusDescription}>
              <div className="space-y-3 p-4">
                {loading ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-3.5 w-36" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-md border border-border p-2 space-y-1.5">
                          <Skeleton className="mx-auto h-5 w-8" />
                          <Skeleton className="mx-auto h-2.5 w-12" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-8 w-full rounded-md" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 flex-1 rounded-md" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </>
                ) : focusLesson ? (
                  <>
                    <div className="flex items-center gap-2 text-[13px]">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium tabular-nums">
                        {focusLesson.date} - {getTimeLabel(focusLesson.time)}
                      </span>
                      {focusLesson.status === "next" && (
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                          <CircleDot className="h-3 w-3 animate-pulse" /> {t("dashboard.next")}
                        </span>
                      )}
                    </div>

                    {focusAttendanceError ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                        {focusAttendanceError}
                      </div>
                    ) : focusAttendanceLoading ? (
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="rounded-md border border-border p-2 space-y-1.5">
                            <Skeleton className="mx-auto h-5 w-8" />
                            <Skeleton className="mx-auto h-2.5 w-12" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md border border-border p-2">
                          <div className="text-base font-semibold tabular-nums">
                            {focusCounts.total}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t("dashboard.focusRoster")}
                          </div>
                        </div>
                        <div className="rounded-md border border-border p-2">
                          <div className="text-base font-semibold tabular-nums text-success">
                            {focusCounts.present}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t("dashboard.focusPresent")}
                          </div>
                        </div>
                        <div className="rounded-md border border-border p-2">
                          <div className="text-base font-semibold tabular-nums text-muted-foreground">
                            {focusCounts.unmarked}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t("dashboard.focusUnmarked")}
                          </div>
                        </div>
                      </div>
                    )}

                    {!focusAttendanceLoading && (
                      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                        {focusCounts.lastMarkedAt
                          ? `${t("dashboard.focusLastUpdate")} ${focusCounts.lastMarkedAt}.`
                          : t("dashboard.focusNoMarks")}
                      </div>
                    )}

                    {focusLesson.isActionable ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" asChild>
                          <Link to="/scan" search={{ scheduleId: focusLesson.id }}>
                            <ScanFace className="h-3.5 w-3.5" /> {t("dashboard.openFaceScan")}
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/attendance" search={{ scheduleId: focusLesson.id }}>
                            {t("dashboard.manual")}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center">
                        {t("dashboard.attendanceNotOpen")}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("dashboard.focusNoLessonsCard")}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title={t("dashboard.quickActions")}>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/students"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] transition-colors hover:bg-accent"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("dashboard.quickStudents")}
                </Link>
                <NewGroupDialog
                  trigger={
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] transition-colors hover:bg-accent"
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("dashboard.quickNewGroup")}
                    </button>
                  }
                />
                <Link
                  to="/schedule"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] transition-colors hover:bg-accent"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("dashboard.quickSchedule")}
                </Link>
                <Link
                  to="/attendance"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-[13px] transition-colors hover:bg-accent"
                >
                  <CalendarCheck2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("dashboard.quickAttendance")}
                </Link>
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title={t("dashboard.teachingFootprintTitle")}
            description={t("dashboard.teachingFootprintDesc")}
          >
            {loading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
            ) : todayGroups.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("dashboard.noGroupsToday")}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {todayGroups.map((groupName) => {
                  const group = groups.find((g) => g.name === groupName);
                  return (
                    <Link
                      key={groupName}
                      to="/students"
                      search={{ group: groupName }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary/20"
                    >
                      {groupName}
                      {group && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-px text-[10px]">
                          {group.students_count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={t("dashboard.coverageTitle")}
            description={t("dashboard.coverageDesc")}
          >
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t("dashboard.coverageP1")}</p>
              <p>{t("dashboard.coverageP2")}</p>
              <p>{t("dashboard.coverageP3")}</p>
            </div>
          </SectionCard>
        </div>
      </PageBody>
    </>
  );
}
