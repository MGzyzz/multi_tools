import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, CalendarDays, CheckCircle2, Inbox, Loader2, ScanFace, Users } from "lucide-react";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/route-auth";
import { getNotifications, markNotificationRead, type ApiNotification } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [{ title: "Notifications — Lectern" }],
  }),
  component: NotificationsPage,
});

type NotificationUIType = "scan" | "risk" | "schedule" | "group" | "system";

const TYPE_ICONS: Record<NotificationUIType, { icon: typeof Bell; tone: string }> = {
  scan: { icon: ScanFace, tone: "text-primary bg-primary/10" },
  risk: { icon: AlertTriangle, tone: "text-destructive bg-destructive/10" },
  schedule: { icon: CalendarDays, tone: "text-info bg-info/10" },
  group: { icon: Users, tone: "text-warning bg-warning/10" },
  system: { icon: CheckCircle2, tone: "text-success bg-success/10" },
};

function resolveType(event_type: string): NotificationUIType {
  const et = event_type.toUpperCase();
  if (et.includes("RISK") || et.includes("PERFORMANCE")) return "risk";
  if (et.includes("SCHEDULE")) return "schedule";
  if (et.includes("GROUP")) return "group";
  if (et.includes("STUDENT")) return "system";
  return "system";
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PAGE_SIZE = 20;

function NotificationsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchPage = (offset: number, append: boolean) => {
    const controller = new AbortController();
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError("");

    getNotifications(
      { limit: PAGE_SIZE, offset, ...(filter === "unread" ? { is_read: false } : {}) },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems((prev) => (append ? [...prev, ...data] : data));
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Failed to load notifications.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      });

    return () => controller.abort();
  };

  useEffect(() => {
    const cleanup = fetchPage(0, false);
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const markOneRead = (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    void markNotificationRead(id).catch(() => {});
  };

  const markAllRead = () => {
    const unread = items.filter((n) => !n.is_read);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    for (const n of unread) void markNotificationRead(n.id).catch(() => {});
  };

  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <>
      <PageHeader
        title={t("notifications.title")}
        description={loading ? t("notifications.loading") : `${unreadCount} ${t("notifications.unread")}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              {t("notifications.filterAll")}
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
            >
              {t("notifications.filterUnread")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount === 0}
              onClick={markAllRead}
            >
              {t("notifications.markAllRead")}
            </Button>
          </div>
        }
      />
      <PageBody>
        <SectionCard title={t("notifications.sectionTitle")}>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">{t("notifications.loadingDesc")}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">{t("notifications.empty")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const uiType = resolveType(n.event_type);
                const meta = TYPE_ICONS[uiType];
                const Icon = meta.icon;
                const typeLabel = t(`notifications.typeLabels.${uiType}`);
                return (
                  <li
                    key={n.id}
                    onClick={() => !n.is_read && markOneRead(n.id)}
                    className={cn(
                      "flex items-start gap-4 px-4 py-4 transition-colors hover:bg-accent/40",
                      !n.is_read && "bg-primary/2.5 cursor-pointer",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        meta.tone,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p className={cn("text-sm font-medium leading-snug", !n.is_read && "text-foreground")}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {typeLabel} · {formatDate(n.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore && (
            <div className="flex justify-center border-t border-border px-4 py-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={loadingMore}
                onClick={() => fetchPage(items.length, true)}
              >
                {loadingMore ? (
                  <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> {t("notifications.loading")}</>
                ) : (
                  t("notifications.loadMore")
                )}
              </Button>
            </div>
          )}
        </SectionCard>
      </PageBody>
    </>
  );
}
