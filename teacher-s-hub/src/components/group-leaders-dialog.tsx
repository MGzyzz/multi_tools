import { useEffect, useState } from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/auth";
import {
  assignGroupLeader,
  getGroupLeaders,
  removeGroupLeader,
  type GroupLeader,
} from "@/lib/telegramSettings";

type Student = { id: number; first_name: string; last_name: string };

type Props = {
  groupId: number;
  groupName: string;
  trigger: React.ReactNode;
};

export function GroupLeadersDialog({ groupId, groupName, trigger }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [leaders, setLeaders] = useState<GroupLeader[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      getGroupLeaders(groupId),
      apiRequest<Student[]>(`/api/get_all_students/?group=${encodeURIComponent(groupName)}`),
    ])
      .then(([leadersData, studentsData]) => {
        setLeaders(leadersData);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, groupId, groupName]);

  const leaderIds = new Set(leaders.map((l) => l.student_id));
  const available = students.filter((s) => !leaderIds.has(s.id));

  async function handleAssign() {
    if (!selectedStudentId) return;
    setAssigning(true);
    try {
      const leader = await assignGroupLeader(groupId, Number(selectedStudentId));
      setLeaders((prev) => [...prev, leader]);
      setSelectedStudentId("");
      toast.success(t("groups.leaderAssigned"));
    } catch {
      toast.error(t("groups.leaderErrorAssign"));
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(studentId: number) {
    try {
      await removeGroupLeader(groupId, studentId);
      setLeaders((prev) => prev.filter((l) => l.student_id !== studentId));
      toast.success(t("groups.leaderRemoved"));
    } catch {
      toast.error(t("groups.leaderErrorRemove"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("groups.leaders")} — {groupName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground animate-pulse">
              {t("notifications.loading")}
            </p>
          ) : leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("groups.noLeaders")}</p>
          ) : (
            <ul className="space-y-2">
              {leaders.map((leader) => (
                <li
                  key={leader.id}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {leader.first_name} {leader.last_name}
                    </span>
                    {leader.telegram_connected ? (
                      <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 text-xs">
                        <Wifi className="h-3 w-3" />
                        {t("groups.leaderConnected")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <WifiOff className="h-3 w-3" />
                        {t("groups.leaderNotConnected")}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(leader.student_id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {available.length > 0 && (
            <div className="flex gap-2">
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t("groups.selectLeader")} />
                </SelectTrigger>
                <SelectContent>
                  {available.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={!selectedStudentId || assigning}
              >
                {t("groups.assignLeader")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
