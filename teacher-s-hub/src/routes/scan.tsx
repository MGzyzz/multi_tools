import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCcw,
  ScanFace,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import {
  formatMarkedAtTime,
  getAttendanceScheduleDetail,
  getAttendanceStudentName,
  updateAttendance,
  type ApiAttendanceRow,
} from "@/lib/attendance";
import { ApiError } from "@/lib/auth";
import { requireAuth } from "@/lib/route-auth";
import { recognizeStudentFace, type FaceRecognitionResult } from "@/lib/scan";
import { getScheduleList, getTimeLabel, type ApiScheduleEntry } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scan")({
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>) => ({
    scheduleId: search.scheduleId ? Number(search.scheduleId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Face scan attendance - Lectern" },
      {
        name: "description",
        content:
          "AI-assisted face recognition for classroom attendance. Camera-based identity scan with manual fallback.",
      },
    ],
  }),
  component: ScanPage,
});

type ScanState =
  | "idle"
  | "permission"
  | "ready"
  | "liveness"
  | "scanning"
  | "matched"
  | "unknown"
  | "unavailable";

type AttendanceStatus = "present" | "absent" | "unmarked";

type ScanStudent = {
  attendanceId: number;
  studentId: number;
  name: string;
  telegram: string | null;
  status: AttendanceStatus;
  markedAt: string | null;
};

type ScanEventStatus =
  | "recognized"
  | "outside-session"
  | "not-recognized"
  | "liveness-failed"
  | "no-face"
  | "empty-embeddings"
  | "error";

type ScanEvent = {
  id: string;
  time: string;
  label: string;
  details: string;
  similarity: number | null;
  status: ScanEventStatus;
};

const STATE_TONES: Record<ScanState, "info" | "success" | "warning" | "destructive" | "muted"> = {
  idle: "muted",
  permission: "warning",
  ready: "info",
  liveness: "info",
  scanning: "info",
  matched: "success",
  unknown: "warning",
  unavailable: "destructive",
};

const STATE_LABEL_KEYS: Record<ScanState, string> = {
  idle: "scan.stateLabelIdle",
  permission: "scan.stateLabelPermission",
  ready: "scan.stateLabelReady",
  liveness: "scan.stateLabelLiveness",
  scanning: "scan.stateLabelScanning",
  matched: "scan.stateLabelMatched",
  unknown: "scan.stateLabelUnknown",
  unavailable: "scan.stateLabelUnavailable",
};

const toneClass = {
  info: "text-info bg-info/10 border-info/30",
  success: "text-success bg-success/10 border-success/30",
  warning: "text-warning-foreground bg-warning/15 border-warning/40",
  destructive: "text-destructive bg-destructive/10 border-destructive/30",
  muted: "text-muted-foreground bg-muted border-border",
} as const;

const eventToneClass: Record<ScanEventStatus, string> = {
  recognized: toneClass.success,
  "outside-session": toneClass.warning,
  "not-recognized": toneClass.warning,
  "liveness-failed": toneClass.warning,
  "no-face": toneClass.warning,
  "empty-embeddings": toneClass.destructive,
  error: toneClass.destructive,
};

function StateChip({ state, label }: { state: ScanState; label: string }) {
  const tone = STATE_TONES[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        toneClass[tone],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "info" && "bg-info animate-pulse",
          tone === "warning" && "bg-warning",
          tone === "destructive" && "bg-destructive",
          tone === "muted" && "bg-muted-foreground",
        )}
      />
      {label}
    </span>
  );
}

function mapAttendanceRow(row: ApiAttendanceRow): ScanStudent {
  return {
    attendanceId: row.id,
    studentId: row.student.id,
    name: getAttendanceStudentName(row),
    telegram: row.student.telegram_username,
    status: row.marked_at ? (row.presense ? "present" : "absent") : "unmarked",
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
  const openAt = new Date(lessonStart.getTime() - 15 * 60 * 1000);
  const now = new Date();

  if (now < openAt) return "upcoming" as const;
  if (now > lessonEnd) return "ended" as const;
  return "live" as const;
}

function formatSimilarity(value: number | null) {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Camera permission was denied.";
    if (error.name === "NotFoundError") return "No camera device was found on this machine.";
  }
  return "The browser could not start the camera stream.";
}

function createEventId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ScanPage() {
  const { t, lang } = useI18n();
  const locale = lang === "ru" ? "ru-RU" : lang === "kk" ? "kk-KZ" : "en-US";
  const { scheduleId: scheduleIdParam } = Route.useSearch();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [now, setNow] = useState(() => new Date());
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scheduleOptions, setScheduleOptions] = useState<ApiScheduleEntry[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    scheduleIdParam ?? null,
  );
  const [students, setStudents] = useState<ScanStudent[]>([]);
  const [scanEvents, setScanEvents] = useState<ScanEvent[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [attendanceError, setAttendanceError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    id: number;
    date: string;
    time: string;
    groupName: string;
    subjectName: string;
  } | null>(null);

  const weekRange = useMemo(() => {
    const monday = startOfCurrentWeek();
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return {
      startDate: toIsoDate(monday),
      endDate: toIsoDate(friday),
      todayDate: toIsoDate(new Date()),
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
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

        const nextSelectedId =
          scheduleIdParam && response.some((entry) => entry.id === scheduleIdParam)
            ? scheduleIdParam
            : (response.find((entry) => getScheduleSessionStatus(entry) === "live")?.id ??
              response.find((entry) => entry.date === weekRange.todayDate)?.id ??
              response[0]?.id ??
              null);

        setSelectedScheduleId(nextSelectedId);
      } catch (error) {
        if (controller.signal.aborted) return;
        setScheduleError(
          error instanceof ApiError ? error.message : "Unable to load this week's lessons.",
        );
      } finally {
        if (!controller.signal.aborted) setScheduleLoading(false);
      }
    };

    void loadSchedules();
    return () => controller.abort();
  }, [weekRange.endDate, weekRange.startDate, weekRange.todayDate]);

  useEffect(() => {
    if (scheduleLoading) {
      return;
    }
    if (!selectedScheduleId) {
      setStudents([]);
      setSessionInfo(null);
      setScanEvents([]);
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
        setScanEvents([]);
      } catch (error) {
        if (controller.signal.aborted) return;
        setAttendanceError(
          error instanceof ApiError ? error.message : "Unable to load the attendance roster.",
        );
        setStudents([]);
        setSessionInfo(null);
        setScanEvents([]);
      } finally {
        if (!controller.signal.aborted) setAttendanceLoading(false);
      }
    };

    void loadAttendance();
    return () => controller.abort();
  }, [scheduleLoading, selectedScheduleId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const counts = useMemo(
    () =>
      students.reduce(
        (acc, s) => {
          acc[s.status] += 1;
          return acc;
        },
        { present: 0, absent: 0, unmarked: 0 },
      ),
    [students],
  );

  const sessionTimeStatus = useMemo<"upcoming" | "live" | "ended" | null>(() => {
    if (!sessionInfo) return null;
    const lessonStart = new Date(`${sessionInfo.date}T${sessionInfo.time}:00`);
    const lessonEnd = new Date(lessonStart.getTime() + 90 * 60 * 1000);
    const openAt = new Date(lessonStart.getTime() - 15 * 60 * 1000);
    if (now < openAt) return "upcoming";
    if (now > lessonEnd) return "ended";
    return "live";
  }, [sessionInfo, now]);

  const minutesUntilOpen = useMemo(() => {
    if (!sessionInfo || sessionTimeStatus !== "upcoming") return null;
    const openAt = new Date(
      new Date(`${sessionInfo.date}T${sessionInfo.time}:00`).getTime() - 15 * 60 * 1000,
    );
    return Math.max(0, Math.ceil((openAt.getTime() - now.getTime()) / 60_000));
  }, [sessionInfo, sessionTimeStatus, now]);

  const lastEvent = scanEvents[0] ?? null;

  const appendEvent = (
    status: ScanEventStatus,
    label: string,
    details: string,
    similarity: number | null = null,
  ) => {
    const event: ScanEvent = {
      id: createEventId(),
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      label,
      details,
      similarity,
      status,
    };
    setScanEvents((prev) => [event, ...prev].slice(0, 12));
    return event;
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraActive(false);
    setCameraError("");
    setScanState("idle");
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser does not support camera access.");
      setScanState("unavailable");
      return;
    }
    setCameraLoading(true);
    setCameraError("");
    setScanState("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user" },
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setScanState("ready");
    } catch (error) {
      setCameraError(getCameraErrorMessage(error));
      setScanState("unavailable");
    } finally {
      setCameraLoading(false);
    }
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraActive) return null;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return null;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  };

  const applyRecognition = async (result: FaceRecognitionResult) => {
    if (result.status === "recognized") {
      const matchedStudent = students.find((s) => s.studentId === result.student_id);

      if (!matchedStudent) {
        appendEvent(
          "outside-session",
          `Student #${result.student_id}`,
          "The face was recognized, but that student is not in the current lesson roster.",
          result.similarity,
        );
        setScanState("unknown");
        toast.error("Recognized student is outside this lesson", {
          description: "The scan matched a student who is not enrolled in the selected session.",
        });
        return;
      }

      if (matchedStudent.status === "present") {
        appendEvent(
          "recognized",
          matchedStudent.name,
          matchedStudent.markedAt
            ? `Already marked present at ${matchedStudent.markedAt}.`
            : "Already marked present.",
          result.similarity,
        );
        setScanState("matched");
        toast.success("Student already marked present", { description: matchedStudent.name });
        return;
      }

      try {
        const response = await updateAttendance(matchedStudent.attendanceId, {
          presense: true,
          marked_at: new Date().toISOString(),
        });
        const updated = mapAttendanceRow(response.attendance);
        setStudents((prev) =>
          prev.map((s) => (s.attendanceId === updated.attendanceId ? updated : s)),
        );
        appendEvent(
          "recognized",
          updated.name,
          `Marked present for ${sessionInfo?.groupName ?? "this lesson"}.`,
          result.similarity,
        );
        setScanState("matched");
        toast.success("Student recognized", { description: `${updated.name} was marked present.` });
      } catch (error) {
        appendEvent(
          "error",
          matchedStudent.name,
          error instanceof ApiError ? error.message : "The attendance change could not be saved.",
          result.similarity,
        );
        setScanState("unknown");
        toast.error("Could not save attendance", {
          description:
            error instanceof ApiError ? error.message : "The scan result was not synced.",
        });
      }
      return;
    }

    if (result.status === "not_recognized") {
      appendEvent(
        "not-recognized",
        "No roster match",
        result.similarity === null
          ? "The backend did not find a recognized student for this frame."
          : `Closest match stayed below threshold (${formatSimilarity(result.similarity)}).`,
        result.similarity,
      );
      setScanState("unknown");
      toast.error("Student was not recognized", {
        description: "Try another frame or fall back to manual attendance if needed.",
      });
      return;
    }

    if (result.status === "no_face") {
      appendEvent(
        "no-face",
        "No face detected",
        "The captured frame did not contain a detectable face.",
      );
      setScanState("unknown");
      toast.error("No face detected", { description: "Move closer to the camera and try again." });
      return;
    }

    appendEvent(
      "empty-embeddings",
      "Face embeddings missing",
      "The backend has no saved face embeddings yet, so scans cannot identify students.",
    );
    setScanState("unknown");
    toast.error("Face recognition is not ready", {
      description: "No student face embeddings are stored on the backend yet.",
    });
  };

  const handleCaptureScan = async () => {
    if (!sessionInfo) {
      toast.error("Select a lesson first");
      return;
    }
    if (sessionTimeStatus === "upcoming") {
      toast.error("Lesson hasn't started yet", {
        description: `Scanning opens 15 minutes before ${sessionInfo.time}.`,
      });
      return;
    }
    if (sessionTimeStatus === "ended") {
      toast.error("Attendance window has closed", {
        description: "This lesson ended more than 90 minutes ago.",
      });
      return;
    }
    if (!isCameraActive) {
      toast.error("Start the camera first");
      return;
    }

    setScanState("liveness");
    await new Promise((resolve) => setTimeout(resolve, 2500));

    if (!isCameraActive) return;

    setScanLoading(true);
    setScanState("scanning");

    try {
      const frame = await captureFrame();
      if (!frame) {
        appendEvent(
          "error",
          "Frame capture failed",
          "The browser could not capture the current video frame.",
        );
        setScanState("unknown");
        toast.error("Could not capture the frame");
        return;
      }
      const result = await recognizeStudentFace(frame);
      await applyRecognition(result);
    } catch (error) {
      appendEvent(
        "error",
        "Scan request failed",
        error instanceof ApiError ? error.message : "The face recognition request failed.",
      );
      setScanState("unknown");
      toast.error("Scan failed", {
        description:
          error instanceof ApiError ? error.message : "The backend did not accept this scan.",
      });
    } finally {
      setScanLoading(false);
    }
  };

  const bracketColorClass =
    scanState === "matched"
      ? "border-success"
      : scanState === "unknown"
        ? "border-warning"
        : scanState === "unavailable"
          ? "border-destructive"
          : "border-primary/70";

  const progressPct = students.length > 0 ? (counts.present / students.length) * 100 : 0;

  return (
    <>
      <PageHeader
        title={t("scan.title")}
        description={
          sessionInfo
            ? `${sessionInfo.subjectName} · ${sessionInfo.groupName} · ${sessionInfo.date} · ${sessionInfo.time}`
            : t("scan.descDefault")
        }
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/attendance">
                {t("scan.switchToManual")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCaptureScan()}
              disabled={
                !sessionInfo ||
                !isCameraActive ||
                scanLoading ||
                attendanceLoading ||
                sessionTimeStatus !== "live"
              }
            >
              <ScanFace className="h-4 w-4" /> {t("scan.captureAndScan")}
            </Button>
          </>
        }
      />
      <PageBody>
        {scheduleLoading ? (
          <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground">
            {t("scan.loading")}
          </div>
        ) : (
          <>
            <div className="mb-4 inline-flex rounded-md border border-border bg-card p-0.5">
              <Link
                to="/attendance"
                className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                <Users className="h-3.5 w-3.5" /> {t("scan.modeManual")}
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground"
              >
                <ScanFace className="h-3.5 w-3.5" /> {t("scan.modeFaceScan")}
                <span className="rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase tracking-wider text-primary">
                  AI
                </span>
              </button>
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ScanFace className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold">
                    {sessionInfo
                      ? `${counts.present} of ${students.length} ${t("scan.studentsRecognized")}`
                      : t("scan.selectLesson")}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {sessionInfo
                      ? `${counts.unmarked} ${t("scan.remainingCount")} · ${scanEvents.length} ${t("scan.scanEventsCount")}`
                      : t("scan.selectLessonDesc")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden h-1.5 w-48 overflow-hidden rounded-full bg-muted sm:block">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-[12px]">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={selectedScheduleId ?? ""}
                    onChange={(e) =>
                      setSelectedScheduleId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="bg-transparent outline-none"
                    disabled={scheduleLoading || scheduleOptions.length === 0}
                  >
                    {scheduleOptions.length === 0 ? (
                      <option value="">{t("scan.noLessonsWeek")}</option>
                    ) : (
                      scheduleOptions.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {formatScheduleLabel(entry, locale)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <StateChip state={scanState} label={t(STATE_LABEL_KEYS[scanState])} />
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

            {cameraError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <div className="flex items-start gap-3">
                  <CameraOff className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              </div>
            )}


            {sessionTimeStatus === "ended" && (
              <div className="mb-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t("scan.endedInfo")} ({sessionInfo?.time}).
                  </span>
                </div>
              </div>
            )}

            {!scheduleLoading && scheduleOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <div className="text-base font-medium">{t("scan.noLessonsTitle")}</div>
                <p className="mt-2 text-sm text-muted-foreground">{t("scan.noLessonsDesc")}</p>
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    {
                      key: "present",
                      labelKey: "scan.statRecognized",
                      value: counts.present,
                      className: "text-success",
                    },
                    {
                      key: "unmarked",
                      labelKey: "scan.statRemaining",
                      value: counts.unmarked,
                      className: "text-muted-foreground",
                    },
                    {
                      key: "events",
                      labelKey: "scan.statScans",
                      value: scanEvents.length,
                      className: "text-primary",
                    },
                    {
                      key: "total",
                      labelKey: "scan.statTotal",
                      value: students.length,
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

                <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                  <SectionCard
                    padded={false}
                    title={t("scan.cameraViewportTitle")}
                    description={t("scan.cameraViewportDesc")}
                    actions={
                      <div className="flex items-center gap-1">
                        {isCameraActive ? (
                          <Button variant="outline" size="sm" className="h-7" onClick={stopCamera}>
                            <CameraOff className="h-3.5 w-3.5" /> {t("scan.stopCamera")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            onClick={() => void startCamera()}
                            disabled={cameraLoading || sessionTimeStatus !== "live"}
                          >
                            <Camera className="h-3.5 w-3.5" />{" "}
                            {cameraLoading ? t("scan.startingCamera") : t("scan.startCamera")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-7"
                          onClick={() => void handleCaptureScan()}
                          disabled={
                            !isCameraActive || scanLoading || attendanceLoading || !sessionInfo || sessionTimeStatus !== "live"
                          }
                        >
                          <ScanFace className="h-3.5 w-3.5" />{" "}
                          {scanLoading ? t("scan.scanning") : t("scan.scan")}
                        </Button>
                      </div>
                    }
                  >
                    <div className="relative aspect-video w-full overflow-hidden border-y border-border bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={cn("h-full w-full object-cover", !isCameraActive && "hidden")}
                      />

                      {isCameraActive ? (
                        <>
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="relative h-[68%] w-[42%]">
                              {[
                                "left-0 top-0 border-l-2 border-t-2",
                                "right-0 top-0 border-r-2 border-t-2",
                                "left-0 bottom-0 border-l-2 border-b-2",
                                "right-0 bottom-0 border-r-2 border-b-2",
                              ].map((c) => (
                                <span
                                  key={c}
                                  className={cn(
                                    "absolute h-6 w-6 transition-colors",
                                    c,
                                    bracketColorClass,
                                  )}
                                />
                              ))}
                              {scanState === "scanning" && (
                                <span className="pointer-events-none absolute inset-x-0 top-0 h-px animate-[scan_2s_ease-in-out_infinite] bg-primary/80 shadow-[0_0_12px_var(--color-primary)]" />
                              )}
                            </div>
                          </div>

                          <div className="absolute left-3 top-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                              REC
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                              <Camera className="h-3 w-3" /> Camera
                            </span>
                          </div>

                          {lastEvent && (
                            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/55 px-3 py-2 text-white backdrop-blur">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium">
                                  {lastEvent.label}
                                </div>
                                <div className="truncate text-[11px] text-white/65">
                                  {lastEvent.details}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="hidden text-right sm:block">
                                  <div className="text-[10px] uppercase tracking-wider text-white/55">
                                    {t("scan.feedColSimilarity")}
                                  </div>
                                  <div className="text-sm font-semibold tabular-nums">
                                    {formatSimilarity(lastEvent.similarity)}
                                  </div>
                                </div>
                                <StateChip
                                  state={scanState}
                                  label={t(STATE_LABEL_KEYS[scanState])}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 text-center text-slate-100">
                          <div>
                            <Camera className="mx-auto mb-3 h-8 w-8 opacity-80" />
                            <div className="text-sm font-semibold">{t("scan.cameraOffline")}</div>
                            <p className="mt-2 text-xs text-slate-300">
                              {t("scan.cameraOfflineDesc")}
                            </p>
                          </div>
                        </div>
                      )}

                      {scanState === "liveness" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
                          <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 bg-black/70 px-6 py-5 text-center text-white">
                            <Eye className="h-7 w-7 animate-pulse text-info" />
                            <div className="text-sm font-semibold">{t("scan.livenessTitle")}</div>
                            <p className="max-w-[200px] text-xs text-white/65">{t("scan.livenessDesc")}</p>
                          </div>
                        </div>
                      )}

                    {scanLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                          <div className="rounded-md border border-white/10 bg-black/70 px-3 py-2 text-sm font-medium text-white">
                            {t("scan.scanningFrame")}
                          </div>
                        </div>
                      )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />

                    <div className="flex flex-wrap items-center gap-2 p-3">
                      <Button
                        size="sm"
                        onClick={() => void handleCaptureScan()}
                        disabled={!sessionInfo || !isCameraActive || scanLoading}
                      >
                        <CheckCircle2 className="h-4 w-4" /> {t("scan.captureAndScan")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScanEvents([]);
                          setScanState(isCameraActive ? "ready" : "idle");
                        }}
                        disabled={scanEvents.length === 0}
                      >
                        <RefreshCcw className="h-4 w-4" /> {t("scan.clearFeed")}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/attendance">
                          <Users className="h-4 w-4" /> {t("scan.manualRoster")}
                        </Link>
                      </Button>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {t("scan.scanFrameNote")}
                      </span>
                    </div>
                  </SectionCard>

                  <div className="space-y-4">
                    <SectionCard
                      title={t("scan.bestMatchTitle")}
                      description={t("scan.bestMatchDesc")}
                      padded={false}
                    >
                      {lastEvent ? (
                        <>
                          <div className="flex items-start gap-3 p-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-base font-semibold">
                              {lastEvent.label
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("") || "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-[14px] font-semibold">
                                  {lastEvent.label}
                                </div>
                                {lastEvent.similarity !== null && (
                                  <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                                    {formatSimilarity(lastEvent.similarity)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[12px] text-muted-foreground">
                                {lastEvent.details}
                              </div>
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {t("scan.detectedAt")} {lastEvent.time}
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-border px-4 py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                                eventToneClass[lastEvent.status],
                              )}
                            >
                              {lastEvent.status.replace(/-/g, " ")}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground">
                          {t("scan.noScansYet")}
                        </div>
                      )}
                    </SectionCard>

                    <SectionCard
                      title={t("scan.rosterStatusTitle")}
                      description={
                        sessionInfo
                          ? `${sessionInfo.groupName} · ${students.length} enrolled`
                          : t("scan.selectLesson")
                      }
                    >
                      <div className="space-y-2.5 text-[13px]">
                        {[
                          {
                            labelKey: "scan.rosterRecognized",
                            value: counts.present,
                            tone: "text-success",
                          },
                          {
                            labelKey: "scan.rosterNotRecognized",
                            value: counts.unmarked,
                            tone: "text-muted-foreground",
                          },
                          {
                            labelKey: "scan.rosterScanEvents",
                            value: scanEvents.length,
                            tone: "text-primary",
                          },
                        ].map((row) => (
                          <div key={row.labelKey} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t(row.labelKey)}</span>
                            <span className={cn("font-semibold tabular-nums", row.tone)}>
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <Link to="/attendance">
                            <Users className="h-4 w-4" /> {t("scan.openRoster")}
                          </Link>
                        </Button>
                      </div>
                    </SectionCard>

                    <SectionCard>
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                        <div className="text-[12px] leading-relaxed text-muted-foreground">
                          {t("scan.trustNote")}
                        </div>
                      </div>
                    </SectionCard>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <SectionCard
                    className="lg:col-span-2"
                    title={t("scan.feedTitle")}
                    description={t("scan.feedDesc")}
                    actions={
                      <Button variant="ghost" size="sm" className="h-7">
                        <Clock className="h-3.5 w-3.5" /> {t("scan.feedThisSession")}
                      </Button>
                    }
                    padded={false}
                  >
                    {scanEvents.length === 0 ? (
                      <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                        {t("scan.feedEmpty")}
                      </div>
                    ) : (
                      <table className="w-full text-[13px]">
                        <thead className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 font-medium">{t("scan.feedColTime")}</th>
                            <th className="px-4 py-2 font-medium">{t("scan.feedColDetected")}</th>
                            <th className="px-4 py-2 font-medium">{t("scan.feedColDetails")}</th>
                            <th className="px-4 py-2 font-medium text-right">
                              {t("scan.feedColSimilarity")}
                            </th>
                            <th className="px-4 py-2 font-medium">{t("scan.feedColStatus")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {scanEvents.map((event) => (
                            <tr key={event.id} className="hover:bg-accent/30">
                              <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                                {event.time}
                              </td>
                              <td className="px-4 py-2 font-medium">{event.label}</td>
                              <td className="px-4 py-2 text-muted-foreground">{event.details}</td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {formatSimilarity(event.similarity)}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                                    eventToneClass[event.status],
                                  )}
                                >
                                  {event.status.replace(/-/g, " ")}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </SectionCard>

                  <SectionCard
                    title={t("scan.lessonRosterTitle")}
                    description={
                      sessionInfo
                        ? `${sessionInfo.subjectName} · ${sessionInfo.groupName}`
                        : t("scan.selectLesson")
                    }
                    padded={false}
                  >
                    {attendanceLoading ? (
                      <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                        {t("scan.loadingRoster")}
                      </div>
                    ) : students.length === 0 ? (
                      <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                        {t("scan.noStudentsAvailable")}
                      </div>
                    ) : (
                      <ul className="divide-y divide-border">
                        {students.map((student) => (
                          <li
                            key={student.attendanceId}
                            className="flex items-center gap-3 px-4 py-2.5"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                              {student.name
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((p) => p[0])
                                .join("")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] font-medium">{student.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {student.markedAt
                                  ? `${t("scan.markedAt")} ${student.markedAt}`
                                  : t("scan.notMarkedYet")}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                                student.status === "present" && toneClass.success,
                                student.status === "absent" && toneClass.destructive,
                                student.status === "unmarked" && toneClass.muted,
                              )}
                            >
                              {student.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </div>
              </>
            )}
          </>
        )}
      </PageBody>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </>
  );
}
