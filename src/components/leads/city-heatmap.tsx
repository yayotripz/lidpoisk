"use client"

import * as React from "react"
import { MapPin, TrendingUp, Flame } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  FEDERAL_DISTRICTS,
  getDistrictShort,
  getDistrictColor,
  getDistrictEmoji,
  getDistrictLabel,
} from "@/lib/federal-districts"
import { getCountryLabel } from "@/lib/constants"

export type CityStat = {
  city: string
  country: string
  count: number
  region: string | null
  district: string
}

type CityHeatmapProps = {
  cities: CityStat[]
  byFederalDistrict: Record<string, number>
  totalLeads: number
}

// Округление чисел с разделением тысяч
function fmt(n: number): string {
  return n.toLocaleString("ru-RU")
}

// Цветовая интенсивность для тепловой карты городов
// emerald: 5 уровней насыщенности от light до dark
function cityIntensityClass(count: number, max: number): string {
  if (max === 0) return "bg-muted"
  const ratio = count / max
  if (ratio >= 0.85) return "bg-emerald-600 text-white"
  if (ratio >= 0.65) return "bg-emerald-500 text-white"
  if (ratio >= 0.45) return "bg-emerald-400 text-emerald-950"
  if (ratio >= 0.25) return "bg-emerald-300 text-emerald-950"
  if (ratio >= 0.1) return "bg-emerald-200 text-emerald-900"
  return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
}

export function CityHeatmap({
  cities,
  byFederalDistrict,
  totalLeads,
}: CityHeatmapProps) {
  // Сортируем по убыванию
  const sortedCities = React.useMemo(
    () => [...cities].sort((a, b) => b.count - a.count),
    [cities]
  )
  const maxCount = sortedCities[0]?.count ?? 0
  const top15 = sortedCities.slice(0, 15)

  // Готовим данные по федеральным округам (только с лидами)
  const districtData = React.useMemo(() => {
    return FEDERAL_DISTRICTS.map((d) => ({
      ...d,
      count: byFederalDistrict[d.key] ?? 0,
    }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [byFederalDistrict])

  const maxDistrictCount = districtData[0]?.count ?? 0

  if (cities.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Flame className="size-4 text-primary" />
            Тепловая карта городов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Недостаточно данных
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Топ-15 городов — горизонтальные бары с интенсивностью */}
      <Card className="lg:col-span-3 border-border/60 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <Flame className="size-4 text-primary" />
              Топ-15 городов по лидам
            </span>
            <Badge variant="outline" className="text-[10px] font-normal">
              из {fmt(cities.length)} городов
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {top15.map((c, idx) => {
              const ratio = maxCount > 0 ? c.count / maxCount : 0
              const isTop = idx < 3
              return (
                <TooltipProvider key={`${c.city}-${c.country}`} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="group flex items-center gap-2 text-xs">
                        <span
                          className={cn(
                            "flex w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold tabular-nums",
                            isTop
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span
                            className={cn(
                              "truncate font-medium",
                              isTop ? "text-foreground" : "text-foreground/90"
                            )}
                          >
                            {c.city}
                          </span>
                          {c.region && (
                            <span className="hidden truncate text-[10px] text-muted-foreground sm:inline">
                              {c.region}
                            </span>
                          )}
                        </div>
                        <div className="relative h-4 w-24 shrink-0 overflow-hidden rounded-full bg-muted sm:w-40">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-700 ease-out",
                              cityIntensityClass(c.count, maxCount)
                            )}
                            style={{ width: `${Math.max(ratio * 100, 8)}%` }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-foreground">
                          {fmt(c.count)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold">
                          {c.city}, {getCountryLabel(c.country)}
                        </p>
                        {c.region && <p className="text-muted-foreground">{c.region}</p>}
                        <p className="text-emerald-600 dark:text-emerald-400">
                          Лидов: {fmt(c.count)} ({((c.count / totalLeads) * 100).toFixed(1)}%)
                        </p>
                        {c.district !== "foreign" && (
                          <p className="text-muted-foreground">
                            {getDistrictEmoji(c.district)} {getDistrictLabel(c.district)}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Федеральные округа — pie/bar */}
      <Card className="lg:col-span-2 border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="size-4 text-primary" />
            По федеральным округам
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {districtData.map((d) => {
              const ratio = maxDistrictCount > 0 ? d.count / maxDistrictCount : 0
              const percent = totalLeads > 0 ? (d.count / totalLeads) * 100 : 0
              return (
                <TooltipProvider key={d.key} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="group flex items-center gap-2 text-xs">
                        <span className="w-6 shrink-0 text-center text-base leading-none">
                          {d.emoji}
                        </span>
                        <div className="w-10 shrink-0 font-medium text-foreground">
                          {d.short}
                        </div>
                        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${Math.max(ratio * 100, 5)}%`,
                              backgroundColor: d.color,
                            }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-foreground">
                          {fmt(d.count)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="space-y-0.5">
                        <p className="font-semibold">
                          {d.emoji} {d.label}
                        </p>
                        <p className="text-muted-foreground">
                          Лидов: {fmt(d.count)} ({percent.toFixed(1)}%)
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
            <span>Всего: <span className="font-semibold text-foreground">{fmt(totalLeads)}</span></span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              РФ + СНГ
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
