"use client"

import * as React from "react"
import {
  Star,
  Phone,
  MessageCircle,
  Send,
  Globe,
  MapPin,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  Loader2,
  X,
  Building2,
  Calendar,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Lead } from "@/lib/leads"
import {
  getNicheLabel,
  getNicheIcon,
  getCountryLabel,
  getProblemLabel,
  LEAD_STATUSES,
  getStatusLabel,
  getStatusColor,
} from "@/lib/constants"
import { telHref, whatsappHref, telegramHref } from "@/lib/leads"
import { LeadNotes } from "@/components/leads/lead-notes"
import { LeadActivityTimeline } from "@/components/leads/lead-activity-timeline"
import { ScoreBreakdown } from "@/components/leads/score-breakdown"
import { LeadTags } from "@/components/leads/lead-tags"
import { useToast } from "@/hooks/use-toast"

type LeadDetailDrawerProps = {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  saved?: boolean
  onToggleSave?: (id: string) => void
  onStatusChange?: (id: string, status: string) => void
}

function problemBadgeClass(key: string): string {
  switch (key) {
    case "no_website":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900"
    case "no_telegram":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900"
    case "no_whatsapp":
      return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900"
    case "low_rating":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700"
  }
}

export function LeadDetailDrawer({
  lead,
  open,
  onOpenChange,
  saved,
  onToggleSave,
  onStatusChange,
}: LeadDetailDrawerProps) {
  const { toast } = useToast()
  const [aiMessage, setAiMessage] = React.useState("")
  const [aiSubject, setAiSubject] = React.useState("")
  const [generating, setGenerating] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [generated, setGenerated] = React.useState(false)

  // Сброс при смене лида
  React.useEffect(() => {
    setAiMessage("")
    setAiSubject("")
    setGenerated(false)
    setCopied(false)
  }, [lead?.id])

  const handleGenerate = async () => {
    if (!lead) return
    setGenerating(true)
    try {
      const res = await fetch("/api/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      })
      if (!res.ok) throw new Error("generate")
      const data = await res.json()
      setAiMessage(data.message)
      setAiSubject(data.subject)
      setGenerated(true)
      toast({ title: "Сообщение сгенерировано", description: "Можно копировать и отправлять" })
    } catch {
      toast({
        title: "Ошибка генерации",
        description: "Не удалось создать сообщение. Попробуйте ещё раз.",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(aiMessage)
      setCopied(true)
      toast({ title: "Скопировано в буфер обмена" })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Не удалось скопировать", variant: "destructive" })
    }
  }

  if (!lead) return null

  const tel = telHref(lead.phone)
  const wa = whatsappHref(lead.phone, lead.whatsapp)
  const tg = telegramHref(lead.telegram)

  // Оценка лида в виде кольца
  const scorePercent = Math.min(100, (lead.leadScore / 13) * 100)
  const scoreColor =
    lead.leadScore >= 10
      ? "text-emerald-600"
      : lead.leadScore >= 6
      ? "text-amber-600"
      : "text-slate-500"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                {getNicheIcon(lead.niche)}
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-lg leading-tight truncate">
                  {lead.companyName}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="size-3" />
                  {lead.city}, {getCountryLabel(lead.country)}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 scroll-area">
          <div className="px-5 py-4 space-y-4">
            {/* Score ring + ключевые метрики */}
            <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
              <div className="relative flex size-20 items-center justify-center">
                <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/30"
                  />
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className={cn(scoreColor, "transition-all duration-700")}
                    strokeDasharray={`${2 * Math.PI * 34}`}
                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - scorePercent / 100)}`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={cn("text-xl font-bold", scoreColor)}>{lead.leadScore}</span>
                  <span className="text-[9px] uppercase text-muted-foreground">скор</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Metric
                  icon={<Star className="size-3.5 fill-amber-400 text-amber-400" />}
                  label="Рейтинг"
                  value={lead.rating > 0 ? lead.rating.toFixed(1) : "—"}
                  sub={`${lead.reviewsCount} отз.`}
                />
                <Metric
                  icon={<Calendar className="size-3.5 text-primary" />}
                  label="Добавлен"
                  value={new Date(lead.createdAt).toLocaleDateString("ru-RU")}
                  sub={lead.source}
                />
              </div>
            </div>

            {/* Бейджи */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[11px]">
                {getNicheLabel(lead.niche)}
              </Badge>
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                <Building2 className="size-3 mr-1" />
                {lead.companyType}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                  getStatusColor(lead.status)
                )}
              >
                {getStatusLabel(lead.status)}
              </span>
            </div>

            <Separator />

            {/* Контакты */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Контакты
              </h4>
              <div className="space-y-1.5">
                <ContactRow
                  icon={<Phone className="size-4" />}
                  label="Телефон"
                  value={lead.phone || "не указан"}
                  href={tel}
                  tone={lead.phone ? "primary" : "muted"}
                />
                <ContactRow
                  icon={<MessageCircle className="size-4" />}
                  label="WhatsApp"
                  value={lead.whatsapp || (lead.phone ? "по номеру телефона" : "не найден")}
                  href={wa}
                  tone={wa ? "emerald" : "muted"}
                />
                <ContactRow
                  icon={<Send className="size-4" />}
                  label="Telegram"
                  value={lead.telegram || "не найден"}
                  href={tg}
                  tone={tg ? "sky" : "muted"}
                />
                <ContactRow
                  icon={<Globe className="size-4" />}
                  label="Сайт"
                  value={lead.website || "нет сайта"}
                  href={lead.website || undefined}
                  tone={lead.website ? "primary" : "danger"}
                />
                {lead.address && (
                  <ContactRow
                    icon={<MapPin className="size-4" />}
                    label="Адрес"
                    value={lead.address}
                    tone="muted"
                  />
                )}
              </div>
            </div>

            <Separator />

            {/* Проблемы */}
            {lead.problems.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Найденные проблемы ({lead.problems.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {lead.problems.map((p) => (
                    <span
                      key={p}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium",
                        problemBadgeClass(p)
                      )}
                    >
                      <AlertTriangle className="size-3" />
                      {getProblemLabel(p)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* AI генерация сообщения */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">AI-сообщение для аутрича</h4>
                    <p className="text-[10px] text-muted-foreground">Персонализированное предложение</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : generated ? (
                    <RefreshCw className="size-3.5" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  {generated ? "Заново" : "Сгенерировать"}
                </Button>
              </div>

              {generated && aiMessage ? (
                <div className="space-y-2">
                  {aiSubject && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="size-3" />
                      <span className="font-medium">{aiSubject}</span>
                    </div>
                  )}
                  <Textarea
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    className="min-h-[140px] resize-y text-xs bg-background/80"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Скопировано" : "Копировать"}
                    </Button>
                    {wa && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
                        asChild
                      >
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="size-3.5" />
                          В WhatsApp
                        </a>
                      </Button>
                    )}
                    {tg && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700"
                        asChild
                      >
                        <a href={tg} target="_blank" rel="noopener noreferrer">
                          <Send className="size-3.5" />
                          В Telegram
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                  {generating ? (
                    <>
                      <Loader2 className="size-5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">
                        Анализируем данные компании и генерируем сообщение...
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-5 text-primary/50" />
                      <p className="text-xs text-muted-foreground">
                        Нажмите «Сгенерировать», чтобы AI создал персонализированное
                        сообщение на основе проблем компании.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Статус */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Статус обработки
              </h4>
              <Select
                value={lead.status}
                onValueChange={(v) => onStatusChange?.(lead.id, v)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Активность */}
            <LeadActivityTimeline lead={lead} />

            <Separator />

            {/* Теги */}
            <LeadTags leadId={lead.id} initialTags={lead.tags} />

            <Separator />

            {/* Разбор скоринга — детально */}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Разбор скоринга лида
              </h4>
              <div className="rounded-lg border border-border/60 bg-card/60 p-3">
                <ScoreBreakdown lead={lead} />
              </div>
            </div>

            <Separator />

            {/* Заметки */}
            <LeadNotes leadId={lead.id} />
          </div>
        </ScrollArea>

        {/* Нижние кнопки */}
        <div className="border-t border-border/60 p-3 grid grid-cols-3 gap-2">
          <Button
            asChild={!!tel}
            disabled={!tel}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            {tel ? (
              <a href={tel}>
                <Phone className="size-4" />
                Позвонить
              </a>
            ) : (
              <span><Phone className="size-4" />Позвонить</span>
            )}
          </Button>
          <Button
            asChild={!!wa}
            disabled={!wa}
            variant="outline"
            size="sm"
            className="gap-1.5 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
          >
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp
              </a>
            ) : (
              <span><MessageCircle className="size-4" />WhatsApp</span>
            )}
          </Button>
          <Button
            asChild={!!tg}
            disabled={!tg}
            variant="outline"
            size="sm"
            className="gap-1.5 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700"
          >
            {tg ? (
              <a href={tg} target="_blank" rel="noopener noreferrer">
                <Send className="size-4" />
                Telegram
              </a>
            ) : (
              <span><Send className="size-4" />Telegram</span>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
  tone: "primary" | "emerald" | "sky" | "danger" | "muted"
}) {
  const toneClass = {
    primary: "text-primary",
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    danger: "text-rose-600 dark:text-rose-400",
    muted: "text-muted-foreground",
  }[tone]

  const content = (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card px-2.5 py-1.5 transition-colors hover:bg-muted/40">
      <span className={cn("shrink-0", toneClass)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("truncate text-xs font-medium", toneClass)}>{value}</div>
      </div>
      {href && <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />}
    </div>
  )

  if (href) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block">
        {content}
      </a>
    )
  }
  return content
}
