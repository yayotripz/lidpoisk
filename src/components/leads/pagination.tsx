"use client"

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

// Формируем массив страниц с эллипсисами: 1 2 3 ... 10
function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | "ellipsis")[] = []
  pages.push(1)
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) pages.push("ellipsis")
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total - 1) pages.push("ellipsis")
  pages.push(total)
  return pages
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  const pages = getPageRange(page, totalPages)

  return (
    <nav
      className="flex items-center justify-center gap-1.5"
      aria-label="Пагинация"
    >
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1 px-3"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
        <span className="hidden sm:inline">Назад</span>
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`e-${idx}`}
              className="flex size-9 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="size-4" />
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "flex size-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                p === page
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-muted hover:border-primary/40"
              )}
            >
              {p}
            </button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1 px-3"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <span className="hidden sm:inline">Далее</span>
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}
