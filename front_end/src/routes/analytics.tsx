import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TrendingUp, Users, AlertTriangle, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageBody, PageHeader } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { SectionCard } from "@/components/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalyticsSummary, getAnalyticsGroups } from "@/lib/analytics";
import { ApiError } from "@/lib/auth";
import { requireAuth } from "@/lib/route-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [
      { title: "Analytics — Lectern" },
      {
        name: "description",
        content: "Teacher insights: attendance trends, risks, group performance.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getAnalyticsSummary>> | null>(
    null,
  );
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof getAnalyticsGroups>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryResponse, groupsResponse] = await Promise.all([
          getAnalyticsSummary(controller.signal),
          getAnalyticsGroups(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setSummary(summaryResponse);
        setGroups(groupsResponse);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setError(
          loadError instanceof ApiError ? loadError.message : "Unable to load analytics right now.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => controller.abort();
  }, []);

  const avg_attendance = summary?.avg_attendance ?? 0;
  const total_students = summary?.total_students ?? 0;
  const risk_breakdown = summary?.risk_breakdown ?? { high: 0, medium: 0, low: 0 };
  const attendance_trend = summary?.attendance_trend ?? [];
  const { high, medium, low } = risk_breakdown;

  const trend = attendance_trend;
  const max = trend.length ? Math.max(...trend.map((d) => d.value)) : 100;
  const min = trend.length ? Math.min(...trend.map((d) => d.value)) : 0;

  const riskRows = [
    { labelKey: "analytics.riskLow", count: low, color: "bg-success", text: "text-success" },
    {
      labelKey: "analytics.riskMedium",
      count: medium,
      color: "bg-warning",
      text: "text-warning-foreground",
    },
    {
      labelKey: "analytics.riskHigh",
      count: high,
      color: "bg-destructive",
      text: "text-destructive",
    },
  ];

  return (
    <>
      <PageHeader title={t("analytics.title")} description={t("analytics.description")} />
      <PageBody>
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error || t("analytics.error")}
          </div>
        ) : loading ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-56 w-full" />
              </div>
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-lg border border-border bg-card">
              <div className="border-b border-border p-4">
                <Skeleton className="h-4 w-36" />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b border-border last:border-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32 ml-auto" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-8 rounded-full" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label={t("analytics.statAvgAttendance")}
                value={`${avg_attendance}%`}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <StatCard
                label={t("analytics.statStudentsTracked")}
                value={total_students}
                icon={<Users className="h-4 w-4" />}
              />
              <StatCard
                label={t("analytics.statAtRisk")}
                value={high}
                icon={<AlertTriangle className="h-4 w-4" />}
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <SectionCard
                className="lg:col-span-2"
                title={t("analytics.trendTitle")}
                description={t("analytics.trendDesc")}
              >
                {trend.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("analytics.trendEmpty")}
                  </p>
                ) : (
                  <>
                    <div className="relative h-56">
                      <svg
                        viewBox="0 0 400 180"
                        className="h-full w-full"
                        preserveAspectRatio="none"
                      >
                        {[0, 1, 2, 3].map((i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={20 + i * 40}
                            x2="400"
                            y2={20 + i * 40}
                            className="stroke-border"
                            strokeWidth="1"
                          />
                        ))}
                        {(() => {
                          const range = max - min || 1;
                          const pts = trend.map((d, i) => {
                            const x = (i / Math.max(trend.length - 1, 1)) * 400;
                            const y = 160 - ((d.value - min) / range) * 130 - 10;
                            return [x, y] as const;
                          });
                          const path = pts
                            .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
                            .join(" ");
                          const area = `${path} L 400,180 L 0,180 Z`;
                          return (
                            <>
                              <path d={area} className="fill-primary/10" />
                              <path
                                d={path}
                                className="fill-none stroke-primary"
                                strokeWidth="2"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                              />
                              {pts.map(([x, y], i) => (
                                <circle key={i} cx={x} cy={y} r="3" className="fill-primary" />
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                      {trend.map((d, i) => (
                        <span
                          key={d.week}
                          className={i > 0 && i < trend.length - 1 ? "hidden sm:inline" : ""}
                        >
                          {d.week}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </SectionCard>

              <SectionCard
                title={t("analytics.riskTitle")}
                description={`${total_students} students total`}
              >
                <div className="space-y-3">
                  {riskRows.map((r) => {
                    const pct =
                      total_students > 0 ? Math.round((r.count / total_students) * 100) : 0;
                    return (
                      <div key={r.labelKey}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium">{t(r.labelKey)}</span>
                          <span className={cn("tabular-nums", r.text)}>
                            {r.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full", r.color)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  {t("analytics.riskNote")}
                </div>
              </SectionCard>
            </div>

            <div className="mt-6">
              <SectionCard
                title={t("analytics.groupPerfTitle")}
                description={t("analytics.groupPerfDesc")}
                padded={false}
              >
                {groups.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("analytics.groupPerfEmpty")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">{t("analytics.colGroup")}</th>
                          <th className="hidden sm:table-cell px-4 py-2.5 font-medium">{t("analytics.colSubject")}</th>
                          <th className="px-4 py-2.5 font-medium text-right">
                            {t("analytics.colAttendance")}
                          </th>
                          <th className="px-4 py-2.5 font-medium text-right">
                            {t("analytics.colAtRisk")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...groups]
                          .sort((a, b) => b.at_risk - a.at_risk || a.avg_attendance - b.avg_attendance)
                          .map((g) => (
                          <tr
                            key={g.id}
                            className="cursor-pointer hover:bg-accent/40"
                            onClick={() => navigate({ to: "/students", search: { group: g.name, groupId: g.id } })}
                          >
                            <td className="px-4 py-2.5 font-medium">{g.name}</td>
                            <td className="hidden sm:table-cell px-4 py-2.5 text-muted-foreground">{g.subject}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {g.avg_attendance}%
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                                  g.at_risk > 4
                                    ? "bg-destructive/10 text-destructive"
                                    : g.at_risk > 2
                                      ? "bg-warning/15 text-warning-foreground"
                                      : "bg-success/10 text-success",
                                )}
                              >
                                {g.at_risk}
                                <ChevronRight className="h-3.5 w-3.5 ml-1 text-muted-foreground/50 inline" />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
