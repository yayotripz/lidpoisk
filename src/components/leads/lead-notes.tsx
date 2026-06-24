"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  StickyNote,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

type Note = {
  id: string
  text: string
  createdAt: string
}

type LeadNotesProps = {
  leadId: string
}

export function LeadNotes({ leadId }: LeadNotesProps) {
  const { toast } = useToast()
  const [text, setText] = React.useState("")

  const { data, isLoading, refetch } = useQuery<{ notes: Note[] }>({
    queryKey: ["lead-notes", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/notes`)
      if (!res.ok) throw new Error("notes")
      return res.json()
    },
  })

  const addMutation = useMutation({
    mutationFn: async (noteText: string) => {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText }),
      })
      if (!res.ok) throw new Error("add")
      return res.json()
    },
    onSuccess: () => {
      setText("")
      refetch()
      toast({ title: "Заметка добавлена" })
    },
    onError: () => toast({ title: "Ошибка", variant: "destructive" }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/leads/${leadId}/notes?noteId=${noteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("delete")
    },
    onSuccess: () => {
      refetch()
      toast({ title: "Заметка удалена" })
    },
    onError: () => toast({ title: "Ошибка удаления", variant: "destructive" }),
  })

  const notes = data?.notes ?? []

  const handleAdd = () => {
    const t = text.trim()
    if (!t) return
    addMutation.mutate(t)
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
          <StickyNote className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Заметки по лиду</h4>
          <p className="text-[10px] text-muted-foreground">
            История касаний и комментариев
          </p>
        </div>
        {notes.length > 0 && (
          <Badge className="ml-auto h-5 px-1.5 text-[10px]">{notes.length}</Badge>
        )}
      </div>

      {/* Список заметок */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center">
          <MessageSquare className="size-5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Пока нет заметок. Добавьте первую.
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-48 scroll-area pr-2">
          <div className="space-y-1.5">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group rounded-md border border-border/50 bg-background/80 p-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap break-words text-foreground">
                    {note.text}
                  </p>
                  <button
                    onClick={() => deleteMutation.mutate(note.id)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100"
                    aria-label="Удалить заметку"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {formatRelative(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Добавление */}
      <div className="mt-2 space-y-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Например: позвонил 12:00, обещали подумать..."
          className="min-h-[50px] resize-y text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
        />
        <Button
          size="sm"
          className="h-7 w-full gap-1.5 text-xs"
          onClick={handleAdd}
          disabled={!text.trim() || addMutation.isPending}
        >
          {addMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Добавить заметку
        </Button>
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "только что"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} мин назад`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ч назад`
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}
