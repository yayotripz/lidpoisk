"use client"

import * as React from "react"
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Mail,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { Lead } from "@/lib/leads"
import { getNicheLabel, getCountryLabel } from "@/lib/constants"
import { telHref } from "@/lib/leads"

type ShareLeadDialogProps = {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareLeadDialog({ lead, open, onOpenChange }: ShareLeadDialogProps) {
  const { toast } = useToast()
  const [copied, setCopied] = React.useState<"summary" | "link" | null>(null)

  // Generate shareable summary text
  const summary = React.useMemo(() => {
    if (!lead) return ""
    const lines: string[] = []
    lines.push(`📌 ${lead.companyName}`)
    lines.push(`Ниша: ${getNicheLabel(lead.niche)}`)
    lines.push(`Город: ${lead.city}, ${getCountryLabel(lead.country)}`)
    lines.push(`Скор: ${lead.leadScore} / 13`)
    if (lead.rating > 0) {
      lines.push(`Рейтинг: ${lead.rating.toFixed(1)} ⭐ (${lead.reviewsCount} отзывов)`)
    }
    if (lead.phone) lines.push(`Телефон: ${lead.phone}`)
    if (lead.website) lines.push(`Сайт: ${lead.website}`)
    if (lead.telegram) lines.push(`Telegram: ${lead.telegram}`)
    if (lead.whatsapp) lines.push(`WhatsApp: ${lead.whatsapp}`)
    if (lead.problems.length > 0) {
      lines.push(`Проблемы: ${lead.problems.join(", ")}`)
    }
    return lines.join("\n")
  }, [lead])

  const shareUrl = React.useMemo(() => {
    if (!lead) return ""
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/?lead=${lead.id}`
  }, [lead])

  const handleCopy = async (text: string, kind: "summary" | "link") => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      toast({
        title: kind === "summary" ? "Скопировано в буфер" : "Ссылка скопирована",
        description: kind === "summary" ? "Готово к вставке в CRM/мессенджер" : "Можно поделиться",
      })
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast({
        title: "Не удалось скопировать",
        description: "Буфер обмена недоступен. Скопируйте вручную.",
        variant: "destructive",
      })
    }
  }

  const handleWhatsAppShare = () => {
    if (!lead) return
    const text = encodeURIComponent(summary)
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer")
  }

  const handleTelegramShare = () => {
    if (!lead) return
    const text = encodeURIComponent(summary)
    const url = encodeURIComponent(shareUrl)
    window.open(
      `https://t.me/share/url?url=${url}&text=${text}`,
      "_blank",
      "noopener,noreferrer"
    )
  }

  const handleEmailShare = () => {
    if (!lead) return
    const subject = encodeURIComponent(`Лид: ${lead.companyName}`)
    const body = encodeURIComponent(`${summary}\n\n— — —\n${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4 text-primary" />
            Поделиться лидом
          </DialogTitle>
          <DialogDescription>
            Отправьте карточку лида коллегам или в CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Карточка превью */}
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-base">
                {lead.companyName.charAt(0)}
              </span>
              <span className="text-sm font-semibold text-foreground">
                {lead.companyName}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {getNicheLabel(lead.niche)} · {lead.city}, {getCountryLabel(lead.country)}
            </p>
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              Скор: {lead.leadScore} / 13 · Рейтинг: {lead.rating.toFixed(1)} ⭐
            </p>
          </div>

          {/* Кнопки шаринга */}
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
            >
              <MessageCircle className="size-4" />
              <span className="text-[10px]">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTelegramShare}
              className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700"
            >
              <Send className="size-4" />
              <span className="text-[10px]">Telegram</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmailShare}
              className="flex flex-col items-center gap-1 h-auto py-2 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700"
            >
              <Mail className="size-4" />
              <span className="text-[10px]">Email</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(summary, "summary")}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              {copied === "summary" ? (
                <Check className="size-4 text-emerald-500" />
              ) : (
                <Copy className="size-4" />
              )}
              <span className="text-[10px]">
                {copied === "summary" ? "Скопировано" : "Копировать"}
              </span>
            </Button>
          </div>

          {/* Полный текст для копирования */}
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Текст для копирования
              </span>
              <button
                onClick={() => handleCopy(summary, "summary")}
                className="text-[11px] text-primary hover:underline"
              >
                {copied === "summary" ? "✓ Скопировано" : "Копировать"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-foreground max-h-32 overflow-y-auto scroll-area">
              {summary}
            </pre>
          </div>

          {/* Ссылка на лид */}
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Ссылка на лид
              </span>
              <button
                onClick={() => handleCopy(shareUrl, "link")}
                className="text-[11px] text-primary hover:underline"
              >
                {copied === "link" ? "✓ Скопировано" : "Копировать"}
              </button>
            </div>
            <p className="truncate text-[11px] text-foreground/80">{shareUrl}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
