"use client"

import * as React from "react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts"
import {
  Users,
  Bookmark,
  Search,
  TrendingUp,
  Star,
  Target,
  AlertTriangle,
  Award,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LEAD_STATUSES,
  PROBLEMS,
  NICHES,
  getNicheLabel,
  getNicheIcon,
  getProblemLabel,
  getStatusLabel,
} from "@/lib/constants"
import { CityHeatmap, type CityStat } from "@/components/leads/city-heatmap"
import { ActivityCalendar } from "@/components/leads/activity-calendar"

type Stats = {
  totalLeads: number
  savedCount: number
  searchesCount: number
  byStatus: Record<string, number>
  byNiche: Record<string, number>
  byCountry: Record<string, number>
  byCity?: CityStat[]
  byFederalDistrict?: Record<string, number>
  byProblem: Record<string, number>
  scoreBuckets: { range: string; count: number }[]
  avgScore: number
  maxScore: number
  minScore: number
  avgRating: number
  avgReviews: number
}

const STATUS_COLORS: Record<string, string> = {
  new: "#64748b",
  in_work: "#f59e0b",
  wrote: "#0ea5e9",
  called: "#06b6d4",
  no_answer: "#f97316",
  refused: "#f43f5e",
  interesting: "#8b5cf6",
  client: "#10b981",
}

const PROBLEM_COLORS: Record<string, string> = {
  no_website: "#f43f5e",
  no_telegram: "#f59e0b",
  no_whatsapp: "#fb923c",
  bad_socials: "#94a3b8",
  no_messengers: "#a78bfa",
  bad_maps_card: "#67e8f9",
  few_reviews: "#cbd5e1",
  low_rating: "#ef4444",
}

export function DashboardView({
  stats,
  activityData,
}: {
  stats: Stats | null
  activityData?: { date: string; count: number }[]
}) {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl shimmer" />
        ))}
      </div>
    )
  }

  // Данные для графиков
  const statusData = LEAD_STATUSES
    .map((s) => ({ name: s.label, key: s.key, value: stats.byStatus[s.key] || 0, color: STATUS_COLORS[s.key] }))
    .filter((d) => d.value > 0)

  const nicheData = NICHES
    .map((n) => ({ name: n.label, icon: n.icon, value: stats.byNiche[n.key] || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const problemData = PROBLEMS
    .map((p) => ({ name: p.short, key: p.key, value: stats.byProblem[p.key] || 0, color: PROBLEM_COLORS[p.key] }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const scoreData = stats.scoreBuckets

  const inWorkCount = (stats.byStatus["in_work"] || 0) + (stats.byStatus["wrote"] || 0) + (stats.byStatus["called"] || 0)
  const clientCount = stats.byStatus["client"] || 0
  const conversionRate = stats.totalLeads > 0 ? ((clientCount / stats.totalLeads) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-4">
      {/* KPI карточки */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="size-5" />}
          label="Всего лидов"
          value={stats.totalLeads}
          accent="from-emerald-500 to-teal-600"
          sub={`мин. скор: ${stats.minScore} · макс: ${stats.maxScore}`}
        />
        <KpiCard
          icon={<Bookmark className="size-5" />}
          label="Сохранено"
          value={stats.savedCount}
          accent="from-violet-500 to-purple-600"
          sub={`${stats.totalLeads > 0 ? ((stats.savedCount / stats.totalLeads) * 100).toFixed(0) : 0}% от базы`}
        />
        <KpiCard
          icon={<Search className="size-5" />}
          label="Поисков выполнено"
          value={stats.searchesCount}
          accent="from-amber-500 to-orange-600"
          sub="за всё время"
        />
        <KpiCard
          icon={<Award className="size-5" />}
          label="Конверсия в клиента"
          value={`${conversionRate}%`}
          accent="from-rose-500 to-pink-600"
          sub={`${clientCount} клиентов · ${inWorkCount} в работе`}
        />
      </div>

      {/* Графики */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Распределение по статусам */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="size-4 text-primary" />
              Лиды по статусам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {statusData.map((s) => (
                  <div key={s.key} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Распределение по скорам */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-primary" />
              Перспективность лидов (скор)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scoreData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreData.map((entry, i) => {
                    const colors = ["#94a3b8", "#a78bfa", "#f59e0b", "#10b981", "#059669"]
                    return <Cell key={i} fill={colors[i]} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Средний скор: <span className="font-semibold text-foreground">{stats.avgScore}</span></span>
              <span>Чем выше скор — тем перспективнее лид</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Топ ниш */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="size-4 text-primary" />
              Топ ниш по количеству лидов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={nicheData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--muted)" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Проблемы */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-primary" />
              Проблемы компаний
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {problemData.map((p) => {
                const percent = stats.totalLeads > 0 ? (p.value / stats.totalLeads) * 100 : 0
                return (
                  <div key={p.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                      <span className="font-semibold">
                        {p.value} <span className="text-muted-foreground font-normal">({percent.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${percent}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Тепловая карта городов */}
      {stats.byCity && stats.byCity.length > 0 && stats.byFederalDistrict && (
        <CityHeatmap
          cities={stats.byCity}
          byFederalDistrict={stats.byFederalDistrict}
          totalLeads={stats.totalLeads}
        />
      )}

      {/* Календарь активности (GitHub-style) */}
      {activityData && activityData.length > 0 && (
        <ActivityCalendar data={activityData} />
      )}

      {/* Средние метрики */}
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat
          icon={<Star className="size-4 fill-amber-400 text-amber-400" />}
          label="Средний рейтинг"
          value={stats.avgRating?.toFixed(1) ?? "—"}
        />
        <MiniStat
          icon={<Users className="size-4 text-primary" />}
          label="Среднее кол-во отзывов"
          value={String(stats.avgReviews ?? 0)}
        />
        <MiniStat
          icon={<TrendingUp className="size-4 text-emerald-500" />}
          label="Средний скор лида"
          value={String(stats.avgScore ?? 0)}
        />
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  accent: string
  sub?: string
}) {
  return (
    <Card className="relative overflow-hidden border-border/60">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <div className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-muted/60">
        {icon}
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-bold text-foreground">{value}</div>
      </div>
    </div>
  )
}
