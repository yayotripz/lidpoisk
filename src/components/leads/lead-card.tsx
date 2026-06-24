"use client"

import * as React from "react"
import {
  Star,
  Phone,
  MessageCircle,
  Send,
  Bookmark,
  BookmarkCheck,
  Globe,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  GitCompare,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Lead } from "@/lib/leads"
import {
  getNicheLabel,
  getNicheIcon,
  getCountryLabel,
  getProblemLabel,
  LEAD_STATUSES,
} from "@/lib/constants"
import { telHref, whatsappHref, telegramHref } from "@/lib/leads"
import { ScoreGauge } from "@/components/leads/score-gauge"
import { ScoreBreakdown } from "@/components/leads/score-breakdown"
import { LeadTags } from "@/components/leads/lead-tags"

type LeadCardProps = {
  lead: Lead
  saved?: boolean
  selected?: boolean
  selectable?: boolean
  comparable?: boolean
  compared?: boolean
  index?: number
  onToggleSave?: (id: string) => void
  onStatusChange?: (id: string, status: string) => void
  onOpenDetail?: (lead: Lead) => void
  onToggleSelect?: (id: string) => void
  onToggleCompare?: (id: string) => void
  onFindSimilar?: (lead: Lead) => void
  onShare?: (lead: Lead) => void
}

// Цвета бейджей проблем
function problemBadgeClass(key: string): string {
  switch (key) {
    case "no_website":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900"
    case "no_telegram":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900"
    case "no_whatsapp":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-rose-900"
    case "low_rating":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900"
    case "few_reviews":
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700"
    case "bad_socials":
    case "no_messengers":
    case "bad_maps_card":
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

export function LeadCard({
  lead,
  saved,
  selected,
  selectable,
  comparable,
  compared,
  index = 0,
  onToggleSave,
  onStatusChange,
  onOpenDetail,
  onToggleSelect,
  onToggleCompare,
  onFindSimilar,
  onShare,
}: LeadCardProps) {
  // Track bookmark bounce animation
  const [bounceKey, setBounceKey] = React.useState(0)
  const tel = telHref(lead.phone)
  const wa = whatsappHref(lead.phone, lead.whatsapp)
  const tg = telegramHref(lead.telegram)

  // Главные проблемы для отображения (приоритет MVP)
  const priorityProblems = ["no_website", "no_telegram", "no_whatsapp", "low_rating", "few_reviews"]
  const orderedProblems = [
    ...priorityProblems.filter((p) => lead.problems.includes(p)),
    ...lead.problems.filter((p) => !priorityProblems.includes(p)),
  ]

  const hasWebsite = !!lead.website
  const hasTelegram = !!lead.telegram
  const hasWhatsapp = !!lead.whatsapp

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setBounceKey((k) => k + 1)
    onToggleSave?.(lead.id)
  }

  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleSelect?.(lead.id)
  }

  const handleFindSimilarClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onFindSimilar?.(lead)
  }

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleCompare?.(lead.id)
  }

  const handleShareClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onShare?.(lead)
  }

  const handleCardClick = () => {
    onOpenDetail?.(lead)
  }

  // Цветовая полоска слева по скору
  const scoreAccent =
    lead.leadScore >= 10
      ? "from-emerald-500 to-teal-500"
      : lead.leadScore >= 6
      ? "from-amber-400 to-orange-500"
      : "from-slate-300 to-slate-400"

  const isHighScore = lead.leadScore >= 10

  // Stagger delay based on card index
  const staggerDelay = Math.min(index * 40, 400)

  return (
    <TooltipProvider delayDuration={250}>
      <div
        onClick={handleCardClick}
        className={cn(
          "group relative flex flex-col rounded-xl border bg-card p-4 shadow-sm cursor-pointer",
          "transition-all duration-200",
          // Enhanced hover: subtle scale + deeper shadow + lift
          "hover:-translate-y-1 hover:scale-[1.01] hover:shadow-2xl hover:border-primary/40",
          selected
            ? "border-primary ring-2 ring-primary/20"
            : compared
              ? "border-emerald-500 ring-2 ring-emerald-400/30"
              : "border-border/70 hover:ring-2 hover:ring-primary/20"
        )}
        style={{ animationDelay: `${staggerDelay}ms` }}
      >
        {/* Цветовая полоска скоринга слева + emerald glow pulse для high-score */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-10 w-1 rounded-l-xl bg-gradient-to-b",
            scoreAccent,
            isHighScore && "animate-pulse-glow-emerald"
          )}
        />

        {/* Чекбокс выбора (показывается при selectable или selected) */}
        {selectable && (
          <div
            className="absolute right-2 top-2 z-10"
            onClick={handleSelectClick}
          >
            <Checkbox
              checked={selected}
              className="bg-background/80 shadow-sm"
            />
          </div>
        )}

        {/* Чекбокс сравнения (показывается в режиме сравнения) */}
        {comparable && !selectable && (
          <div
            className="absolute right-2 top-2 z-10"
            onClick={handleCompareClick}
          >
            <button
              aria-label={compared ? "Убрать из сравнения" : "Добавить в сравнение"}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                compared
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : "border-border bg-background/80 hover:border-emerald-400"
              )}
            >
              {compared && <GitCompare className="size-3" />}
            </button>
          </div>
        )}

        {/* Верхняя строка: имя + сохранить */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">{getNicheIcon(lead.niche)}</span>
              <h3 className="truncate font-semibold text-sm text-foreground" title={lead.companyName}>
                {lead.companyName}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {lead.city}, {getCountryLabel(lead.country)}
              </span>
            </div>
          </div>

          {!selectable && !comparable && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleFindSimilarClick}
                    aria-label="Найти похожих лидов"
                    className={cn(
                      "rounded-lg p-1.5 transition-colors",
                      "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    <Sparkles className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Найти похожих</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleShareClick}
                    aria-label="Поделиться лидом"
                    className={cn(
                      "rounded-lg p-1.5 transition-colors",
                      "text-muted-foreground hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-950/60 dark:hover:text-violet-300"
                    )}
                  >
                    <Share2 className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Поделиться</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    key={bounceKey}
                    onClick={handleSaveClick}
                    aria-label={saved ? "Убрать из сохранённых" : "Сохранить лид"}
                    className={cn(
                      "shrink-0 rounded-lg p-1.5 transition-colors",
                      saved
                        ? "bg-primary/10 text-primary hover:bg-primary/20 animate-micro-bounce"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{saved ? "В сохранённых" : "Сохранить"}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Ниша + тип */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] font-medium">
            {getNicheLabel(lead.niche)}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
            {lead.companyType}
          </Badge>
        </div>

        {/* Теги (compact mode — только показ) */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="mt-1.5">
            <LeadTags leadId={lead.id} initialTags={lead.tags} compact />
          </div>
        )}

        {/* Рейтинг + скор */}
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">
              {lead.rating > 0 ? lead.rating.toFixed(1) : "—"}
            </span>
            <span className="text-muted-foreground">({lead.reviewsCount})</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                }}
                className="rounded transition-transform hover:scale-110 active:scale-95"
                aria-label="Подробный разбор скоринга"
              >
                <ScoreGauge score={lead.leadScore} size={32} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-3"
              side="top"
              onClick={(e) => e.stopPropagation()}
            >
              <ScoreBreakdown lead={lead} />
            </PopoverContent>
          </Popover>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {lead.source}
          </div>
        </div>

        {/* Бейджи проблем */}
        {orderedProblems.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {orderedProblems.slice(0, 4).map((p) => (
              <span
                key={p}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  problemBadgeClass(p)
                )}
              >
                {(p === "no_website" || p === "no_telegram" || p === "no_whatsapp") && (
                  <AlertTriangle className="size-2.5" />
                )}
                {getProblemLabel(p)}
              </span>
            ))}
            {orderedProblems.length > 4 && (
              <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{orderedProblems.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Статус — без клика (предотвращаем открытие drawer) */}
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <Select
            value={lead.status}
            onValueChange={(v) => onStatusChange?.(lead.id, v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Кнопки связи — без клика для drawer */}
        <div className="mt-3 grid grid-cols-3 gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild={!!tel}
                disabled={!tel}
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-border text-xs"
              >
                {tel ? (
                  <a href={tel}>
                    <Phone className="size-3.5" />
                    Звонок
                  </a>
                ) : (
                  <span>
                    <Phone className="size-3.5" />
                    Звонок
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tel ? `Позвонить: ${lead.phone}` : "Нет телефона"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild={!!wa}
                disabled={!wa}
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-border text-xs hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
              >
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </a>
                ) : (
                  <span>
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {wa ? "Написать в WhatsApp" : hasWhatsapp ? "WhatsApp недоступен" : "Нет WhatsApp"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild={!!tg}
                disabled={!tg}
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-border text-xs hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 dark:hover:bg-sky-950/40"
              >
                {tg ? (
                  <a href={tg} target="_blank" rel="noopener noreferrer">
                    <Send className="size-3.5" />
                    Telegram
                  </a>
                ) : (
                  <span>
                    <Send className="size-3.5" />
                    Telegram
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {tg ? "Написать в Telegram" : hasTelegram ? "Telegram недоступен" : "Нет бота"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Нижняя строка: сайт / AI подсказка */}
        <div className="mt-2.5 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
          {hasWebsite ? (
            <a
              href={lead.website!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 truncate text-primary hover:underline"
            >
              <Globe className="size-3 shrink-0" />
              <span className="truncate max-w-[100px]">{lead.website!.replace(/^https?:\/\//, "")}</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <Globe className="size-3" />
              нет сайта
            </span>
          )}
          <span className="flex items-center gap-1 text-primary/70 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out">
            <Sparkles className="size-3" />
            детали
            <ExternalLink className="size-3" />
          </span>
        </div>
      </div>
    </TooltipProvider>
  )
}
