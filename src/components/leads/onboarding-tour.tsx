"use client"

import * as React from "react"
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Search,
  Filter,
  Bookmark,
  Download,
  Keyboard,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "leadsearch:onboarding-completed"

type TourStep = {
  id: string
  title: string
  description: string
  icon: React.ElementType
  highlight?: string // CSS selector for element to highlight
  placement: "center" | "top-right" | "bottom-right"
  accent: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Добро пожаловать в ЛидПоиск! 👋",
    description:
      "Это инструмент поиска лидов для веб-агентства. Здесь 3266 компаний по РФ и СНГ, готовых к предложению услуг — сайта, бота, WhatsApp-автоматизации. Пройдём короткий тур за 30 секунд.",
    icon: Sparkles,
    placement: "center",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "search",
    title: "Поиск лидов 🔍",
    description:
      "Используйте текстовый поиск по названию компании или городу. Поддерживается быстрый debounce — результаты обновляются автоматически. Можно искать по нише, городу, проблемам бизнеса.",
    icon: Search,
    placement: "center",
    accent: "from-sky-500 to-cyan-500",
  },
  {
    id: "filters",
    title: "Фильтры и шаблоны 🎛️",
    description:
      "В левой панели — фильтры по нишам (14 категорий), странам СНГ, 417 городам РФ и проблемам бизнеса. Сохраняйте часто используемые комбинации в шаблоны для быстрого повторного поиска.",
    icon: Filter,
    placement: "center",
    accent: "from-violet-500 to-purple-500",
  },
  {
    id: "scoring",
    title: "Скоринг лидов 🎯",
    description:
      "Каждый лид имеет скор перспективности от 0 до 13. Баллы начисляются за отсутствие сайта (+3), telegram-бота (+3), WhatsApp (+2), высокий рейтинг, много отзывов и крупный город. Нажмите на gauge — увидите полный разбор.",
    icon: Sparkles,
    placement: "center",
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "saved",
    title: "Сохранение и экспорт 📥",
    description:
      "Нажимайте на закладку в карточке, чтобы сохранить лид. Все сохранённые лиды доступны во вкладке «Мои лиды». Экспорт доступен в CSV и XLSX — удобно для CRM и рассылок.",
    icon: Bookmark,
    placement: "center",
    accent: "from-rose-500 to-pink-500",
  },
  {
    id: "shortcuts",
    title: "Горячие клавиши ⌨️",
    description:
      "Нажмите / для фокуса на поиск, Shift+S для режима выбора, Shift+D для переключения вида список/дашборд, Shift+C для сравнения лидов. Esc закрывает модалки. Полный список — в иконке клавиатуры сверху.",
    icon: Keyboard,
    placement: "center",
    accent: "from-teal-500 to-emerald-500",
  },
  {
    id: "ready",
    title: "Готово! Удачного поиска 🚀",
    description:
      "Теперь вы знаете основы. Используйте дашборд для общей статистики, сравнивайте лидов, генерируйте AI-сообщения и развивайте клиентскую базу. Этот тур больше не появится — но его можно перезапустить из шапки.",
    icon: MapPin,
    placement: "center",
    accent: "from-emerald-600 to-green-600",
  },
]

type OnboardingTourProps = {
  forceOpen?: boolean
  onClose?: () => void
}

export function OnboardingTour({ forceOpen, onClose }: OnboardingTourProps) {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [mounted, setMounted] = React.useState(false)

  // Load from localStorage on mount (client-side only)
  React.useEffect(() => {
    setMounted(true)
    if (forceOpen) {
      setOpen(true)
      setStep(0)
      return
    }
    try {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (!completed) {
        // Small delay to let page render
        const t = setTimeout(() => setOpen(true), 800)
        return () => clearTimeout(t)
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [forceOpen])

  const close = React.useCallback(() => {
    setOpen(false)
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    } catch {}
    onClose?.()
  }, [onClose])

  const next = React.useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      close()
    } else {
      setStep((s) => s + 1)
    }
  }, [step, close])

  const prev = React.useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const skip = React.useCallback(() => {
    close()
  }, [close])

  if (!mounted || !open) return null

  const current = TOUR_STEPS[step]
  const Icon = current.icon
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-onboarding-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-onboarding-pop"
        role="document"
      >
        {/* Top accent gradient */}
        <div className={cn("h-1.5 rounded-t-2xl bg-gradient-to-r", current.accent)} />

        {/* Close button */}
        <button
          onClick={skip}
          aria-label="Пропустить тур"
          className="absolute right-3 top-4 z-10 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div
            className={cn(
              "mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
              current.accent
            )}
          >
            <Icon className="size-7" />
          </div>

          {/* Content */}
          <h2
            id="onboarding-title"
            className="mb-2 text-lg font-bold text-foreground"
          >
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>

          {/* Progress dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
            {TOUR_STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                aria-label={`Шаг ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === step
                    ? "w-6 bg-primary"
                    : i < step
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={skip}
              className="text-xs text-muted-foreground"
            >
              Пропустить
            </Button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prev}
                  className="gap-1.5"
                >
                  <ChevronLeft className="size-3.5" />
                  Назад
                </Button>
              )}
              <Button
                size="sm"
                onClick={next}
                className={cn("gap-1.5 bg-gradient-to-r text-white", current.accent)}
              >
                {isLast ? "Завершить" : "Далее"}
                {!isLast && <ChevronRight className="size-3.5" />}
              </Button>
            </div>
          </div>

          {/* Step counter */}
          <p className="mt-3 text-center text-[10px] text-muted-foreground">
            Шаг {step + 1} из {TOUR_STEPS.length}
          </p>
        </div>
      </div>
    </div>
  )
}

// Hook to reset onboarding (e.g., for a "show tour again" button)
export function useResetOnboarding() {
  return React.useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])
}
