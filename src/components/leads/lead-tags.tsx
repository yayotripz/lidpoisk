"use client"

import * as React from "react"
import { Tag, X, Plus, Hash } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type LeadTagsProps = {
  leadId: string
  initialTags?: string[]
  /** Compact mode for cards (just shows tags, no input) */
  compact?: boolean
  className?: string
}

// Палитра цветов для тегов (по хешу строки)
const TAG_COLORS = [
  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900",
  "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900",
  "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-900",
  "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-900",
  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900",
  "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-900",
  "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-900",
]

function colorForTag(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i)
    hash |= 0
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export function LeadTags({ leadId, initialTags = [], compact = false, className }: LeadTagsProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [input, setInput] = React.useState("")
  const [isAdding, setIsAdding] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Загружаем теги (используем initialTags если есть, иначе запрос)
  const { data: tags = initialTags, refetch } = useQuery<string[]>({
    queryKey: ["lead-tags", leadId],
    queryFn: async () => {
      if (initialTags.length > 0) return initialTags
      const res = await fetch(`/api/leads/${leadId}/tags`)
      if (!res.ok) throw new Error("tags")
      const data = await res.json()
      return data.tags ?? []
    },
    initialData: initialTags.length > 0 ? initialTags : undefined,
    staleTime: 30_000,
  })

  const handleAddTag = async (rawTag: string) => {
    const tag = rawTag.trim()
    if (!tag) return
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      toast({
        title: "Тег уже существует",
        description: `Тег «${tag}» уже добавлен`,
        variant: "destructive",
      })
      return
    }
    if (tags.length >= 20) {
      toast({
        title: "Максимум 20 тегов",
        description: "Удалите лишние теги перед добавлением новых",
        variant: "destructive",
      })
      return
    }
    setInput("")
    setIsAdding(false)
    // Оптимистично
    queryClient.setQueryData<string[]>(["lead-tags", leadId], (old = []) => [...old, tag])
    try {
      const res = await fetch(`/api/leads/${leadId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag }),
      })
      if (!res.ok) throw new Error("add")
      const data = await res.json()
      queryClient.setQueryData<string[]>(["lead-tags", leadId], data.tags)
      queryClient.invalidateQueries({ queryKey: ["searches"] })
    } catch {
      // Откат
      queryClient.setQueryData<string[]>(["lead-tags", leadId], tags)
      toast({
        title: "Не удалось добавить тег",
        variant: "destructive",
      })
    }
  }

  const handleRemoveTag = async (tag: string) => {
    // Оптимистично
    queryClient.setQueryData<string[]>(["lead-tags", leadId], (old = []) =>
      old.filter((t) => t !== tag)
    )
    try {
      const url = `/api/leads/${leadId}/tags?tag=${encodeURIComponent(tag)}`
      const res = await fetch(url, { method: "DELETE" })
      if (!res.ok) throw new Error("remove")
      const data = await res.json()
      queryClient.setQueryData<string[]>(["lead-tags", leadId], data.tags)
      queryClient.invalidateQueries({ queryKey: ["searches"] })
    } catch {
      // Откат
      queryClient.setQueryData<string[]>(["lead-tags", leadId], tags)
      toast({
        title: "Не удалось удалить тег",
        variant: "destructive",
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag(input)
    } else if (e.key === "Escape") {
      setInput("")
      setIsAdding(false)
    } else if (e.key === ",") {
      e.preventDefault()
      handleAddTag(input)
    }
  }

  if (compact) {
    // Compact mode: только показ тегов (для карточек)
    if (tags.length === 0) return null
    return (
      <div className={cn("flex flex-wrap gap-1", className)}>
        {tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
              colorForTag(tag)
            )}
          >
            <Hash className="size-2.5" />
            {tag}
          </span>
        ))}
        {tags.length > 4 && (
          <span className="inline-flex items-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            +{tags.length - 4}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <Tag className="size-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Теги
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {tags.length} / 20
        </span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "group inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium animate-tag-pop",
                colorForTag(tag)
              )}
            >
              <Hash className="size-3" />
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Удалить тег ${tag}`}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="flex items-center gap-1.5">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (input.trim()) handleAddTag(input)
              else setIsAdding(false)
            }}
            placeholder="Введите тег и нажмите Enter"
            className="h-8 text-xs"
            maxLength={30}
            autoFocus
          />
          <button
            onClick={() => handleAddTag(input)}
            className="flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-2 text-primary-foreground transition-colors hover:bg-primary/90"
            aria-label="Добавить тег"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      ) : (
        tags.length < 20 && (
          <button
            onClick={() => {
              setIsAdding(true)
              setTimeout(() => inputRef.current?.focus(), 50)
            }}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-3" />
            Добавить тег
          </button>
        )
      )}

      {tags.length === 0 && !isAdding && (
        <p className="text-[11px] text-muted-foreground">
          Теги помогают группировать лидов: «VIP», «срочный», «повторное обращение» и т.д.
        </p>
      )}
    </div>
  )
}
