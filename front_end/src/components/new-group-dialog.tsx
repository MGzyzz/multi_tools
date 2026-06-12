import { useState, type ReactNode, type FormEvent } from "react";
import { Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/auth";
import { createGroup, formatCourseLabel, type ApiGroup } from "@/lib/groups";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const courses = ["1", "2", "3", "4"];

export function NewGroupDialog({
  trigger,
  onCreated,
}: {
  trigger: ReactNode;
  onCreated?: (group: ApiGroup) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [course, setCourse] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setSpecialty("");
    setCourse("1");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !specialty.trim()) {
      toast.error(t("newGroup.validationError"));
      return;
    }

    setSubmitting(true);

    try {
      const group = await createGroup({
        name: name.trim(),
        course,
        group_specialty: specialty.trim(),
      });

      setOpen(false);
      onCreated?.(group);
      toast.success(t("newGroup.toastSuccess"), {
        description: `${group.name} · ${formatCourseLabel(group.course)}`,
      });
      reset();
    } catch (error) {
      const description = error instanceof ApiError ? error.message : t("newGroup.apiError");
      toast.error(t("newGroup.toastError"), { description });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </div>
          <DialogTitle>{t("newGroup.title")}</DialogTitle>
          <DialogDescription>{t("newGroup.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="g-name">{t("newGroup.labelName")}</Label>
              <Input
                id="g-name"
                placeholder={t("newGroup.placeholderName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="g-course">{t("newGroup.labelCourse")}</Label>
              <Select value={course} onValueChange={setCourse} disabled={submitting}>
                <SelectTrigger id="g-course" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatCourseLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="g-specialty">{t("newGroup.labelSpecialty")}</Label>
              <Input
                id="g-specialty"
                placeholder={t("newGroup.placeholderSpecialty")}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="mt-1.5"
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("newGroup.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("newGroup.creating") : t("newGroup.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
