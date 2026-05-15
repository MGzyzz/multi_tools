import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Download, ArrowUpDown, AlertCircle, BookOpen, Wifi, WifiOff, X, UserCheck, Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/auth";
import { requireAuth } from "@/lib/route-auth";
import {
  getAllStudents,
  getStudentFullName,
  getStudentInitials,
  updateStudentTelegramId,
  uploadStudentFacePhoto,
  type ApiStudent,
} from "@/lib/students";
import { StudentPhotoUploadDialog, type PoseShot } from "@/components/student-photo-upload-dialog";
import { getGroupStudentRisks, type StudentRisk } from "@/lib/analytics";
import {
  assignGroupLeader,
  getGroupLeaders,
  removeGroupLeader,
  type GroupLeader,
} from "@/lib/telegramSettings";
import { cn } from "@/lib/utils";

type SearchParams = { group?: string; groupId?: number };
type StudentTab = "all" | "with_telegram" | "without_telegram" | "with_photo";
type SortKey = "name" | "age" | "email";

const PAGE_SIZE = 20;

const TAB_KEYS: StudentTab[] = ["all", "with_telegram", "without_telegram", "with_photo"];
const TAB_I18N_KEYS: Record<StudentTab, string> = {
  all: "students.tabAll",
  with_telegram: "students.tabWithTelegram",
  without_telegram: "students.tabWithoutTelegram",
  with_photo: "students.tabWithPhoto",
};

export const Route = createFileRoute("/students")({
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    group: typeof search.group === "string" ? search.group : undefined,
    groupId: search.groupId ? Number(search.groupId) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Students - Lectern" },
      { name: "description", content: "Teacher student directory powered by the current API." },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const { t } = useI18n();
  const { group, groupId } = Route.useSearch();
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<StudentTab>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedStudent, setSelectedStudent] = useState<ApiStudent | null>(null);
  const [riskMap, setRiskMap] = useState<Map<number, StudentRisk>>(new Map());
  const [leaders, setLeaders] = useState<GroupLeader[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [assigningLeader, setAssigningLeader] = useState(false);
  const [telegramIdInput, setTelegramIdInput] = useState("");
  const [savingTelegramId, setSavingTelegramId] = useState(false);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);

  useEffect(() => {
    if (!groupId) { setLeaders([]); return; }
    getGroupLeaders(groupId).then(setLeaders).catch(() => {});
  }, [groupId]);

  useEffect(() => {
    setTelegramIdInput(selectedStudent?.telegram_id ?? "");
  }, [selectedStudent?.id]);

  async function handleAssignLeader() {
    if (!groupId || !selectedLeaderId) return;
    setAssigningLeader(true);
    try {
      const leader = await assignGroupLeader(groupId, Number(selectedLeaderId));
      setLeaders((prev) => [...prev, leader]);
      setSelectedLeaderId("");
      toast.success(t("groups.leaderAssigned"));
    } catch {
      toast.error(t("groups.leaderErrorAssign"));
    } finally {
      setAssigningLeader(false);
    }
  }

  async function handleSaveTelegramId() {
    if (!selectedStudent) return;
    setSavingTelegramId(true);
    try {
      const updated = await updateStudentTelegramId(selectedStudent.id, telegramIdInput.trim());
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedStudent(updated);
      toast.success(t("students.sheetTelegramIdSaved"));
    } catch {
      toast.error(t("students.sheetTelegramIdError"));
    } finally {
      setSavingTelegramId(false);
    }
  }

  const refreshStudentState = async (studentId: number) => {
    const refreshed = await getAllStudents();
    setStudents(refreshed);
    const updated = refreshed.find((s) => s.id === studentId);
    if (updated) setSelectedStudent(updated);
  };

  const handleSubmitCameraPhotos = async (shots: PoseShot[]) => {
    if (!selectedStudent) return;
    const studentId = selectedStudent.id;
    for (const shot of shots) {
      await uploadStudentFacePhoto(studentId, shot.blob);
    }
    await refreshStudentState(studentId);
  };

  const handleSubmitFilePhotos = async (files: File[]) => {
    if (!selectedStudent) return;
    const studentId = selectedStudent.id;
    for (const file of files) {
      await uploadStudentFacePhoto(studentId, file);
    }
    await refreshStudentState(studentId);
  };

  async function handleRemoveLeader(studentId: number) {
    if (!groupId) return;
    try {
      await removeGroupLeader(groupId, studentId);
      setLeaders((prev) => prev.filter((l) => l.student_id !== studentId));
      toast.success(t("groups.leaderRemoved"));
    } catch {
      toast.error(t("groups.leaderErrorRemove"));
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    const loadStudents = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getAllStudents(controller.signal);
        setStudents(response);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Unable to load students right now.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadStudents();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!groupId) { setRiskMap(new Map()); return; }
    const controller = new AbortController();
    getGroupStudentRisks(groupId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setRiskMap(new Map(data.map((r) => [r.student_id, r])));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [groupId]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, tab, sortKey, group]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedGroup = group?.trim().toLowerCase();

    let next = students.filter((student) => {
      if (normalizedGroup) {
        const inGroup = student.groups?.some((g) => g.name.toLowerCase() === normalizedGroup);
        if (!inGroup) return false;
      }

      if (!normalizedQuery) return true;

      return [
        getStudentFullName(student),
        student.email,
        student.telegram_username ?? "",
        String(student.id),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });

    next = next.filter((student) => {
      if (tab === "with_telegram") return Boolean(student.telegram_username);
      if (tab === "without_telegram") return !student.telegram_username;
      if (tab === "with_photo") return Boolean(student.face_image);
      return true;
    });

    const riskOrder = { high: 0, medium: 1, low: 2 };
    next.sort((left, right) => {
      if (riskMap.size > 0) {
        const rL = riskMap.get(left.id)?.risk ?? "low";
        const rR = riskMap.get(right.id)?.risk ?? "low";
        if (riskOrder[rL] !== riskOrder[rR]) return riskOrder[rL] - riskOrder[rR];
      }
      if (sortKey === "age") return right.age - left.age;
      if (sortKey === "email") return left.email.localeCompare(right.email);
      return getStudentFullName(left).localeCompare(getStudentFullName(right));
    });

    return next;
  }, [query, sortKey, students, tab, group, riskMap]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const headerDescription = loading
    ? t("students.loadingDesc")
    : group
      ? `${filtered.length} ${t("students.of")} ${students.length} students · filtered by group "${group}"`
      : `${students.length} students · current API directory`;

  return (
    <>
      <PageHeader
        title={t("students.title")}
        description={headerDescription}
        actions={
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4" /> {t("students.export")}
          </Button>
        }
      />
      <PageBody>
        {groupId && (
          <SectionCard title={t("groups.leaders")} padded className="mb-4">
            <div className="space-y-3">
              {leaders.length > 0 && (
                <ul className="space-y-2">
                  {leaders.map((l) => (
                    <li key={l.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{l.first_name} {l.last_name}</span>
                        {l.telegram_connected ? (
                          <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 text-xs">
                            <Wifi className="h-3 w-3" />{t("groups.leaderConnected")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <WifiOff className="h-3 w-3" />{t("groups.leaderNotConnected")}
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLeader(l.student_id)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {(() => {
                const leaderIds = new Set(leaders.map((l) => l.student_id));
                const available = filtered.filter((s) => !leaderIds.has(s.id));
                if (available.length === 0) return null;
                return (
                  <div className="flex items-center gap-2">
                    <Select value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                      <SelectTrigger className="flex-1 h-8 text-sm">
                        <SelectValue placeholder={t("groups.selectLeader")} />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {getStudentFullName(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAssignLeader}
                      disabled={!selectedLeaderId || assigningLeader}
                      className="h-8 gap-1.5 whitespace-nowrap"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {assigningLeader ? t("students.loading") : t("groups.assignLeader")}
                    </Button>
                  </div>
                );
              })()}

              {leaders.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("groups.noLeaders")}</p>
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard padded={false}>
          <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("students.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm">
                <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="bg-transparent pr-1 text-sm outline-none"
                >
                  <option value="name">{t("students.sortName")}</option>
                  <option value="age">{t("students.sortAge")}</option>
                  <option value="email">{t("students.sortEmail")}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-border px-3">
            {TAB_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                  tab === key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(TAB_I18N_KEYS[key])}
              </button>
            ))}
          </div>

          {error ? (
            <div className="p-6">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          ) : loading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{t("students.colStudent")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("students.colEmail")}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{t("students.colAge")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("students.colTelegram")}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{t("students.colId")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-36" /></td>
                      <td className="px-4 py-2.5 text-right"><Skeleton className="h-3.5 w-6 ml-auto" /></td>
                      <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-24" /></td>
                      <td className="px-4 py-2.5 text-right"><Skeleton className="h-3.5 w-8 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <div className="text-base font-medium">
                  {students.length === 0 ? t("students.emptyTitle") : t("students.emptyNoMatch")}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {students.length === 0 ? t("students.emptyDesc") : t("students.emptyNoMatchDesc")}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">{t("students.colStudent")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("students.colEmail")}</th>
                      <th className="px-4 py-2.5 font-medium text-right">{t("students.colAge")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("students.colTelegram")}</th>
                      {groupId && <th className="px-4 py-2.5 font-medium text-right">{t("students.sheetRisk")}</th>}
                      <th className="px-4 py-2.5 font-medium text-right">{t("students.colId")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visible.map((student) => {
                      const risk = riskMap.get(student.id);
                      return (
                      <tr
                        key={student.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-accent/30",
                          risk?.risk === "high" && "bg-destructive/5",
                        )}
                        onClick={() => setSelectedStudent(student)}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {student.face_image ? (
                              <img
                                src={student.face_image}
                                alt={getStudentFullName(student)}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                                {getStudentInitials(student)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {getStudentFullName(student)}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {student.face_image ? t("students.photoAvailable") : t("students.noPhoto")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{student.email}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{student.age}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {student.telegram_username || t("students.telegramNotConnected")}
                        </td>
                        {groupId && (
                          <td className="px-4 py-2.5 text-right">
                            {risk ? (
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                                risk.risk === "high"
                                  ? "bg-destructive/10 text-destructive"
                                  : risk.risk === "medium"
                                    ? "bg-warning/15 text-warning-foreground"
                                    : "bg-success/10 text-success",
                              )}>
                                {risk.risk === "high" ? t("students.riskHigh") : risk.risk === "medium" ? t("students.riskMedium") : t("students.riskLow")} · {risk.attendance_pct}%
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {student.id}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  {t("students.showing")} {visible.length} {t("students.of")} {filtered.length}
                </span>
                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  >
                    {t("students.loadMore")}
                  </Button>
                )}
              </div>
            </>
          )}
        </SectionCard>
      </PageBody>

      <Sheet open={!!selectedStudent} onOpenChange={(open) => {
        if (!open) { setSelectedStudent(null); setTelegramIdInput(""); }
        else setTelegramIdInput(selectedStudent?.telegram_id ?? "");
      }}>
        <SheetContent className="overflow-y-auto">
          {selectedStudent && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-4">
                  {selectedStudent.face_image ? (
                    <img
                      src={selectedStudent.face_image}
                      alt={getStudentFullName(selectedStudent)}
                      className="h-16 w-16 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
                      {getStudentInitials(selectedStudent)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <SheetTitle>{getStudentFullName(selectedStudent)}</SheetTitle>
                    <SheetDescription>{selectedStudent.email}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mb-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("students.sheetGroups")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudent.groups.map((g) => (
                    <Link
                      key={g.id}
                      to="/students"
                      search={{ group: g.name }}
                      onClick={() => setSelectedStudent(null)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
                    >
                      {g.name}
                    </Link>
                  ))}
                  {selectedStudent.groups.length === 0 && (
                    <span className="text-sm text-muted-foreground">{t("students.sheetNoGroups")}</span>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("students.sheetDetails")}</div>
                <div className="flex items-center justify-between border-b border-border py-1.5 text-sm">
                  <span className="text-muted-foreground">{t("students.sheetAge")}</span>
                  <span className="font-medium">{selectedStudent.age}</span>
                </div>
                <div className="border-b border-border py-2 text-sm">
                  <div className="mb-1.5 text-muted-foreground">{t("students.sheetTelegramId")}</div>
                  <div className="flex gap-2">
                    <Input
                      value={telegramIdInput}
                      onChange={(e) => setTelegramIdInput(e.target.value)}
                      placeholder={t("students.sheetTelegramIdPlaceholder")}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0"
                      onClick={handleSaveTelegramId}
                      disabled={savingTelegramId || telegramIdInput.trim() === (selectedStudent.telegram_id ?? "")}
                    >
                      {t("students.sheetTelegramIdSave")}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">{t("students.sheetFacePhoto")}</span>
                  <Button
                    size="sm"
                    variant={selectedStudent.face_image ? "outline" : "default"}
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setPhotoUploadOpen(true)}
                  >
                    {selectedStudent.face_image ? (
                      <>
                        <Upload className="h-3 w-3" />
                        {t("students.photoAvailable")}
                      </>
                    ) : (
                      <>
                        <Camera className="h-3 w-3" />
                        {t("students.noPhoto")}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {selectedStudent.groups.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("students.sheetJournal")}</div>
                  <div className="space-y-1.5">
                    {selectedStudent.groups.map((g) => (
                      <Link
                        key={g.id}
                        to="/journal"
                        search={{ studentId: selectedStudent.id, groupId: g.id }}
                        onClick={() => setSelectedStudent(null)}
                      >
                        <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          {g.name} — {t("students.sheetJournalBtn")}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <Link to="/attendance" search={{}} onClick={() => setSelectedStudent(null)}>
                <Button variant="outline" size="sm" className="w-full">
                  {t("students.sheetOpenAttendance")}
                </Button>
              </Link>
            </>
          )}

          {selectedStudent && (
            <StudentPhotoUploadDialog
              open={photoUploadOpen}
              onOpenChange={setPhotoUploadOpen}
              student={{ id: String(selectedStudent.id), name: getStudentFullName(selectedStudent) }}
              defaultMode={selectedStudent.face_image ? "files" : "camera"}
              onSubmitCamera={handleSubmitCameraPhotos}
              onSubmitFiles={handleSubmitFilePhotos}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
