"use client"

import { Search, Globe, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const STAGES = [
  { icon: Search, text: "Ищем компании..." },
  { icon: Globe, text: "Проверяем сайты..." },
  { icon: MessageCircle, text: "Проверяем мессенджеры..." },
]

export function LoadingLeads({ stage }: { stage: number }) {
  const current = STAGES[Math.min(stage, STAGES.length - 1)]
  const Icon = current.icon

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-7 text-primary animate-pulse" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-foreground">{current.text}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Анализируем открытые данные компаний
        </p>
      </div>

      {/* Прогресс по этапам */}
      <div className="flex w-full max-w-xs flex-col gap-2">
        {STAGES.map((s, i) => {
          const StageIcon = s.icon
          const done = i < stage
          const active = i === stage
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all",
                active && "border-primary/40 bg-primary/5",
                done && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30",
                !active && !done && "border-border bg-muted/40 opacity-60"
              )}
            >
              <StageIcon
                className={cn(
                  "size-4",
                  active && "text-primary animate-pulse",
                  done && "text-emerald-600 dark:text-emerald-400",
                  !active && !done && "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "flex-1",
                  active && "font-medium text-foreground",
                  done && "text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-400/50",
                  !active && !done && "text-muted-foreground"
                )}
              >
                {s.text}
              </span>
              {done && <span className="text-xs text-emerald-600 dark:text-emerald-400">✓</span>}
              {active && (
                <span className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Скелетон карточки
export function LeadCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/4 rounded shimmer" />
          <div className="h-3 w-1/2 rounded shimmer" />
        </div>
        <div className="size-7 rounded shimmer" />
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <div className="h-4 w-20 rounded shimmer" />
        <div className="h-4 w-14 rounded shimmer" />
      </div>
      <div className="mt-2.5 h-3 w-1/3 rounded shimmer" />
      <div className="mt-2.5 flex gap-1">
        <div className="h-5 w-20 rounded shimmer" />
        <div className="h-5 w-16 rounded shimmer" />
      </div>
      <div className="mt-3 h-8 w-full rounded shimmer" />
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="h-8 rounded shimmer" />
        <div className="h-8 rounded shimmer" />
        <div className="h-8 rounded shimmer" />
      </div>
    </div>
  )
}

export function LeadsGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <LeadCardSkeleton key={i} />
      ))}
    </div>
  )
}
