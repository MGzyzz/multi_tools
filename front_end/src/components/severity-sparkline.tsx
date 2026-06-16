import { useI18n } from "@/lib/i18n";
import type { SystemStatusLevel } from "@/lib/system-status";
import { cn } from "@/lib/utils";

const sparkStroke: Record<SystemStatusLevel, string> = {
  operational: "var(--success)",
  degraded: "var(--warning)",
  outage: "var(--destructive)",
  unknown: "var(--muted-foreground)",
};

const W = 240;
const H = 34;
const PAD = 4;
const MAX_SEVERITY = 2;

function toPoints(series: number[]): string {
  const n = series.length;
  const stepX = n > 1 ? (W - PAD * 2) / (n - 1) : 0;
  return series
    .map((value, index) => {
      const clamped = Math.max(0, Math.min(value, MAX_SEVERITY));
      const x = PAD + index * stepX;
      const y = H - PAD - (clamped / MAX_SEVERITY) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Count of trailing points with severity > 0 (how long it's been unstable). */
function trailingUnstable(series: number[]): number {
  let count = 0;
  for (let i = series.length - 1; i >= 0 && series[i] > 0; i--) count += 1;
  return count;
}

export function SeveritySparkline({
  series,
  status,
  windowMinutes = 30,
}: {
  series: number[];
  status: SystemStatusLevel;
  windowMinutes?: number;
}) {
  const { t } = useI18n();
  const stroke = sparkStroke[status];
  const hasData = series.length >= 2;
  const baselineY = H - PAD;
  const points = hasData ? toPoints(series) : `${PAD},${baselineY} ${W - PAD},${baselineY}`;

  const unstableTail = trailingUnstable(series);
  const unstableMin = Math.max(1, unstableTail);

  const caption = !hasData
    ? t("status.spark.collecting")
    : unstableTail > 0
      ? t("status.spark.unstable").replace("{n}", String(unstableMin))
      : t("status.spark.stable").replace("{min}", String(windowMinutes));

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="rounded bg-muted/40"
        role="img"
        aria-label={caption}
      >
        <polyline
          points={points}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hasData && unstableTail > 0 && (
          <circle
            cx={W - PAD}
            cy={H - PAD - (Math.min(series[series.length - 1], MAX_SEVERITY) / MAX_SEVERITY) * (H - PAD * 2)}
            r={2.5}
            fill={stroke}
          />
        )}
      </svg>
      <div
        className={cn(
          "mt-1 text-[10px]",
          unstableTail > 0 ? "text-warning" : "text-muted-foreground",
        )}
      >
        {caption}
      </div>
    </div>
  );
}
