import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Loader2,
  ScanFace,
  AlertTriangle,
  CalendarDays,
  Users,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getNotifications, markNotificationRead, type ApiNotification } from "@/lib/notifications";

const POPOVER_LIMIT = 10;

type NotificationUIType = "scan" | "risk" | "schedule" | "group" | "system";

const typeMeta: Record<NotificationUIType, { icon: typeof Bell; tone: string }> = {
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

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function NotificationsButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getNotifications({ limit: POPOVER_LIMIT }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoading(true);
    setError("");

    getNotifications({ limit: POPOVER_LIMIT }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to load notifications.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open]);

  const unreadCount = items.filter((n) => !n.is_read).length;
  const showDot = unreadCount > 0;

  const markAllRead = () => {
    const unread = items.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));

    for (const n of unread) {
      void markNotificationRead(n.id).catch(() => {});
    }
  };

  const markOneRead = (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    void markNotificationRead(id).catch(() => {});
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("notifications.title")}
          className="relative h-8 w-8"
        >
          <Bell className="h-4 w-4" />
          {showDot && (
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-90 p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t("notifications.title")}</h3>
            {!loading && unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={markAllRead}
            disabled={loading || unreadCount === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {t("notifications.markAllRead")}
          </button>
        </div>

        {/* Body */}
        <div className="max-h-95 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-xs">{t("notifications.loadingDesc")}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-muted-foreground">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-muted-foreground">
              <Inbox className="h-6 w-6" />
              <p className="text-xs">{t("notifications.allCaughtUp")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const uiType = resolveType(n.event_type);
                const meta = typeMeta[uiType];
                const Icon = meta.icon;
                return (
                  <li
                    key={n.id}
                    onClick={() => !n.is_read && markOneRead(n.id)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/40",
                      !n.is_read && "bg-primary/2.5 cursor-pointer",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        meta.tone,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-[13px] font-medium leading-tight">{n.title}</p>
                        {!n.is_read && (
                          <span
                            aria-label="Unread"
                            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatRelativeTime(n.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-center">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("notifications.viewAll")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
