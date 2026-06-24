"use client"

import * as React from "react"
import {
  Bookmark,
  Plus,
  X,
  Pencil,
  Check,
  Save,
  Trash2,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useFilterTemplates, type FilterTemplate } from "@/lib/use-filter-templates"
import type { FiltersState, SortKey } from "@/store/leads-store"
import { getNicheLabel, getProblemLabel } from "@/lib/constants"

type Props = {
  currentFilters: FiltersState
  currentSort: SortKey
  onApply: (filters: FiltersState, sort: SortKey) => void
}

export function FilterTemplates({ currentFilters, currentSort, onApply }: Props) {
  const { templates, addTemplate, removeTemplate, renameTemplate, maxTemplates } =
    useFilterTemplates()
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [saveName, setSaveName] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingName, setEditingName] = React.useState("")
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null)

  const handleSave = () => {
    if (!saveName.trim()) return
    addTemplate(saveName, currentFilters, currentSort)
    setSaveName("")
    setSaveOpen(false)
  }

  const handleStartRename = (tpl: FilterTemplate) => {
    setEditingId(tpl.id)
    setEditingName(tpl.name)
  }

  const handleConfirmRename = () => {
    if (editingId) {
      renameTemplate(editingId, editingName)
    }
    setEditingId(null)
    setEditingName("")
  }

  // Проверка — является ли текущий набор фильтров пустым
  const isFiltersEmpty =
    currentFilters.niche.length === 0 &&
    currentFilters.countries.length === 0 &&
    currentFilters.cities.length === 0 &&
    currentFilters.problems.length === 0 &&
    currentFilters.companyType === "any" &&
    currentFilters.query === ""

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Bookmark className="size-3.5" />
          Шаблоны фильтров
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={isFiltersEmpty || templates.length >= maxTemplates}
                onClick={() => setSaveOpen(true)}
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {templates.length >= maxTemplates
                ? `Максимум ${maxTemplates} шаблонов`
                : isFiltersEmpty
                  ? "Задайте фильтры для сохранения"
                  : "Сохранить текущие фильтры"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {templates.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <Bookmark className="mx-auto mb-1.5 size-5 text-muted-foreground/50" />
          <p className="text-[11px] text-muted-foreground">
            Сохраняйте наборы фильтров для быстрого повторного поиска
          </p>
        </div>
      ) : (
        <ul className="max-h-64 overflow-y-auto scroll-area py-1">
          {templates.map((tpl) => (
            <li key={tpl.id} className="group relative px-2">
              {editingId === tpl.id ? (
                <div className="flex items-center gap-1 px-1 py-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmRename()
                      if (e.key === "Escape") {
                        setEditingId(null)
                        setEditingName("")
                      }
                    }}
                    className="h-7 text-xs"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleConfirmRename}
                  >
                    <Check className="size-3.5 text-emerald-500" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer",
                    "hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  )}
                  onClick={() => onApply(tpl.filters, tpl.sort)}
                >
                  <span className="text-base leading-none">{tpl.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {tpl.name}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {describeFilters(tpl.filters)}
                    </p>
                  </div>
                  {/* Hover-actions */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      aria-label="Переименовать"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartRename(tpl)
                      }}
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      aria-label="Удалить"
                      className="rounded p-1 text-muted-foreground hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(tpl.id)
                      }}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Диалог сохранения */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5 text-primary" />
              Сохранить шаблон фильтров
            </DialogTitle>
            <DialogDescription>
              Введите название для текущего набора фильтров. Шаблон будет доступен
              для быстрого применения.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Например: Рестораны без сайта в Москве"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
              autoFocus
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {describeFilters(currentFilters)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={!saveName.trim()}>
              <Save className="size-4" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" />
              Удалить шаблон?
            </DialogTitle>
            <DialogDescription>
              Шаблон будет удалён безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) removeTemplate(confirmDelete)
                setConfirmDelete(null)
              }}
            >
              <Trash2 className="size-4" />
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function describeFilters(f: FiltersState): string {
  const parts: string[] = []
  if (f.niche.length === 1) {
    parts.push(getNicheLabel(f.niche[0]))
  } else if (f.niche.length > 1) {
    parts.push(`${f.niche.length} ниш`)
  }
  if (f.cities.length === 1) parts.push(f.cities[0])
  else if (f.cities.length > 1) parts.push(`${f.cities.length} городов`)
  else if (f.countries.length === 1) parts.push("по стране")
  else if (f.countries.length > 1) parts.push(`${f.countries.length} стран`)
  if (f.problems.length === 1) {
    parts.push(getProblemLabel(f.problems[0]))
  } else if (f.problems.length > 1) {
    parts.push(`${f.problems.length} проблем`)
  }
  if (f.companyType && f.companyType !== "any") parts.push(f.companyType)
  if (f.query) parts.push(`«${f.query}»`)
  if (parts.length === 0) return "Все лиды"
  return parts.slice(0, 4).join(" · ")
}
