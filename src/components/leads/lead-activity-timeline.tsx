"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  ArrowRight,
  FileText,
  Bookmark,
  Sparkles,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getStatusLabel,
  getStatusColor,
} from "@/lib/constants"
import type { Lead } from "@/lib/leads"

// --- Types ---

type TimelineEntryType =
  | "created"
  | "status_changed"
  | "note_added"
  | "saved"
  | "message_generated"

type TimelineEntry = {
  id: string
  type: TimelineEntryType
  description: string
  timestamp: string
  note?: string
  meta?: Record<string, string>
}

type LeadActivityTimelineProps = {
  lead: Lead
}

// --- Icon & color per entry type ---

function entryIcon(type: TimelineEntryType): React.ReactNode {
  switch (type) {
    case "created":
      return <Calendar className="size-3" />
    case "status_changed":
      return <ArrowRight className="size-3" />
    case "note_added":
      return <FileText className="size-3" />
    case "saved":
      return <Bookmark className="size-3" />
    case "message_generated":
      return <Sparkles className="size-3" />
  }
}

function entryDotColor(type: TimelineEntryType, meta?: Record<string, string>): string {
  switch (type) {
    case "created":
      return "bg-slate-400 dark:bg-slate-500"
    case "status_changed":
      return statusDotColor(meta?.status)
    case "note_added":
      return "bg-emerald-500"
    case "saved":
      return "bg-primary"
    case "message_generated":
      return "bg-primary"
  }
}

function statusDotColor(status?: string): string {
  switch (status) {
    case "new":
      return "bg-slate-400"
    case "in_work":
      return "bg-amber-500"
    case "wrote":
      return "bg-sky-500"
    case "called":
      return "bg-cyan-500"
    case "no_answer":
      return "bg-orange-500"
    case "refused":
      return "bg-rose-500"
    case "interesting":
      return "bg-violet-500"
    case "client":
      return "bg-emerald-500"
    default:
      return "bg-primary"
  }
}

// --- Helpers ---

function formatTimestamp(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "только что"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} мин назад`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ч назад`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d} дн. назад`
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: new Date(iso).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  })
}

// Synthesize timeline entries from lead data and notes
function synthesizeTimeline(
  lead: Lead,
  notes: { id: string; text: string; createdAt: string }[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  // 1. Lead created
  entries.push({
    id: `created-${lead.id}`,
    type: "created",
    description: "Лид добавлен в базу",
    timestamp: lead.createdAt,
  })

  // 2. Status changed (if not "new")
  if (lead.status && lead.status !== "new") {
    entries.push({
      id: `status-${lead.id}`,
      type: "status_changed",
      description: `Статус: ${getStatusLabel(lead.status)}`,
      timestamp: lead.updatedAt,
      meta: { status: lead.status },
    })
  }

  // 3. Saved (if applicable)
  if (lead.saved) {
    entries.push({
      id: `saved-${lead.id}`,
      type: "saved",
      description: "Сохранён в «Мои лиды»",
      timestamp: lead.updatedAt,
    })
  }

  // 4. Notes
  for (const note of notes) {
    entries.push({
      id: `note-${note.id}`,
      type: "note_added",
      description: "Заметка добавлена",
      timestamp: note.createdAt,
      note: note.text.length > 80 ? note.text.slice(0, 80) + "…" : note.text,
    })
  }

  // Sort by timestamp (newest first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return entries
}

// --- Component ---

export function LeadActivityTimeline({ lead }: LeadActivityTimelineProps) {
  const { data, isLoading } = useQuery<{ notes: { id: string; text: string; createdAt: string }[] }>({
    queryKey: ["lead-notes", lead.id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${lead.id}/notes`)
      if (!res.ok) throw new Error("notes")
      return res.json()
    },
  })

  const notes = data?.notes ?? []
  const entries = synthesizeTimeline(lead, notes)

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
          <Activity className="size-4 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Активность</h4>
          <p className="text-[10px] text-muted-foreground">
            Хронология действий
          </p>
        </div>
        {entries.length > 0 && (
          <span className="ml-auto inline-flex items-center rounded-md border border-border/50 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {entries.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
          <Activity className="size-5 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            Пока нет активности
          </p>
        </div>
      ) : (
        <div className="relative ml-3">
          {/* Vertical connecting line */}
          <div className="absolute left-0 top-2 bottom-2 w-px bg-border/60" />

          <div className="space-y-0">
            {entries.map((entry, i) => (
              <TimelineItem
                key={entry.id}
                entry={entry}
                index={i}
                isLast={i === entries.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Timeline Item ---

function TimelineItem({
  entry,
  index,
  isLast,
}: {
  entry: TimelineEntry
  index: number
  isLast: boolean
}) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 60)
    return () => clearTimeout(timer)
  }, [index])

  const dotColor = entryDotColor(entry.type, entry.meta)

  return (
    <div
      className={cn(
        "relative flex gap-2.5 pl-4 pb-3 transition-all duration-300",
        isLast ? "pb-0" : "pb-3",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}
    >
      {/* Dot */}
      <div
        className={cn(
          "absolute left-[-13px] top-1 flex size-[10px] items-center justify-center rounded-full border-2 border-background",
          dotColor
        )}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/70">{entryIcon(entry.type)}</span>
          <span className="text-xs font-medium text-foreground truncate">
            {entry.description}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {formatTimestamp(entry.timestamp)}
          </span>
        </div>
        {entry.note && (
          <p className="mt-1 rounded border border-border/40 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground leading-relaxed">
            {entry.note}
          </p>
        )}
        {entry.type === "status_changed" && entry.meta?.status && (
          <span
            className={cn(
              "mt-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              getStatusColor(entry.meta.status)
            )}
          >
            {getStatusLabel(entry.meta.status)}
          </span>
        )}
      </div>
    </div>
  )
}
