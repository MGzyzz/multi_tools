import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Users, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageBody, PageHeader } from "@/components/app-shell";
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
import { NewGroupDialog } from "@/components/new-group-dialog";
import { ApiError } from "@/lib/auth";
import { formatCourseLabel, getGroupList, type ApiGroup } from "@/lib/groups";
import { requireAuth } from "@/lib/route-auth";
import { cn } from "@/lib/utils";

const PAGE_SIZE_GRID = 12;
const PAGE_SIZE_TABLE = 20;

export const Route = createFileRoute("/groups")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Groups - Lectern" },
      { name: "description", content: "Manage your teaching groups and rosters." },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE_GRID);

  useEffect(() => {
    const controller = new AbortController();

    const loadGroups = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getGroupList(controller.signal);
        setGroups(response.groups);
        setTotalStudents(response.total_students);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof ApiError ? err.message : "Unable to load groups right now.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadGroups();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setVisibleCount(view === "grid" ? PAGE_SIZE_GRID : PAGE_SIZE_TABLE);
  }, [view, query, courseFilter, specialtyFilter]);

  const formatLocalizedCourseLabel = (course: string) => {
    const normalized = course.trim();
    if (/^\d+$/.test(normalized)) {
      return `${t("newGroup.labelCourse")} ${normalized}`;
    }
    return formatCourseLabel(course);
  };

  const uniqueCourses = useMemo(
    () => [...new Set(groups.map((g) => g.course))].sort(),
    [groups],
  );

  const uniqueSpecialties = useMemo(
    () => [...new Set(groups.map((g) => g.group_specialty).filter(Boolean))].sort(),
    [groups],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return groups.filter((group) => {
      if (courseFilter !== "all" && group.course !== courseFilter) return false;
      if (specialtyFilter !== "all" && group.group_specialty !== specialtyFilter) return false;
      if (!normalizedQuery) return true;
      return (
        group.name.toLowerCase().includes(normalizedQuery) ||
        group.group_specialty.toLowerCase().includes(normalizedQuery) ||
        formatLocalizedCourseLabel(group.course).toLowerCase().includes(normalizedQuery)
      );
    });
  }, [groups, query, courseFilter, specialtyFilter, formatLocalizedCourseLabel]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const pageSize = view === "grid" ? PAGE_SIZE_GRID : PAGE_SIZE_TABLE;

  const handleCreated = (group: ApiGroup) => {
    setGroups((prev) => [group, ...prev]);
    setTotalStudents((prev) => prev + group.students_count);
  };

  const groupsCountLabel = loading
    ? t("groups.loading")
    : `${groups.length} ${t("groups.activeGroups")}`;
  const studentsCountLabel = loading ? "" : `${totalStudents} ${t("groups.studentsTotal")}`;
  const headerDescription = studentsCountLabel
    ? `${groupsCountLabel} · ${studentsCountLabel}`
    : groupsCountLabel;

  return (
    <>
      <PageHeader
        title={t("groups.title")}
        description={headerDescription}
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              {t("groups.import")}
            </Button>
            <NewGroupDialog
              onCreated={handleCreated}
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4" /> {t("groups.newGroup")}
                </Button>
              }
            />
          </>
        }
      />
      <PageBody>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("groups.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 pl-8"
              />
            </div>

            {uniqueCourses.length > 1 && (
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder={t("groups.filterCourse")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("groups.filterCourse")}</SelectItem>
                  {uniqueCourses.map((c) => (
                    <SelectItem key={c} value={c}>
                      {formatLocalizedCourseLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {uniqueSpecialties.length > 1 && (
              <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                <SelectTrigger className="h-9 w-48">
                  <SelectValue placeholder={t("groups.filterSpecialty")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("groups.filterSpecialty")}</SelectItem>
                  {uniqueSpecialties.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
            {(["grid", "table"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className={cn(
                  "rounded px-3 py-1.5 capitalize transition-colors",
                  view === value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`groups.view${value.charAt(0).toUpperCase()}${value.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 h-32 flex flex-col justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
            <div className="text-base font-medium">
              {groups.length === 0 ? t("groups.emptyTitle") : t("groups.emptyNoMatch")}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {groups.length === 0 ? t("groups.emptyDesc") : t("groups.emptyNoMatchDesc")}
            </p>
          </div>
        ) : view === "grid" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate({ to: "/students", search: { group: group.name, groupId: group.id } })}
                  className="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {formatLocalizedCourseLabel(group.course)}
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">{group.name}</div>
                    <div className="text-sm text-muted-foreground">{group.group_specialty}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {group.students_count}{" "}
                      {t("groups.studentsCount")}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      {t("groups.open")} <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t("groups.showing")} {visible.length} {t("groups.of")} {filtered.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + pageSize)}
                >
                  {t("groups.loadMore")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{t("groups.colGroup")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("groups.colSpecialty")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("groups.colCourse")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("groups.colStudents")}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((group) => (
                    <tr key={group.id} className="transition-colors hover:bg-accent/30">
                      <td className="px-4 py-2.5 font-medium">{group.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{group.group_specialty}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {formatLocalizedCourseLabel(group.course)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{group.students_count}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/students", search: { group: group.name, groupId: group.id } })}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {t("groups.open")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t("groups.showing")} {visible.length} {t("groups.of")} {filtered.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + pageSize)}
                >
                  {t("groups.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
