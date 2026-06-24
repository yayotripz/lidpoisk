"use client"

import * as React from "react"
import {
  TrendingUp,
  AlertTriangle,
  Globe,
  Star,
  ShieldCheck,
} from "lucide-react"
import type { Lead } from "@/lib/leads"
import { useCountUp, formatRu } from "@/lib/use-count-up"

type QuickStatsBarProps = {
  leads: Lead[]
  total: number
}

export function QuickStatsBar({ leads, total }: QuickStatsBarProps) {
  const stats = React.useMemo(() => {
    const noWebsite = leads.filter((l) => l.problems.includes("no_website")).length
    const noTelegram = leads.filter((l) => l.problems.includes("no_telegram")).length
    const noWhatsapp = leads.filter((l) => l.problems.includes("no_whatsapp")).length
    const avgScore =
      leads.length > 0
        ? (leads.reduce((s, l) => s + l.leadScore, 0) / leads.length).toFixed(1)
        : "0"
    const avgRating =
      leads.length > 0
        ? (
            leads.filter((l) => l.rating > 0).reduce((s, l) => s + l.rating, 0) /
            Math.max(1, leads.filter((l) => l.rating > 0).length)
          ).toFixed(1)
        : "—"

    // Niche distribution for "Всего" sparkline
    const nicheCounts: Record<string, number> = {}
    for (const l of leads) {
      nicheCounts[l.niche] = (nicheCounts[l.niche] || 0) + 1
    }
    const nicheDist = Object.values(nicheCounts).slice(0, 7)

    // Score distribution for sparkline (7 buckets)
    const scoreBuckets = [0, 0, 0, 0, 0, 0, 0]
    for (const l of leads) {
      const bucket = Math.min(Math.floor(l.leadScore / 2), 6)
      scoreBuckets[bucket]++
    }

    // Rating distribution for sparkline (5 star buckets)
    const ratingBuckets = [0, 0, 0, 0, 0]
    for (const l of leads) {
      if (l.rating > 0) {
        const bucket = Math.min(Math.floor(l.rating) - 1, 4)
        if (bucket >= 0) ratingBuckets[bucket]++
      }
    }

    return {
      noWebsite,
      noTelegram,
      noWhatsapp,
      avgScore,
      avgRating,
      nicheDist,
      scoreBuckets,
      ratingBuckets,
    }
  }, [leads])

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <MiniStat
        icon={<TrendingUp className="size-3.5 text-emerald-500" />}
        label="Всего"
        value={total}
        accent="emerald"
        sparkline={<NicheBarChart data={stats.nicheDist} color="emerald" />}
      />
      <MiniStat
        icon={<ShieldCheck className="size-3.5 text-primary" />}
        label="Средний скор"
        value={stats.avgScore}
        accent="primary"
        sparkline={<GaugeArc value={parseFloat(stats.avgScore)} max={14} />}
      />
      <MiniStat
        icon={<Star className="size-3.5 text-amber-500" />}
        label="Средний рейтинг"
        value={stats.avgRating}
        accent="amber"
        sparkline={<StarRating value={parseFloat(stats.avgRating)} />}
      />
      <MiniStat
        icon={<Globe className="size-3.5 text-rose-500" />}
        label="Без сайта"
        value={stats.noWebsite}
        accent="rose"
        suffix={`/${leads.length}`}
        sparkline={<ProgressMini value={stats.noWebsite} max={leads.length} color="rose" />}
      />
      <MiniStat
        icon={<AlertTriangle className="size-3.5 text-amber-500" />}
        label="Без бота"
        value={stats.noTelegram}
        accent="amber"
        suffix={`/${leads.length}`}
        sparkline={<ProgressMini value={stats.noTelegram} max={leads.length} color="amber" />}
      />
      <MiniStat
        icon={<AlertTriangle className="size-3.5 text-orange-500" />}
        label="Без WhatsApp"
        value={stats.noWhatsapp}
        accent="orange"
        suffix={`/${leads.length}`}
        sparkline={<ProgressMini value={stats.noWhatsapp} max={leads.length} color="orange" />}
      />
    </div>
  )
}

function MiniStat({
  icon,
  label,
  value,
  suffix,
  accent,
  sparkline,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  suffix?: string
  accent: "emerald" | "primary" | "amber" | "rose" | "orange"
  sparkline?: React.ReactNode
}) {
  const isNumber = typeof value === "number"
  const animated = useCountUp(isNumber ? value : 0)
  const displayValue = isNumber ? formatRu(animated) : value

  const accentClass = {
    emerald: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    primary: "border-primary/20 bg-primary/5",
    amber: "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20",
    rose: "border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-950/20",
    orange: "border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20",
  }[accent]

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${accentClass}`}>
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none">
          {label}
        </div>
        <div className="flex items-baseline gap-0.5 leading-tight">
          <span className="text-sm font-bold tabular-nums text-foreground">{displayValue}</span>
          {suffix && (
            <span className="text-[9px] text-muted-foreground">{suffix}</span>
          )}
        </div>
        {/* Sparkline — hidden on very small screens */}
        {sparkline && (
          <div className="hidden sm:block mt-0.5">
            {sparkline}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Mini bar chart showing niche distribution
 */
function NicheBarChart({ data, color }: { data: number[]; color: "emerald" | "amber" | "rose" | "primary" }) {
  if (data.length === 0) return null
  const maxVal = Math.max(...data, 1)
  const barColor = {
    emerald: "fill-emerald-400/30 stroke-emerald-500",
    amber: "fill-amber-400/30 stroke-amber-500",
    rose: "fill-rose-400/30 stroke-rose-500",
    primary: "fill-primary/30 stroke-primary",
  }[color]

  return (
    <svg width="100%" height="12" viewBox="0 0 56 12" preserveAspectRatio="none" className="overflow-visible">
      {data.map((v, i) => {
        const h = Math.max(1, (v / maxVal) * 10)
        return (
          <rect
            key={i}
            x={i * 8}
            y={12 - h}
            width={6}
            height={h}
            rx={1}
            className={barColor.split(" ")[0]}
            opacity={0.5 + (v / maxVal) * 0.5}
          />
        )
      })}
    </svg>
  )
}

/**
 * Progress bar for "без сайта/бота/WA"
 */
function ProgressMini({ value, max, color }: { value: number; max: number; color: "rose" | "amber" | "orange" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const barColor = {
    rose: "bg-rose-400",
    amber: "bg-amber-400",
    orange: "bg-orange-400",
  }[color]
  const trackColor = {
    rose: "bg-rose-100 dark:bg-rose-900/30",
    amber: "bg-amber-100 dark:bg-amber-900/30",
    orange: "bg-orange-100 dark:bg-orange-900/30",
  }[color]

  return (
    <div className={`h-1 w-full rounded-full ${trackColor} overflow-hidden`}>
      <div
        className={`h-full rounded-full ${barColor} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/**
 * Gauge arc for "Средний скор"
 */
function GaugeArc({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  // Arc parameters
  const r = 8
  const cx = 14
  const cy = 10
  const startAngle = -Math.PI * 0.8
  const endAngle = startAngle + pct * Math.PI * 1.6

  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)

  const largeArc = pct > 0.5 ? 1 : 0

  const pathBg = `M ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(startAngle + Math.PI * 1.6)} ${cy + r * Math.sin(startAngle + Math.PI * 1.6)}`
  const pathVal = pct > 0
    ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`
    : ""

  return (
    <svg width="28" height="14" viewBox="0 0 28 14" className="overflow-visible">
      <path d={pathBg} fill="none" stroke="oklch(0.9 0.01 160)" strokeWidth="2.5" strokeLinecap="round" />
      <path d={pathVal} fill="none" stroke="oklch(0.55 0.14 160)" strokeWidth="2.5" strokeLinecap="round" className="dark:[stroke:oklch(0.7_0.15_160)]" />
    </svg>
  )
}

/**
 * Star rating visual for "Средний рейтинг"
 */
function StarRating({ value }: { value: number }) {
  if (isNaN(value) || value <= 0) return null

  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star
        const halfFilled = !filled && value >= star - 0.5
        return (
          <svg
            key={star}
            width="8"
            height="8"
            viewBox="0 0 24 24"
            className="shrink-0"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={filled ? "oklch(0.75 0.15 80)" : halfFilled ? "oklch(0.75 0.15 80 / 0.5)" : "oklch(0.9 0.01 160)"}
              stroke={filled || halfFilled ? "oklch(0.75 0.15 80)" : "oklch(0.85 0.01 160)"}
              strokeWidth="1"
            />
          </svg>
        )
      })}
    </div>
  )
}
