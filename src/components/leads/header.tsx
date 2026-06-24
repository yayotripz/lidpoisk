"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Target, Database, Bookmark, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCountUp, formatRu } from "@/lib/use-count-up"

type Stats = {
  totalLeads: number
  savedCount: number
  searchesCount: number
}

export function Header({ stats }: { stats: Stats | null }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // Анимированные значения счётчиков (от 0 до target при первом появлении)
  const animatedTotal = useCountUp(stats?.totalLeads ?? 0)
  const animatedSaved = useCountUp(stats?.savedCount ?? 0)
  const animatedSearches = useCountUp(stats?.searchesCount ?? 0)

  // Сетка эмеральдных радиальных градиентов — разная для светлой/тёмной темы
  const meshBg = React.useMemo(() => {
    const isDark = mounted && theme === "dark"
    return isDark
      ? "radial-gradient(circle at 18% 0%, oklch(0.32 0.10 160 / 0.45) 0%, transparent 55%), radial-gradient(circle at 82% 100%, oklch(0.28 0.08 170 / 0.35) 0%, transparent 45%), radial-gradient(circle at 50% 50%, oklch(0.25 0.06 165 / 0.20) 0%, transparent 60%)"
      : "radial-gradient(circle at 18% 0%, oklch(0.95 0.05 160) 0%, transparent 50%), radial-gradient(circle at 82% 100%, oklch(0.92 0.06 170) 0%, transparent 40%), radial-gradient(circle at 50% 50%, oklch(0.96 0.04 165 / 0.55) 0%, transparent 60%)"
  }, [theme, mounted])

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      {/* Декоративная сетка эмеральдных градиентов (subtle) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{ backgroundImage: meshBg }}
      />
      <div className="relative mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Логотип + название */}
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <Target className="size-5" />
            <span className="absolute -right-0.5 -top-0.5 flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-foreground sm:text-lg">
              Лид<span className="text-primary">Поиск</span>
            </h1>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              Поиск клиентов для веб-агентства
            </p>
          </div>
        </div>

        {/* Мини-статистика */}
        <div className="hidden items-center gap-2 md:flex">
          <StatChip
            icon={<Database className="size-3.5" />}
            label="Лидов в базе"
            value={stats ? formatRu(animatedTotal) : "—"}
            tone="default"
          />
          <StatChip
            icon={<Bookmark className="size-3.5" />}
            label="Сохранено"
            value={stats ? formatRu(animatedSaved) : "—"}
            tone="emerald"
          />
          <StatChip
            icon={<Search className="size-3.5" />}
            label="Поисков"
            value={stats ? formatRu(animatedSearches) : "—"}
            tone="amber"
          />
        </div>

        {/* Тема */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Сменить тему"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )
          ) : (
            <Sun className="size-4" />
          )}
        </Button>
      </div>
    </header>
  )
}

function StatChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  tone: "default" | "emerald" | "amber"
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
      : "border-border bg-muted/50 text-foreground"
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${toneClass}`}
    >
      <span className="opacity-70">{icon}</span>
      <div className="flex flex-col leading-none">
        <span className="text-[9px] uppercase tracking-wide opacity-70">{label}</span>
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </div>
    </div>
  )
}
