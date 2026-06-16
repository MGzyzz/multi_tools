import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Server,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  getSystemStatus,
  getSystemStatusHistory,
  pivotHistory,
  unstableSinceMinutes,
  type SystemStatusHistory,
  type SystemStatusLevel,
  type SystemStatusResponse,
  type SystemStatusService,
} from "@/lib/system-status";
import { SeveritySparkline } from "@/components/severity-sparkline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Lectern Status" },
      {
        name: "description",
        content: "Operational status for Lectern services.",
      },
    ],
  }),
  component: StatusPage,
});

const statusTone: Record<SystemStatusLevel, string> = {
  operational: "border-success/30 bg-success/10 text-success",
  degraded: "border-warning/40 bg-warning/10 text-warning",
  outage: "border-destructive/30 bg-destructive/10 text-destructive",
  unknown: "border-border bg-muted text-muted-foreground",
};

const statusDot: Record<SystemStatusLevel, string> = {
  operational: "bg-success shadow-[0_0_0_4px_color-mix(in_oklab,var(--success)_20%,transparent)]",
  degraded: "bg-warning shadow-[0_0_0_4px_color-mix(in_oklab,var(--warning)_22%,transparent)]",
  outage:
    "bg-destructive shadow-[0_0_0_4px_color-mix(in_oklab,var(--destructive)_20%,transparent)]",
  unknown: "bg-muted-foreground",
};

function serviceStatusLabel(status: SystemStatusLevel, t: (key: string) => string) {
  return t(`status.service.${status}`);
}

function overallTitle(status: SystemStatusLevel, t: (key: string) => string) {
  return t(`status.overall.${status}`);
}

function overallDescription(status: SystemStatusLevel, t: (key: string) => string) {
  return t(`status.desc.${status}`);
}

function formatCheckedAt(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatDetailValue(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function StatusSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="min-w-0 flex-1">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="mt-5 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function ServiceCard({
  service,
  series,
  windowMinutes,
  unstableSinceMin,
  t,
}: {
  service: SystemStatusService;
  series: number[];
  windowMinutes: number;
  unstableSinceMin: number | null;
  t: (key: string) => string;
}) {
  const detailEntries = Object.entries(service.details ?? {});
  const translatedName = t(`status.serviceName.${service.key}`);
  const serviceName = translatedName.startsWith("status.serviceName.")
    ? service.name
    : translatedName;

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Server className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-card-foreground">
              {serviceName}
            </h2>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {service.message}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium",
            statusTone[service.status],
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[service.status])} />
          {serviceStatusLabel(service.status, t)}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          {service.latency_ms !== null
            ? t("status.latency").replace("{ms}", String(service.latency_ms))
            : t("status.noLatency")}
        </span>
        {service.critical && (
          <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
            {t("status.critical")}
          </span>
        )}
      </div>

      <SeveritySparkline
        series={series}
        status={service.status}
        windowMinutes={windowMinutes}
        unstableSinceMin={unstableSinceMin}
      />

      {detailEntries.length > 0 && (
        <div className="mt-3 rounded-md bg-muted/60 p-3">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("status.details")}
          </div>
          <dl className="grid gap-1.5 text-xs">
            {detailEntries.slice(0, 4).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <dt className="truncate text-muted-foreground">{key.replace(/_/g, " ")}</dt>
                <dd className="max-w-[55%] truncate font-medium text-foreground">
                  {formatDetailValue(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </article>
  );
}

function StatusPage() {
  const { t, lang } = useI18n();
  const locale = lang === "ru" ? "ru-RU" : lang === "kk" ? "kk-KZ" : "en-US";
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [history, setHistory] = useState<SystemStatusHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    setRefreshing(true);
    setError("");
    const [statusRes, historyRes] = await Promise.allSettled([
      getSystemStatus(),
      getSystemStatusHistory(30),
    ]);
    if (statusRes.status === "fulfilled") setData(statusRes.value);
    else setError(t("status.errorBody"));
    if (historyRes.status === "fulfilled") setHistory(historyRes.value);
    setRefreshing(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    const load = async () => {
      const [statusRes, historyRes] = await Promise.allSettled([
        getSystemStatus(controller.signal),
        getSystemStatusHistory(30, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (statusRes.status === "fulfilled") {
        setData(statusRes.value);
        setError("");
      } else {
        setError(t("status.errorBody"));
      }
      if (historyRes.status === "fulfilled") setHistory(historyRes.value);
    };

    void load().finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    const interval = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [lang]);

  const overallStatus = data?.status ?? (error ? "unknown" : "operational");
  const checkedAt = useMemo(() => {
    if (!data?.checked_at) return "";
    return formatCheckedAt(data.checked_at, locale);
  }, [data?.checked_at, locale]);

  const pivoted = useMemo(() => pivotHistory(history), [history]);
  const unstableSince = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const service of data?.services ?? []) {
      map[service.key] = unstableSinceMinutes(history, service.key);
    }
    return map;
  }, [history, data]);
  const windowMinutes = history?.window_minutes ?? 30;
  const services = data?.services ?? [];
  const unstableCount = services.filter((s) => s.status !== "operational").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("status.backHome")}
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadStatus()}
            disabled={refreshing}
          >
            <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? t("status.refreshing") : t("status.refresh")}
          </Button>
        </header>

        <section className="py-10">
          <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span
                className={cn(
                  "mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                  statusTone[overallStatus],
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", statusDot[overallStatus])} />
                {t("status.badge")}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {overallTitle(overallStatus, t)}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {data
                  ? overallStatus === "operational"
                    ? overallDescription(overallStatus, t)
                    : t("status.summary.unstableCount")
                        .replace("{n}", String(unstableCount))
                        .replace("{m}", String(services.length))
                        .replace("{min}", String(windowMinutes))
                  : t("status.subtitle")}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>{t("status.lastChecked")}</span>
              </div>
              <div className="mt-1 font-medium">{checkedAt || t("status.loading")}</div>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">{t("status.errorTitle")}</div>
                  <div className="mt-1 opacity-85">{error}</div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <StatusSkeleton />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <ServiceCard
                  key={service.key}
                  service={service}
                  series={pivoted[service.key] ?? []}
                  windowMinutes={windowMinutes}
                  unstableSinceMin={unstableSince[service.key] ?? null}
                  t={t}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="mt-auto flex items-center justify-between border-t border-border py-5 text-xs text-muted-foreground">
          <span>Lectern</span>
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="cursor-default border-b border-transparent transition-colors hover:border-current">
              {overallTitle(overallStatus, t)}
            </span>
          </span>
        </footer>
      </div>
    </main>
  );
}
