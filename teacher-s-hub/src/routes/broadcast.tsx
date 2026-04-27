import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Search,
  Send,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageBody, PageHeader } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { requireAuth } from "@/lib/route-auth";
import { getGroupList, type ApiGroup } from "@/lib/groups";
import { getScheduleList } from "@/lib/schedule";
import {
  getGroupLeaders,
  sendBroadcast,
  type GroupLeader,
} from "@/lib/telegramSettings";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/broadcast")({
  beforeLoad: requireAuth,
  head: () => ({
    meta: [{ title: "Broadcast - Lectern" }],
  }),
  component: BroadcastPage,
});

type MessageTemplate = { id: string; name: string; body: string };

const TEMPLATES_KEY = "broadcast_templates_v1";

function loadTemplates(): MessageTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistTemplates(templates: MessageTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function BroadcastPage() {
  const { t } = useI18n();

  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [leaders, setLeaders] = useState<GroupLeader[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [groupSubjectMap, setGroupSubjectMap] = useState<Map<number, Set<string>>>(new Map());

  // Templates
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => loadTemplates());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    getGroupList()
      .then((r) => setGroups(r.groups))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const today = new Date();
    const dateFrom = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const dateTo = formatDate(new Date(today.getFullYear(), today.getMonth() + 3, 0));
    getScheduleList({ dateFrom, dateTo, showAll: false })
      .then((entries) => {
        const subjectSet = new Set<string>();
        const map = new Map<number, Set<string>>();
        for (const e of entries) {
          if (!e.subject_name) continue;
          subjectSet.add(e.subject_name);
          if (!map.has(e.group)) map.set(e.group, new Set());
          map.get(e.group)!.add(e.subject_name);
        }
        setGroupSubjectMap(map);
      })
      .catch(() => {});
  }, []);

  const searchFilteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.group_specialty.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const availableSubjects = useMemo(() => {
    const seen = new Set<string>();
    for (const g of searchFilteredGroups) {
      groupSubjectMap.get(g.id)?.forEach((s) => seen.add(s));
    }
    return [...seen].sort();
  }, [searchFilteredGroups, groupSubjectMap]);

  const filteredGroups = useMemo(() => {
    if (subjectFilter === "all") return searchFilteredGroups;
    return searchFilteredGroups.filter((g) =>
      groupSubjectMap.get(g.id)?.has(subjectFilter)
    );
  }, [searchFilteredGroups, subjectFilter, groupSubjectMap]);

  const allFilteredSelected =
    filteredGroups.length > 0 && filteredGroups.every((g) => selectedIds.has(g.id));

  useEffect(() => {
    if (selectedIds.size === 0) {
      setLeaders([]);
      return;
    }
    setLoadingLeaders(true);
    Promise.all([...selectedIds].map((id) => getGroupLeaders(id)))
      .then((results) => {
        const seen = new Set<number>();
        const merged: GroupLeader[] = [];
        for (const list of results) {
          for (const l of list) {
            if (!seen.has(l.student_id)) {
              seen.add(l.student_id);
              merged.push(l);
            }
          }
        }
        setLeaders(merged);
      })
      .catch(() => {})
      .finally(() => setLoadingLeaders(false));
  }, [selectedIds]);

  const connectedCount = leaders.filter((l) => l.telegram_connected).length;

  function toggleGroup(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredGroups.forEach((g) => next.delete(g.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredGroups.forEach((g) => next.add(g.id));
        return next;
      });
    }
  }

  function handleSaveTemplate() {
    if (!message.trim() || !templateName.trim()) return;
    const entry: MessageTemplate = {
      id: Date.now().toString(),
      name: templateName.trim(),
      body: message.trim(),
    };
    const updated = [...templates, entry];
    setTemplates(updated);
    persistTemplates(updated);
    setTemplateName("");
    setShowSaveDialog(false);
    toast.success(t("broadcast.templateSaved"));
  }

  function handleDeleteTemplate(id: string) {
    const updated = templates.filter((tpl) => tpl.id !== id);
    setTemplates(updated);
    persistTemplates(updated);
  }

  async function handleSend() {
    if (selectedIds.size === 0) {
      toast.error(t("broadcast.errorNoGroups"));
      return;
    }
    if (!message.trim()) {
      toast.error(t("broadcast.errorNoMessage"));
      return;
    }
    setSending(true);
    try {
      const result = await sendBroadcast([...selectedIds], message.trim());
      toast.success(
        t("broadcast.success").replace("{count}", String(result.recipients))
      );
      setMessage("");
      setSelectedIds(new Set());
    } catch (err: unknown) {
      const msg =
        err instanceof Error && err.message.includes("No group leaders")
          ? t("broadcast.errorNoLeaders")
          : t("broadcast.errorSend");
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("broadcast.title")}
        description={t("broadcast.description")}
      />
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] max-w-5xl">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* Group selector */}
            <SectionCard title={t("broadcast.selectGroups")}>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-40">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      className="pl-8 h-8 text-sm"
                      placeholder={t("broadcast.search")}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setSubjectFilter("all");
                      }}
                    />
                  </div>

                  {availableSubjects.length > 0 && (
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger className="h-8 text-sm w-auto min-w-35 gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder={t("broadcast.filterSubject")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("broadcast.allSubjects")}</SelectItem>
                        {availableSubjects.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-sm"
                    onClick={toggleSelectAll}
                    disabled={filteredGroups.length === 0}
                    type="button"
                  >
                    {allFilteredSelected
                      ? t("broadcast.deselectAll")
                      : t("broadcast.selectAll")}
                  </Button>
                </div>

                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("broadcast.noGroups")}
                  </p>
                ) : filteredGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("broadcast.noResult")}
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredGroups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGroup(g.id)}
                        className={cn(
                          "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                          selectedIds.has(g.id)
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-card text-foreground hover:border-primary/40"
                        )}
                      >
                        <div className="font-medium">{g.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {g.group_specialty}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Message */}
            <SectionCard title={t("broadcast.message")}>
              <div className="space-y-3">
                {templates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">
                      {t("broadcast.savedTemplates")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="flex items-center gap-1 rounded-full border border-border bg-muted/40 pl-3 pr-1 py-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => setMessage(tpl.body)}
                            className="text-xs text-foreground hover:text-primary transition-colors"
                          >
                            {tpl.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded-full"
                            aria-label={t("broadcast.templateDelete")}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  placeholder={t("broadcast.messagePlaceholder")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t("broadcast.sendHint")}
                </p>

                {message.trim() && (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowSaveDialog(true)}
                  >
                    {t("broadcast.saveTemplate")}
                  </Button>
                )}
              </div>
            </SectionCard>

            <Button
              className="w-full"
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0 || !message.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? t("broadcast.sending") : t("broadcast.send")}
            </Button>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">
            {selectedIds.size > 0 && (
              <SectionCard title={t("broadcast.summarySection")}>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {t("broadcast.summaryGroups").replace("{count}", "")}
                    </dt>
                    <dd className="font-medium">{selectedIds.size}</dd>
                  </div>
                  {!loadingLeaders && (
                    <>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          {t("broadcast.summaryLeaders").replace("{count}", "")}
                        </dt>
                        <dd className="font-medium">{leaders.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">
                          {t("broadcast.summaryConnected").replace("{count}", "")}
                        </dt>
                        <dd className="font-medium text-green-600 dark:text-green-400">
                          {connectedCount}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </SectionCard>
            )}

            <SectionCard title={t("broadcast.leadersSection")}>
              {selectedIds.size === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("broadcast.selectGroupsPlaceholder")}
                </p>
              ) : loadingLeaders ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  {t("notifications.loading")}
                </p>
              ) : leaders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("broadcast.leaderNoLeader")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {leaders.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                    >
                      <span className="text-sm">
                        {l.first_name} {l.last_name}
                      </span>
                      {l.telegram_connected ? (
                        <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 text-xs">
                          <Wifi className="h-3 w-3" />
                          {t("broadcast.leaderConnected")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <WifiOff className="h-3 w-3" />
                          {t("broadcast.leaderNotConnected")}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>
      </PageBody>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("broadcast.saveTemplate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="tpl-name" className="text-sm">
              {t("broadcast.templateName")}
            </Label>
            <Input
              id="tpl-name"
              placeholder={t("broadcast.templateNamePlaceholder")}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTemplate();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(false)}
            >
              {t("addLesson.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {t("broadcast.templateSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
