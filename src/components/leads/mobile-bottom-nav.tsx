"use client"

import * as React from "react"
import {
  Search,
  Bookmark,
  SlidersHorizontal,
  FileDown,
  Sun,
  Moon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useLeadsStore } from "@/store/leads-store"
import { cn } from "@/lib/utils"

type MobileBottomNavProps = {
  savedCount: number
  onOpenFilters: () => void
  onExport: () => void
}

export function MobileBottomNav({
  savedCount,
  onOpenFilters,
  onExport,
}: MobileBottomNavProps) {
  const { activeTab, setActiveTab } = useLeadsStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Slide-up entrance animation on mount
  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const isDark = mounted && theme === "dark"

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  const navItems = [
    {
      id: "all" as const,
      icon: Search,
      label: "Поиск",
      active: activeTab === "all",
      onClick: () => setActiveTab("all"),
    },
    {
      id: "saved" as const,
      icon: Bookmark,
      label: "Сохранённые",
      active: activeTab === "saved",
      onClick: () => setActiveTab("saved"),
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: "filters" as const,
      icon: SlidersHorizontal,
      label: "Фильтры",
      active: false,
      onClick: onOpenFilters,
    },
    {
      id: "export" as const,
      icon: FileDown,
      label: "Экспорт",
      active: false,
      onClick: onExport,
    },
    {
      id: "theme" as const,
      icon: isDark ? Sun : Moon,
      label: isDark ? "Светлая" : "Тёмная",
      active: false,
      onClick: toggleTheme,
    },
  ]

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 lg:hidden",
        "border-t border-border/60 bg-background/80 backdrop-blur-xl",
        "transition-transform duration-300 ease-out",
        visible ? "translate-y-0" : "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Мобильная навигация"
    >
      <div className="flex items-center justify-around px-1 pt-1 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[48px] min-h-[44px] transition-colors",
                item.active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={item.active ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "size-5 transition-transform",
                    item.active && "scale-110"
                  )}
                />
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "absolute -right-2 -top-1 flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none",
                      "bg-primary text-primary-foreground",
                      "animate-card-enter"
                    )}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] leading-tight",
                  item.active ? "font-semibold" : "font-normal"
                )}
              >
                {item.label}
              </span>
              {item.active && (
                <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
