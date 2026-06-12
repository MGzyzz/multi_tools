import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/auth";
import { requireAuth } from "@/lib/route-auth";
import {
  getGroupSubjects,
  getStudentJournal,
  type ApiSubject,
  type StudentJournalData,
} from "@/lib/journal";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/journal")({
  beforeLoad: requireAuth,
  validateSearch: (search: Record<string, unknown>) => ({
    studentId: search.studentId ? Number(search.studentId) : undefined,
    groupId: search.groupId ? Number(search.groupId) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Attendance Journal — Lectern" }],
  }),
  component: JournalPage,
});

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-2 h-7 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(Number(y), Number(m) - 1),
  );
}

type StatusFilter = "all" | "present" | "late" | "absent";

const STATUS_FILTERS: StatusFilter[] = ["all", "present", "late", "absent"];

function getStatusFilterLabel(status: StatusFilter, t: (key: string) => string) {
  if (status === "all") return t("journal.filterStatusAll");
  if (status === "present") return t("journal.filterStatusPresent");
  if (status === "late") return t("journal.filterStatusLate");
  return t("journal.filterStatusAbsent");
}

function PaginationBar({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (page <= 4) {
    pages.push(1, 2, 3, 4, 5, "…", totalPages);
  } else if (page >= totalPages - 3) {
    pages.push(1, "…", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, "…", page - 1, page, page + 1, "…", totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p as number)}
            className={cn(
              "flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-[12px] font-medium transition-colors",
              p === page
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:bg-accent",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function JournalPage() {
  const { t } = useI18n();
  const { studentId, groupId } = Route.useSearch();

  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [journalData, setJournalData] = useState<StudentJournalData | null>(null);
  const [journalLoading, setJournalLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  const backButton = (
    <Button variant="outline" size="sm" asChild>
      <Link to="/students">
        <ArrowLeft className="h-4 w-4" /> {t("journal.backToStudents")}
      </Link>
    </Button>
  );

  useEffect(() => {
    if (!groupId || !studentId) return;
    const controller = new AbortController();

    const loadSubjects = async () => {
      setSubjectsLoading(true);
      setError("");
      try {
        const data = await getGroupSubjects(groupId, controller.signal);
        if (controller.signal.aborted) return;
        setSubjects(data);
        if (data.length > 0) setSelectedSubjectId(data[0].id);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Unable to load subjects.");
      } finally {
        if (!controller.signal.aborted) setSubjectsLoading(false);
      }
    };

    void loadSubjects();
    return () => controller.abort();
  }, [groupId, studentId]);

  useEffect(() => {
    if (!groupId || !studentId || !selectedSubjectId) return;
    const controller = new AbortController();

    const loadJournal = async () => {
      setJournalLoading(true);
      setError("");
      try {
        const data = await getStudentJournal(
          groupId,
          selectedSubjectId,
          studentId,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setJournalData(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Unable to load journal.");
        setJournalData(null);
      } finally {
        if (!controller.signal.aborted) setJournalLoading(false);
      }
    };

    void loadJournal();
    return () => controller.abort();
  }, [groupId, studentId, selectedSubjectId]);

  // Reset page when filters or subject change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, monthFilter, dateFrom, dateTo, selectedSubjectId]);

  if (!groupId || !studentId) {
    return (
      <>
        <PageHeader title={t("journal.title")} actions={backButton} />
        <PageBody>
          <SectionCard>
            <p className="text-sm text-muted-foreground">{t("journal.invalidParams")}</p>
            <div className="mt-4">{backButton}</div>
          </SectionCard>
        </PageBody>
      </>
    );
  }

  const sortedJournal = journalData
    ? [...journalData.journal].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
    : [];

  const availableMonths = [...new Set(sortedJournal.map((e) => e.date.slice(0, 7)))]
    .sort()
    .reverse();

  const filteredJournal = sortedJournal.filter((entry) => {
    if (statusFilter === "present" && entry.status !== "present") return false;
    if (statusFilter === "late" && entry.status !== "late") return false;
    if (statusFilter === "absent" && entry.status !== "absent") return false;
    if (monthFilter && !entry.date.startsWith(monthFilter)) return false;
    if (dateFrom && entry.date < dateFrom) return false;
    if (dateTo && entry.date > dateTo) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredJournal.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filteredJournal.slice(pageStart, pageStart + PAGE_SIZE);

  const anyFilterActive =
    statusFilter !== "all" || monthFilter !== "" || dateFrom !== "" || dateTo !== "";

  const resetFilters = () => {
    setStatusFilter("all");
    setMonthFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const headerDescription = journalData
    ? `${journalData.student.full_name} · ${journalData.group.name}`
    : undefined;

  const attendanceHint = journalData
    ? t("journal.statAttendanceHint")
        .replace("{attended}", String(journalData.summary.attended_lessons))
        .replace("{total}", String(journalData.summary.total_lessons))
    : "";

  return (
    <>
      <PageHeader
        title={t("journal.title")}
        description={subjectsLoading || journalLoading ? undefined : headerDescription}
        actions={backButton}
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

        {subjectsLoading ? (
          <SectionCard>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </SectionCard>
        ) : (
          <>
            {subjects.length > 1 && (
              <div className="mb-4 inline-flex rounded-md border border-border bg-card p-0.5">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={cn(
                      "rounded px-3 py-1.5 text-[12px] font-medium transition-colors",
                      selectedSubjectId === subject.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {journalLoading || !journalData ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    label={t("journal.statAttendance")}
                    value={`${Math.min(journalData.summary.attendance_percent, 100)}%`}
                    hint={attendanceHint}
                  />
                  <StatCard
                    label={t("journal.statAttended")}
                    value={journalData.summary.attended_lessons}
                    hint={t("journal.statAttendedHint")}
                  />
                  <StatCard
                    label={t("journal.statMissed")}
                    value={journalData.summary.missed_lessons}
                    hint={t("journal.statMissedHint")}
                  />
                </>
              )}
            </div>

            <SectionCard
              padded={false}
              title={t("journal.sectionTitle")}
              description={t("journal.sectionDesc")}
            >
              {/* Filter bar */}
              {!journalLoading && journalData && (
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
                  {/* Status filter */}
                  <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-[12px]">
                    {STATUS_FILTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusFilter(s)}
                        className={cn(
                          "rounded px-2.5 py-1 font-medium capitalize transition-colors",
                          statusFilter === s
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {getStatusFilterLabel(s, t)}
                      </button>
                    ))}
                  </div>

                  {/* Month picker */}
                  {availableMonths.length > 0 && (
                    <select
                      value={monthFilter}
                      onChange={(e) => {
                        setMonthFilter(e.target.value);
                        setDateFrom("");
                        setDateTo("");
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2.5 text-[12px] outline-none"
                    >
                      <option value="">{t("journal.filterAllMonths")}</option>
                      {availableMonths.map((ym) => (
                        <option key={ym} value={ym}>
                          {formatMonthLabel(ym)}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Date range */}
                  <div className="flex items-center gap-1.5 text-[12px]">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => {
                        setDateFrom(e.target.value);
                        setMonthFilter("");
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-[12px] outline-none"
                    />
                    <span className="text-muted-foreground">—</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        setMonthFilter("");
                      }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-[12px] outline-none"
                    />
                  </div>

                  {anyFilterActive && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> {t("journal.filterReset")}
                    </button>
                  )}

                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {filteredJournal.length} {t("journal.entries")}
                  </span>
                </div>
              )}

              {journalLoading || !journalData ? (
                <ul className="divide-y divide-border">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-4 px-4 py-3">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="ml-auto h-3 w-16" />
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">{t("journal.colDate")}</th>
                          <th className="px-4 py-2.5 font-medium">{t("journal.colTime")}</th>
                          <th className="px-4 py-2.5 font-medium">{t("journal.colStatus")}</th>
                          <th className="px-4 py-2.5 font-medium">{t("journal.colMarkedAt")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {pageRows.map((entry) => (
                          <tr key={entry.id} className="transition-colors hover:bg-accent/30">
                            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                              {entry.date}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">{entry.time.slice(0, 5)}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                  entry.status === "present"
                                    ? "border-success/30 bg-success/10 text-success"
                                    : entry.status === "late"
                                      ? "border-warning/40 bg-warning/15 text-warning-foreground"
                                      : entry.status === "absent"
                                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                                        : "border-border bg-muted text-muted-foreground",
                                )}
                              >
                                {entry.status === "present"
                                  ? t("journal.statusPresent")
                                  : entry.status === "late"
                                    ? t("journal.statusLate")
                                    : entry.status === "absent"
                                      ? t("journal.statusAbsent")
                                      : t("journal.statusNotMarked")}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                              {entry.marked_at
                                ? new Date(entry.marked_at).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                        {pageRows.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-10 text-center text-[13px] text-muted-foreground"
                            >
                              {t("journal.noMatch")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">
                      {filteredJournal.length === 0
                        ? `0 ${t("journal.entries")}`
                        : `${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredJournal.length)} of ${filteredJournal.length}`}
                    </span>
                    <PaginationBar page={safePage} totalPages={totalPages} onChange={setPage} />
                  </div>
                </>
              )}
            </SectionCard>
          </>
        )}
      </PageBody>
    </>
  );
}
