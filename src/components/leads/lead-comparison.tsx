"use client"

import * as React from "react"
import {
  X,
  Star,
  Phone,
  Globe,
  MapPin,
  Sparkles,
  TrendingUp,
  MessageCircle,
  Send,
  Check,
  Minus,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Lead } from "@/lib/leads"
import {
  getNicheLabel,
  getNicheIcon,
  getCountryLabel,
  getProblemLabel,
  LEAD_STATUSES,
  getStatusLabel,
} from "@/lib/constants"

type CompareRow = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  render: (lead: Lead) => React.ReactNode
  highlight?: "max" | "min" | "present"
}

const ROWS: CompareRow[] = [
  {
    label: "Скор",
    icon: TrendingUp,
    render: (l) => (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold",
          l.leadScore >= 10
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            : l.leadScore >= 6
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        )}
      >
        {l.leadScore}
      </span>
    ),
    highlight: "max",
  },
  {
    label: "Рейтинг",
    icon: Star,
    render: (l) =>
      l.rating > 0 ? (
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{l.rating.toFixed(1)}</span>
        </span>
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground" />
      ),
    highlight: "max",
  },
  {
    label: "Отзывы",
    icon: MessageCircle,
    render: (l) => <span className="font-medium">{l.reviewsCount}</span>,
    highlight: "max",
  },
  {
    label: "Ниша",
    icon: Sparkles,
    render: (l) => (
      <span className="text-sm">
        {getNicheIcon(l.niche)} {getNicheLabel(l.niche)}
      </span>
    ),
  },
  {
    label: "Город",
    icon: MapPin,
    render: (l) => <span className="text-sm">{l.city}</span>,
  },
  {
    label: "Статус",
    icon: Check,
    render: (l) => (
      <Badge variant="outline" className="text-xs">
        {getStatusLabel(l.status)}
      </Badge>
    ),
  },
  {
    label: "Сайт",
    icon: Globe,
    render: (l) =>
      l.website ? (
        <a
          href={l.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-1"
        >
          <Globe className="h-3.5 w-3.5" /> есть
        </a>
      ) : (
        <Badge variant="destructive" className="text-xs">
          нет
        </Badge>
      ),
    highlight: "present",
  },
  {
    label: "Телефон",
    icon: Phone,
    render: (l) =>
      l.phone ? (
        <span className="text-sm font-mono">{l.phone}</span>
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground" />
      ),
  },
  {
    label: "WhatsApp",
    icon: MessageCircle,
    render: (l) =>
      l.whatsapp ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      ),
    highlight: "present",
  },
  {
    label: "Telegram",
    icon: Send,
    render: (l) =>
      l.telegram ? (
        <Check className="h-4 w-4 text-emerald-500" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      ),
    highlight: "present",
  },
  {
    label: "Проблемы",
    icon: X,
    render: (l) => (
      <div className="flex flex-wrap gap-1 justify-center">
        {l.problems.length === 0 ? (
          <span className="text-xs text-muted-foreground">нет</span>
        ) : (
          l.problems.slice(0, 4).map((p) => (
            <Badge
              key={p}
              variant="outline"
              className="text-[10px] px-1.5 py-0"
            >
              {getProblemLabel(p)}
            </Badge>
          ))
        )
        }
      </div>
    ),
  },
]

type Props = {
  leads: Lead[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectLead?: (lead: Lead) => void
}

export function LeadComparison({
  leads,
  open,
  onOpenChange,
  onSelectLead,
}: Props) {
  // Расчёт "лучшего" значения для подсветки
  const best = React.useMemo(() => {
    const result: Record<string, string | number | null> = {}
    if (leads.length < 2) return result
    const numericMax: Record<string, number> = {}
    const presentKeys = ["website", "whatsapp", "telegram"]
    for (const row of ROWS) {
      if (row.highlight === "max") {
        const key = row.label
        let max = -Infinity
        for (const l of leads) {
          if (row.label === "Скор") max = Math.max(max, l.leadScore)
          if (row.label === "Рейтинг") max = Math.max(max, l.rating)
          if (row.label === "Отзывы") max = Math.max(max, l.reviewsCount)
        }
        numericMax[key] = max
        result[key] = max
      }
    }
    return { numericMax, presentKeys }
  }, [leads])

  const isBest = (row: CompareRow, lead: Lead): boolean => {
    if (!row.highlight) return false
    if (row.highlight === "max") {
      const max = best.numericMax?.[row.label]
      if (max == null) return false
      if (row.label === "Скор") return lead.leadScore === max
      if (row.label === "Рейтинг") return lead.rating === max
      if (row.label === "Отзывы") return lead.reviewsCount === max
    }
    if (row.highlight === "present") {
      // подсветка — у кого ЕСТЬ (сайт/мессенджеры)
      return Boolean(
        (row.label === "Сайт" && lead.website) ||
          (row.label === "WhatsApp" && lead.whatsapp) ||
          (row.label === "Telegram" && lead.telegram)
      )
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Сравнение лидов ({leads.length})
          </DialogTitle>
          <DialogDescription>
            Сравнение по ключевым метрикам. Зелёной рамкой отмечены лучшие
            значения в каждой категории.
          </DialogDescription>
        </DialogHeader>

        {leads.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Выберите лидов для сравнения (2–4 шт.)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background z-10 p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                    Параметр
                  </th>
                  {leads.map((lead) => (
                    <th
                      key={lead.id}
                      className="p-3 text-left align-top border-l border-border min-w-[180px]"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold leading-tight">
                          {lead.companyName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getNicheIcon(lead.niche)} {getNicheLabel(lead.niche)}
                        </span>
                        {onSelectLead && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1 h-7 text-xs w-fit"
                            onClick={() => {
                              onSelectLead(lead)
                              onOpenChange(false)
                            }}
                          >
                            Открыть
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, idx) => (
                  <tr
                    key={row.label}
                    className={cn(
                      idx % 2 === 0 ? "bg-muted/30" : "",
                      "hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                    )}
                  >
                    <td className="sticky left-0 bg-inherit z-10 p-3 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <row.icon className="h-3.5 w-3.5" />
                        {row.label}
                      </div>
                    </td>
                    {leads.map((lead) => {
                      const best_ = isBest(row, lead)
                      return (
                        <td
                          key={lead.id}
                          className={cn(
                            "p-3 text-center border-l border-border align-middle",
                            best_ &&
                              "bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-300 dark:ring-emerald-700"
                          )}
                        >
                          {row.render(lead)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Separator className="my-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-950 ring-1 ring-inset ring-emerald-300 dark:ring-emerald-700" />
            лучшее значение в категории
          </span>
          <span>Подсказка: выберите до 4 лидов для сравнения</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
