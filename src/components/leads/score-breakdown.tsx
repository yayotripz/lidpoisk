"use client"

import * as React from "react"
import {
  Globe,
  Send,
  MessageCircle,
  Star,
  Users,
  Building2,
  Check,
  X,
  Info,
} from "lucide-react"
import type { Lead } from "@/lib/leads"
import { BIG_CITIES } from "@/lib/constants"
import { cn } from "@/lib/utils"

type ScoreBreakdownProps = {
  lead: Lead
  className?: string
}

// Подробный разбор скоринга лида
type ScoreFactor = {
  key: string
  label: string
  description: string
  icon: React.ElementType
  score: number
  active: boolean
  color: string
}

export function ScoreBreakdown({ lead, className }: ScoreBreakdownProps) {
  const factors: ScoreFactor[] = [
    {
      key: "no_website",
      label: "Нет сайта",
      description: "Компания без сайта — готовы предложить разработку",
      icon: Globe,
      score: 3,
      active: !lead.website,
      color: "rose",
    },
    {
      key: "no_telegram",
      label: "Нет telegram-бота",
      description: "Можно предложить разработку бота",
      icon: Send,
      score: 3,
      active: !lead.telegram,
      color: "amber",
    },
    {
      key: "no_whatsapp",
      label: "Нет WhatsApp",
      description: "Готовы к автоматизации WhatsApp",
      icon: MessageCircle,
      score: 2,
      active: !lead.whatsapp,
      color: "orange",
    },
    {
      key: "high_rating",
      label: "Высокий рейтинг (>4.2)",
      description: "Успешный бизнес — есть бюджет на развитие",
      icon: Star,
      score: 1,
      active: lead.rating > 4.2,
      color: "emerald",
    },
    {
      key: "many_reviews",
      label: "Много отзывов (>50)",
      description: "Большая клиентская база",
      icon: Users,
      score: 1,
      active: lead.reviewsCount > 50,
      color: "emerald",
    },
    {
      key: "big_city",
      label: "Крупный город",
      description: "Город-миллионник или столица региона",
      icon: Building2,
      score: 1,
      active: BIG_CITIES.has(lead.city),
      color: "violet",
    },
  ]

  const activeFactors = factors.filter((f) => f.active)
  const calculatedScore = activeFactors.reduce((sum, f) => sum + f.score, 0)

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Info className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Разбор скоринга лида
          </span>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
          {lead.leadScore} / 13
        </span>
      </div>

      <div className="space-y-1.5">
        {factors.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.key}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors",
                f.active
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                  : "opacity-50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  f.active
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {f.active ? (
                  <Check className="size-3" />
                ) : (
                  <X className="size-3" />
                )}
              </div>
              <Icon
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  f.active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-foreground">
                    {f.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 text-[10px] font-bold tabular-nums",
                      f.active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    +{f.score}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Итоговая полоса скоринга */}
      <div className="border-t border-border/60 pt-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Итоговый скор</span>
          <span className="font-semibold text-foreground">
            {calculatedScore} баллов из 13 возможных
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              lead.leadScore >= 10
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : lead.leadScore >= 6
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-slate-300 to-slate-400"
            )}
            style={{ width: `${(lead.leadScore / 13) * 100}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {lead.leadScore >= 10
            ? "🔥 Высокая перспективность — горячий лид!"
            : lead.leadScore >= 6
            ? "⚡ Средняя перспективность — стоит проработать"
            : "💤 Низкая перспективность — много работы"}
        </p>
      </div>
    </div>
  )
}
