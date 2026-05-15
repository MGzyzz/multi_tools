// teacher-s-hub/src/components/student-photo-upload-dialog.tsx
//
// Двухрежимная загрузка фото студента:
//   1) Камера: 4 шага (прямо → влево → вправо → улыбка), зелёная индикация
//      когда поза детектирована (заглушка — подключите MediaPipe @mediapipe/face_mesh).
//   2) Файлы: множественный выбор + прогресс подготовки + Send.
//
// Использует уже подключённые в teacher-s-hub зависимости:
//   shadcn/ui (Dialog, Tabs, Button, Progress), lucide-react, sonner, cn().
//
// Использование:
//   <StudentPhotoUploadDialog
//     open={open}
//     onOpenChange={setOpen}
//     student={{ id, name }}
//     onSubmitCamera={async (blobs) => { /* POST на бэкенд */ }}
//     onSubmitFiles={async (files) => { /* POST на бэкенд */ }}
//   />

import * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Camera, Check, FileImage, Loader2, RotateCcw, ScanFace, Send, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

/* ───────────── types ───────────── */

export type PoseId = "front" | "left" | "right" | "smile";

export interface PoseShot {
  poseId: PoseId;
  blob: Blob;
  dataUrl: string;
}

export interface Student {
  id: string;
  name: string;
}

export interface StudentPhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  /** Вызывается когда сделаны все 4 снимка и пользователь нажал Отправить. */
  onSubmitCamera?: (shots: PoseShot[]) => Promise<void> | void;
  /** Вызывается когда выбраны файлы и пользователь нажал Отправить. */
  onSubmitFiles?: (files: File[]) => Promise<void> | void;
  defaultMode?: "camera" | "files";
}

interface PoseDef {
  id: PoseId;
  label: string;
  instruction: string;
  hint: string;
}

const POSES: PoseDef[] = [
  { id: "front", label: "Прямо",  instruction: "Смотрите прямо в камеру", hint: "Лицо в центре овала" },
  { id: "left",  label: "Влево",  instruction: "Поверните голову влево",  hint: "Подбородок к левому плечу" },
  { id: "right", label: "Вправо", instruction: "Поверните голову вправо", hint: "Подбородок к правому плечу" },
  { id: "smile", label: "Улыбка", instruction: "Улыбнитесь",              hint: "Покажите зубы" },
];

/* ───────────── animated content ───────────── */

function AnimatedContent({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    outer.style.height = `${inner.scrollHeight}px`;
  });

  return (
    <div
      ref={outerRef}
      style={{ overflow: "hidden", transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)" }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

function AnimatedTabs({
  defaultMode,
  className,
  children,
}: {
  defaultMode: "camera" | "files";
  className?: string;
  children: (activeTab: "camera" | "files", setActiveTab: (t: "camera" | "files") => void) => React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"camera" | "files">(defaultMode);
  return (
    <div className={className}>
      {children(activeTab, setActiveTab)}
    </div>
  );
}

/* ───────────── root dialog ───────────── */

export function StudentPhotoUploadDialog({
  open,
  onOpenChange,
  student,
  onSubmitCamera,
  onSubmitFiles,
  defaultMode = "camera",
}: StudentPhotoUploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle>Загрузка фото · {student.name}</DialogTitle>
          <DialogDescription>
            Фото используется для распознавания посещаемости.
          </DialogDescription>
        </DialogHeader>

        <AnimatedTabs defaultMode={defaultMode} className="px-6 pt-4 pb-6">
          {(activeTab, setActiveTab) => (
            <>
              <div className="mb-4 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                {(["camera", "files"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      activeTab === tab
                        ? "bg-background text-foreground shadow"
                        : "hover:text-foreground",
                    )}
                  >
                    {tab === "camera" ? <Camera className="size-4" /> : <Upload className="size-4" />}
                    {tab === "camera" ? "Сделать фото" : "Загрузить файлы"}
                  </button>
                ))}
              </div>

              <AnimatedContent>
                {activeTab === "camera" ? (
                  <CameraWizard
                    student={student}
                    onSubmit={async (shots) => {
                      await onSubmitCamera?.(shots);
                      toast.success(`Сделано ${shots.length} фото · ${student.name}`, {
                        description: "Превью обновлено. Распознавание готово.",
                      });
                      onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                  />
                ) : (
                  <FilesUploader
                    student={student}
                    onSubmit={async (files) => {
                      await onSubmitFiles?.(files);
                      toast.success(
                        `Загружено ${files.length} ${files.length === 1 ? "фото" : "фотографий"} · ${student.name}`,
                        { description: "Превью обновлено. Распознавание готово." },
                      );
                      onOpenChange(false);
                    }}
                    onCancel={() => onOpenChange(false)}
                  />
                )}
              </AnimatedContent>
            </>
          )}
        </AnimatedTabs>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── camera wizard ───────────── */

function CameraWizard({
  student: _student,
  onSubmit,
  onCancel,
}: {
  student: Student;
  onSubmit: (shots: PoseShot[]) => Promise<void> | void;
  onCancel: () => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [stepIdx, setStepIdx] = React.useState(0);
  const [shots, setShots] = React.useState<PoseShot[]>([]);
  const [poseOk, setPoseOk] = React.useState(false);
  const [streamReady, setStreamReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewing, setReviewing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Запуск камеры
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Камера не поддерживается в этом браузере");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStreamReady(true);
      } catch {
        setError("Доступ к камере не предоставлен");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Имитация распознавания позы. В проде замените на MediaPipe FaceMesh:
  // — для front: yaw ≈ 0, pitch ≈ 0
  // — для left/right: yaw отрицательный/положительный
  // — для smile: mouthAspectRatio > threshold
  React.useEffect(() => {
    if (reviewing) return;
    setPoseOk(false);
    const t = window.setTimeout(() => setPoseOk(true), 1600);
    return () => window.clearTimeout(t);
  }, [stepIdx, reviewing]);

  const capture = React.useCallback(async () => {
    const video = videoRef.current;
    if (!video || !streamReady) return;
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9),
    );
    const shot: PoseShot = { poseId: POSES[stepIdx].id, blob, dataUrl };
    const next = [...shots, shot];
    setShots(next);
    if (stepIdx < POSES.length - 1) setStepIdx(stepIdx + 1);
    else setReviewing(true);
  }, [shots, stepIdx, streamReady]);

  const retake = () => {
    setShots([]);
    setStepIdx(0);
    setReviewing(false);
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      await onSubmit(shots);
    } catch (e) {
      toast.error("Не удалось отправить фото", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  /* Review screen — после 4 снимков */
  if (reviewing) {
    return (
      <div>
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-1">Готово — проверьте снимки</h4>
          <p className="text-xs text-muted-foreground">
            Если все 4 фото получились хорошо — отправляйте. Иначе пересни́мите.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {shots.map((s, i) => (
            <div key={i} className="relative aspect-[3/4] rounded-md overflow-hidden border">
              <img src={s.dataUrl} alt={POSES[i].label} className="size-full object-cover -scale-x-100" />
              <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                {POSES[i].label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={retake} disabled={submitting}>
            <RotateCcw className="size-4" /> Пересня́ть
          </Button>
          <Button className="flex-1" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Отправить ({shots.length})
          </Button>
        </div>
      </div>
    );
  }

  const current = POSES[stepIdx];

  return (
    <div>
      {/* Stepper */}
      <ol className="flex items-center gap-2 mb-4">
        {POSES.map((p, i) => {
          const state: "done" | "active" | "idle" = i < stepIdx ? "done" : i === stepIdx ? "active" : "idle";
          return (
            <React.Fragment key={p.id}>
              <li className="flex items-center gap-2.5 flex-1">
                <div
                  className={cn(
                    "size-7 rounded-full grid place-items-center text-xs font-semibold border transition-colors",
                    state === "done" && "bg-emerald-500 text-emerald-950 border-emerald-500",
                    state === "active" && "bg-primary text-primary-foreground border-primary",
                    state === "idle" && "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {state === "done" ? <Check className="size-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    state === "active" ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {p.label}
                </span>
              </li>
              {i < POSES.length - 1 && <span className="h-px flex-1 bg-border" />}
            </React.Fragment>
          );
        })}
      </ol>

      <div className="grid grid-cols-[1fr_220px] gap-5 max-md:grid-cols-1">
        {/* Camera stage */}
        <div
          className={cn(
            "relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all bg-zinc-900",
            poseOk ? "border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" : "border-border",
          )}
        >
          {error ? (
            <div className="absolute inset-0 grid place-items-center text-center p-4">
              <div>
                <Camera className="size-16 mx-auto opacity-60 text-muted-foreground" />
                <div className="mt-3 text-sm">{error}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Разрешите камеру или загрузите файлы
                </div>
              </div>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full object-cover -scale-x-100" />
          )}

          {/* Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[56%] aspect-[3/4] rounded-full border-2 border-dashed transition-colors",
                poseOk ? "border-emerald-400 border-solid" : "border-white/50",
              )}
            />
            <div
              className={cn(
                "absolute left-4 top-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs backdrop-blur-md",
                poseOk
                  ? "bg-emerald-500/90 text-emerald-950 border border-emerald-400"
                  : "bg-black/55 text-white border border-white/10",
              )}
            >
              <span className={cn("size-2 rounded-full", poseOk ? "bg-emerald-950" : "bg-amber-400")} />
              {poseOk ? "Поза корректна" : "Подстройте позу…"}
            </div>
            <div
              className={cn(
                "absolute left-1/2 -translate-x-1/2 bottom-4 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm backdrop-blur-md max-w-[90%]",
                poseOk
                  ? "bg-emerald-500/95 text-emerald-950 border border-emerald-400"
                  : "bg-black/60 text-white border border-white/10",
              )}
            >
              {poseOk ? <Check className="size-4 shrink-0" /> : <ScanFace className="size-4 shrink-0" />}
              {poseOk ? "Готово — делайте снимок" : current.instruction}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3.5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
              Шаг {stepIdx + 1} из {POSES.length}
            </div>
            <h4 className="text-base font-semibold mb-1">{current.instruction}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{current.hint}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {POSES.map((p, i) => {
              const has = shots[i];
              const done = !!has;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "relative aspect-square rounded-lg border overflow-hidden grid place-items-center text-muted-foreground bg-muted",
                    done && "border-emerald-500/50",
                  )}
                >
                  {has ? (
                    <img src={has.dataUrl} alt={p.label} className="size-full object-cover -scale-x-100" />
                  ) : (
                    <ScanFace className="size-5" />
                  )}
                  <span className="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                    {p.label}
                  </span>
                  {done && (
                    <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-emerald-500 grid place-items-center">
                      <Check className="size-3 text-emerald-950" strokeWidth={3} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 leading-relaxed">
            <strong className="text-foreground font-semibold">Совет.</strong> Хорошее освещение и нейтральный фон помогают распознать позу быстрее.
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Отмена
        </Button>
        <Button
          className={cn("flex-1", poseOk && "bg-emerald-500 hover:bg-emerald-500/90 text-emerald-950")}
          onClick={capture}
          disabled={!poseOk}
        >
          <Camera className="size-4" />
          {poseOk ? "Сфотографировать" : "Ждём корректную позу…"}
        </Button>
      </div>
    </div>
  );
}

/* ───────────── files uploader ───────────── */

interface FileRow {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  state: "queued" | "uploading" | "done";
}

const fmtSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

function FilesUploader({
  student: _student,
  onSubmit,
  onCancel,
}: {
  student: Student;
  onSubmit: (files: File[]) => Promise<void> | void;
  onCancel: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [rows, setRows] = React.useState<FileRow[]>([]);
  const [drag, setDrag] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const addFiles = React.useCallback((list: FileList | File[]) => {
    const accepted = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const next: FileRow[] = accepted.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      progress: 0,
      state: "queued",
    }));
    setRows((prev) => [...prev, ...next]);
    next.forEach((r) => simulateProgress(r.id));
  }, []);

  // Имитация «подготовки» файла (resize/exif strip перед отправкой).
  // В проде замените на реальный pre-process + загрузку с XHR/fetch для прогресса.
  const simulateProgress = (id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, state: "uploading" } : r)));
    let p = 0;
    const tick = () => {
      p += 4 + Math.random() * 12;
      if (p >= 100) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, progress: 100, state: "done" } : r)));
      } else {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, progress: p } : r)));
        window.setTimeout(tick, 120 + Math.random() * 140);
      }
    };
    window.setTimeout(tick, 200);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
  };

  React.useEffect(
    () => () => {
      rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const allReady = rows.length > 0 && rows.every((r) => r.state === "done");
  const totalProgress = rows.length === 0 ? 0 : Math.round(rows.reduce((a, r) => a + r.progress, 0) / rows.length);

  const submit = async () => {
    try {
      setSubmitting(true);
      await onSubmit(rows.map((r) => r.file));
    } catch (e) {
      toast.error("Не удалось загрузить фото", { description: String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
          drag ? "bg-muted border-primary" : "border-border hover:bg-muted hover:border-primary/60",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
        <div className="text-sm font-medium">
          Перетащите фото сюда или <span className="text-primary">выберите файлы</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5">
          JPG, PNG, WebP до 10 МБ · можно загружать несколько фото сразу
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-4 mb-2">
            <div className="text-sm font-medium">
              {rows.length} {rows.length === 1 ? "файл" : rows.length < 5 ? "файла" : "файлов"}
              <span className="text-muted-foreground font-normal ml-2">· подготовка {totalProgress}%</span>
            </div>
            {allReady && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                <Check className="size-3.5" /> Готовы к отправке
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 border rounded-lg">
                <div className="size-11 rounded-md overflow-hidden bg-muted shrink-0 grid place-items-center">
                  {r.previewUrl ? (
                    <img src={r.previewUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <FileImage className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.file.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span>{fmtSize(r.file.size)}</span>
                    <span>·</span>
                    <span>
                      {r.state === "done"
                        ? "Готов"
                        : r.state === "uploading"
                          ? `Подготовка ${Math.round(r.progress)}%`
                          : "В очереди"}
                    </span>
                  </div>
                  <Progress
                    value={r.progress}
                    className={cn("h-1 mt-1.5", r.state === "done" && "[&>div]:bg-emerald-500")}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  className="size-7 cursor-pointer rounded grid place-items-center text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                  aria-label="Удалить файл"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-2 mt-5">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Отмена
        </Button>
        <Button className="flex-1" disabled={!allReady || submitting} onClick={submit}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {rows.length === 0
            ? "Отправить"
            : !allReady
              ? `Подготовка ${totalProgress}%`
              : `Отправить ${rows.length}`}
        </Button>
      </div>
    </div>
  );
}
