"use client"

import * as React from "react"
import { Keyboard, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Shortcut = {
  keys: string[]
  description: string
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["/"], description: "Фокус на поле текстового поиска" },
  { keys: ["Esc"], description: "Закрыть модальное окно (drawer, compare, admin)" },
  { keys: ["Shift", "C"], description: "Открыть сравнение лидов (если выбрано ≥2)" },
  { keys: ["Shift", "S"], description: "Переключить режим массового выбора" },
  { keys: ["Shift", "D"], description: "Переключить вид: список / дашборд" },
]

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-40 h-9 w-9 p-0 rounded-full shadow-lg bg-background/80 backdrop-blur-md border-border/60 hover:border-primary/40"
        onClick={() => setOpen(true)}
        aria-label="Горячие клавиши"
        title="Горячие клавиши"
      >
        <Keyboard className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="size-5 text-primary" />
              Горячие клавиши
            </DialogTitle>
            <DialogDescription>
              Используйте эти сочетания для быстрой навигации.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-border">
            {SHORTCUTS.map((s) => (
              <li
                key={s.description}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-sm text-foreground">{s.description}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k, i) => (
                    <kbd
                      key={k}
                      className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md border border-border bg-muted px-1.5 text-[11px] font-mono font-medium text-foreground shadow-sm"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="pt-2 text-xs text-muted-foreground">
            Подсказка: горячие клавиши не срабатывают, когда фокус в поле ввода.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
