"use client"

import * as React from "react"
import { Activity, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type ActivityCalendarProps = {
  /** Массив дней: [{ date: "2024-01-01", count: 5 }, ...] — последние ~119 дней (17 недель) */
  data: { date: string; count: number }[]
  /** Заголовок */
  title?: string
}

const WEEKS = 17 // ~ 4 месяца
const DAYS_IN_WEEK = 7

// Цветовая шкала для активности (0-4 уровней)
function intensityClass(count: number): string {
  if (count === 0) return "bg-muted"
  if (count <= 2) return "bg-emerald-200 dark:bg-emerald-900/60"
  if (count <= 5) return "bg-emerald-400 dark:bg-emerald-700"
  if (count <= 10) return "bg-emerald-500 dark:bg-emerald-600"
  return "bg-emerald-600 dark:bg-emerald-500"
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function ActivityCalendar({
  data,
  title = "Активность за 4 месяца",
}: ActivityCalendarProps) {
  // Группируем данные по неделям (колонкам)
  const weeks = React.useMemo(() => {
    const map = new Map<string, { date: string; count: number }>()
    for (const d of data) map.set(d.date, d)
    // Создаём сетку 17 недель × 7 дней
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Находим ближайший понедельник
    const dayOfWeek = today.getDay() // 0=вс, 1=пн
    const diffToMonday = (dayOfWeek + 6) % 7
    const lastMonday = new Date(today)
    lastMonday.setDate(today.getDate() - diffToMonday)

    const result: ({ date: string; count: number; isToday: boolean } | null)[][] = []
    for (let w = WEEKS - 1; w >= 0; w--) {
      const week: ({ date: string; count: number; isToday: boolean } | null)[] = []
      for (let d = 0; d < DAYS_IN_WEEK; d++) {
        const date = new Date(lastMonday)
        date.setDate(lastMonday.getDate() - w * 7 + d)
        const iso = date.toISOString().slice(0, 10)
        const entry = map.get(iso)
        const isToday = date.getTime() === today.getTime()
        if (date > today) {
          week.push(null)
        } else {
          week.push({
            date: iso,
            count: entry?.count ?? 0,
            isToday,
          })
        }
      }
      result.push(week)
    }
    return result
  }, [data])

  const totalActivity = React.useMemo(
    () => data.reduce((sum, d) => sum + d.count, 0),
    [data]
  )

  const activeDays = React.useMemo(
    () => data.filter((d) => d.count > 0).length,
    [data]
  )

  const maxCount = React.useMemo(
    () => data.reduce((max, d) => Math.max(max, d.count), 0),
    [data]
  )

  const monthLabels = React.useMemo(() => {
    const labels: { week: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, weekIdx) => {
      const firstDay = week.find((d) => d !== null)
      if (firstDay) {
        const month = new Date(firstDay.date).getMonth()
        if (month !== lastMonth && weekIdx > 0) {
          labels.push({
            week: weekIdx,
            label: new Date(firstDay.date).toLocaleDateString("ru-RU", { month: "short" }),
          })
          lastMonth = month
        } else if (weekIdx === 0) {
          lastMonth = month
        }
      }
    })
    return labels
  }, [weeks])

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            {title}
          </span>
          <div className="flex items-center gap-3 text-[10px] font-normal text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3 text-emerald-500" />
              {totalActivity} действий
            </span>
            <span>{activeDays} активных дней</span>
            {maxCount > 0 && <span>макс: {maxCount}</span>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto scroll-area pb-2">
          <div className="inline-flex flex-col gap-1 min-w-max">
            {/* Month labels */}
            <div className="flex gap-1 pl-7 mb-0.5">
              {weeks.map((_, weekIdx) => {
                const label = monthLabels.find((m) => m.week === weekIdx)
                return (
                  <div
                    key={weekIdx}
                    className="w-3 text-[9px] text-muted-foreground"
                  >
                    {label?.label ?? ""}
                  </div>
                )
              })}
            </div>

            {/* Day labels + grid */}
            <div className="flex gap-1">
              {/* Day labels column */}
              <div className="flex flex-col gap-1 pr-1">
                {["Пн", "", "Ср", "", "Пт", "", "Вс"].map((d, i) => (
                  <div
                    key={i}
                    className="h-3 flex items-center text-[9px] text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => (
                    <TooltipProvider key={dayIdx} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "size-3 rounded-sm transition-all duration-150",
                              "hover:scale-125 hover:ring-1 hover:ring-primary/40",
                              day === null
                                ? "bg-transparent"
                                : intensityClass(day.count),
                              day?.isToday && "ring-1 ring-primary ring-offset-1 ring-offset-background"
                            )}
                          />
                        </TooltipTrigger>
                        {day && (
                          <TooltipContent side="top" className="text-xs">
                            <div className="space-y-0.5">
                              <p className="font-semibold">{formatDate(day.date)}</p>
                              <p className="text-emerald-600 dark:text-emerald-400">
                                {day.count === 0
                                  ? "Нет активности"
                                  : `${day.count} ${day.count === 1 ? "действие" : day.count < 5 ? "действия" : "действий"}`}
                              </p>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
              <span>Меньше</span>
              <div className="size-3 rounded-sm bg-muted" />
              <div className="size-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/60" />
              <div className="size-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
              <div className="size-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
              <div className="size-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
              <span>Больше</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
