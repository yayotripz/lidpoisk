"use client"

import * as React from "react"
import {
  CheckSquare,
  X,
  Bookmark,
  FileSpreadsheet,
  ChevronDown,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LEAD_STATUSES } from "@/lib/constants"

type BulkActionBarProps = {
  selectedCount: number
  onClearSelection: () => void
  onBulkStatus: (status: string) => void
  onBulkSave: () => void
  onBulkExport: () => void
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatus,
  onBulkSave,
  onBulkExport,
}: BulkActionBarProps) {
  const [statusOpen, setStatusOpen] = React.useState(false)

  if (selectedCount === 0) return null

  return (
    <div className="sticky top-[68px] z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
          <CheckSquare className="size-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">
            Выбрано: {selectedCount}
          </span>
          <span className="text-[10px] text-muted-foreground">лидов</span>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Select
          value=""
          onValueChange={(v) => {
            if (v) {
              onBulkStatus(v)
              setStatusOpen(false)
            }
          }}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs gap-1.5">
            <Users className="size-3.5" />
            <SelectValue placeholder="Изменить статус" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={onBulkSave}
        >
          <Bookmark className="size-3.5" />
          <span className="hidden sm:inline">Сохранить</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={onBulkExport}
        >
          <FileSpreadsheet className="size-3.5" />
          <span className="hidden sm:inline">Экспорт</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 text-xs"
          onClick={onClearSelection}
        >
          <X className="size-3.5" />
          <span className="hidden sm:inline">Снять</span>
        </Button>
      </div>
    </div>
  )
}
