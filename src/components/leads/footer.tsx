"use client"

import { ShieldCheck, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>
            Используются только открытые данные. Сервис не обходит закрытые ограничения.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>ЛидПоиск</span>
          <span className="text-muted-foreground/50">·</span>
          <span>MVP {new Date().getFullYear()}</span>
          <Heart className="size-3 fill-rose-400 text-rose-400" />
        </div>
      </div>
    </footer>
  )
}
