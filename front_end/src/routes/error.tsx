import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Ban,
  CloudOff,
  FileQuestion,
  Lock,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  Timer,
  Wrench,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "warning" | "destructive" | "muted" | "info";

type ErrorSpec = {
  title: string;
  category: string;
  summary: string;
  detail: string;
  icon: typeof AlertTriangle;
  tone: Tone;
};

const map: Record<string, ErrorSpec> = {
  "400": {
    title: "Bad request",
    category: "Client",
    summary: "The request couldn't be processed.",
    detail: "Some fields are missing or invalid. Review your input and try again.",
    icon: AlertTriangle,
    tone: "warning",
  },
  "401": {
    title: "Sign in required",
    category: "Auth",
    summary: "Your session has expired.",
    detail: "Please sign in again to continue managing attendance and student records.",
    icon: Lock,
    tone: "info",
  },
  "403": {
    title: "Access denied",
    category: "Permissions",
    summary: "You don't have permission to view this page.",
    detail: "This area is restricted. Ask an administrator to grant you access.",
    icon: ShieldAlert,
    tone: "destructive",
  },
  "404": {
    title: "Page not found",
    category: "Navigation",
    summary: "We couldn't find what you were looking for.",
    detail: "The page may have been moved, renamed, or never existed. Check the URL or return to the dashboard.",
    icon: FileQuestion,
    tone: "muted",
  },
  "408": {
    title: "Request timed out",
    category: "Network",
    summary: "The server took too long to respond.",
    detail: "Your connection seems slow. Check your network and retry the request.",
    icon: Timer,
    tone: "warning",
  },
  "429": {
    title: "Too many requests",
    category: "Rate limit",
    summary: "Slow down — you're going too fast.",
    detail: "We've temporarily limited requests from this account. Try again in a few seconds.",
    icon: Ban,
    tone: "warning",
  },
  "500": {
    title: "Internal server error",
    category: "Server",
    summary: "Something went wrong on our end.",
    detail: "Our team has been notified. You can retry, or come back in a few minutes.",
    icon: ServerCrash,
    tone: "destructive",
  },
  "501": {
    title: "Not implemented",
    category: "Server",
    summary: "This feature isn't available yet.",
    detail: "We're still building this functionality. Check back soon.",
    icon: Wrench,
    tone: "muted",
  },
  "502": {
    title: "Bad gateway",
    category: "Server",
    summary: "Upstream service returned an invalid response.",
    detail: "A dependent service appears to be unreachable. Please try again shortly.",
    icon: CloudOff,
    tone: "destructive",
  },
  "503": {
    title: "Service unavailable",
    category: "Maintenance",
    summary: "Lectern is undergoing scheduled maintenance.",
    detail: "We'll be back online shortly. Active sessions will resume automatically.",
    icon: Wrench,
    tone: "info",
  },
  "504": {
    title: "Gateway timeout",
    category: "Network",
    summary: "The upstream service didn't respond in time.",
    detail: "This usually resolves on its own. Retry in a moment.",
    icon: Timer,
    tone: "warning",
  },
};

const tones: Record<Tone, { iconBg: string; iconFg: string; chip: string }> = {
  warning: {
    iconBg: "bg-amber-500/10",
    iconFg: "text-amber-600 dark:text-amber-400",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  destructive: {
    iconBg: "bg-destructive/10",
    iconFg: "text-destructive",
    chip: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  muted: {
    iconBg: "bg-muted",
    iconFg: "text-muted-foreground",
    chip: "border-border bg-muted text-muted-foreground",
  },
  info: {
    iconBg: "bg-primary/10",
    iconFg: "text-primary",
    chip: "border-primary/30 bg-primary/10 text-primary",
  },
};

export const Route = createFileRoute("/error")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : "404",
    message: typeof search.message === "string" ? search.message : undefined,
  }),
  head: ({ match }) => {
    const code = (match.search as { code?: string })?.code ?? "404";
    return {
      meta: [
        { title: `Error ${code} — Lectern` },
        { name: "description", content: `Error ${code} occurred while loading this page.` },
      ],
    };
  },
  component: ErrorPage,
});

export function ErrorView({ code, message }: { code: string; message?: string }) {
  const router = useRouter();
  const spec = map[code] ?? map["500"];
  const Icon = spec.icon;
  const t = tones[spec.tone];

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="relative w-full max-w-md text-center">
        <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-xl", t.iconBg)}>
          <Icon className={cn("h-7 w-7", t.iconFg)} />
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", t.chip)}>
            {spec.category}
          </span>
          <span className="font-mono text-[11px] font-semibold tracking-widest text-muted-foreground">
            ERROR {code}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{spec.title}</h1>
        <p className="mt-2 text-[14px] text-foreground/85">{spec.summary}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {message ?? spec.detail}
        </p>

        <div className="mt-7 flex items-center justify-center gap-2">
          <Button asChild size="sm" className="h-9">
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => {
              router.invalidate();
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>

        <p className="mt-8 font-mono text-[10px] text-muted-foreground/70">
          HTTP/{code} · Lectern
        </p>
      </div>
    </div>
  );
}

function ErrorPage() {
  const { code, message } = Route.useSearch();
  return <ErrorView code={code} message={message} />;
}
