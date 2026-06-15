import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
import { requireAuth } from "@/lib/route-auth";
import {
  disconnectTelegram,
  generateLinkToken,
  getNotificationSettings,
  getTelegramStatus,
  updateNotificationSettings,
  type TeacherNotificationSettings,
} from "@/lib/telegramSettings";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [{ title: "Settings - Lectern" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();

  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!linkToken || telegramConnected) return;
    const interval = setInterval(() => {
      getTelegramStatus()
        .then((s) => {
          if (s.connected) {
            setTelegramConnected(true);
            setLinkToken(null);
            toast.success(t("settings.telegram.linkedSuccess"));
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [linkToken, telegramConnected]);

  const [reminderSettings, setReminderSettings] =
    useState<TeacherNotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTelegramStatus()
      .then((s) => setTelegramConnected(s.connected))
      .catch(() => {})
      .finally(() => setTelegramLoading(false));

    getNotificationSettings()
      .then(setReminderSettings)
      .catch(() => {});
  }, []);

  async function handleGetCode() {
    setGenerating(true);
    try {
      const res = await generateLinkToken();
      setLinkToken(res.token);
    } catch {
      toast.error(t("settings.reminders.errorSave"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectTelegram();
      setTelegramConnected(false);
      setLinkToken(null);
      toast.success(t("settings.telegram.disconnected"));
    } catch {
      toast.error(t("settings.telegram.errorDisconnect"));
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleCopyCode() {
    if (!linkToken) return;
    await navigator.clipboard.writeText(linkToken);
    setCopied(true);
    toast.success(t("settings.telegram.codeCopied"));
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveReminders() {
    if (!reminderSettings) return;
    setSaving(true);
    try {
      const updated = await updateNotificationSettings(reminderSettings);
      setReminderSettings(updated);
      toast.success(t("settings.reminders.saved"));
    } catch {
      toast.error(t("settings.reminders.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  const loading = telegramLoading || reminderSettings === null;

  return (
    <>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
      />
      <PageBody>
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
            {/* Telegram card skeleton */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
            </div>
            {/* Reminders card skeleton */}
            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="p-4 space-y-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-32 rounded-md" />
                </div>
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
          </div>
        ) : (
        <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
          {/* Telegram section */}
          <SectionCard title={t("settings.telegram.section")}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Telegram</span>
                </div>
                {telegramLoading ? (
                  <Badge variant="secondary">…</Badge>
                ) : telegramConnected ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">
                    {t("settings.telegram.status.connected")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {t("settings.telegram.status.disconnected")}
                  </Badge>
                )}
              </div>

              {telegramConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting
                    ? t("settings.telegram.disconnecting")
                    : t("settings.telegram.disconnect")}
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetCode}
                    disabled={generating}
                  >
                    {generating
                      ? t("settings.telegram.generating")
                      : t("settings.telegram.getCode")}
                  </Button>

                  {linkToken && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("settings.telegram.codeLabel")}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono tracking-widest">
                          {linkToken}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyCode}
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {t("settings.telegram.instruction")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Reminders section */}
          <SectionCard title={t("settings.reminders.section")}>
            {reminderSettings ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reminder-toggle" className="text-sm">
                    {t("settings.reminders.enabled")}
                  </Label>
                  <Switch
                    id="reminder-toggle"
                    checked={reminderSettings.lesson_reminder_enabled}
                    onCheckedChange={(v) =>
                      setReminderSettings({
                        ...reminderSettings,
                        lesson_reminder_enabled: v,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="minutes-before" className="text-sm">
                    {t("settings.reminders.minutesBefore")}
                  </Label>
                  <Input
                    id="minutes-before"
                    type="number"
                    min={1}
                    max={180}
                    className="w-32"
                    value={reminderSettings.reminder_minutes_before}
                    disabled={!reminderSettings.lesson_reminder_enabled}
                    onChange={(e) =>
                      setReminderSettings({
                        ...reminderSettings,
                        reminder_minutes_before: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <Button onClick={handleSaveReminders} disabled={saving} size="sm">
                  {saving
                    ? t("settings.reminders.saving")
                    : t("settings.reminders.save")}
                </Button>
              </div>
            ) : null}
          </SectionCard>
        </div>
        )}
      </PageBody>
    </>
  );
}
