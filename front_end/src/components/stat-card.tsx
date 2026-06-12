import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  trend,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "flat";
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 break-words text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2 flex min-w-0 items-baseline gap-2">
        <div className="min-w-0 break-words text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
              trend === "up" && "bg-success/10 text-success",
              trend === "down" && "bg-destructive/10 text-destructive",
              (trend === "flat" || !trend) && "bg-muted text-muted-foreground",
            )}
          >
            {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
            {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 break-words text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
