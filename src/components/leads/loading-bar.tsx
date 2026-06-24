"use client"

import * as React from "react"

/**
 * Тонкий прогресс-бар вверху страницы во время загрузки.
 * Стиль: как у YouTube/Netflix — тонкая emerald-полоска с shimmer-анимацией.
 * Анимация: появляется с 0 до 80% за 1.2с, затем на 95% и держится до завершения.
 */
export function LoadingBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = React.useState(0)
  const [visible, setVisible] = React.useState(false)
  const rafRef = React.useRef<number | null>(null)
  const startRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (loading) {
      setVisible(true)
      setProgress(0)
      startRef.current = null
      const animate = (ts: number) => {
        if (startRef.current === null) startRef.current = ts
        const elapsed = ts - startRef.current
        // 0 → 80% за 1200мс (ease-out), потом 95% медленно
        let p: number
        if (elapsed < 1200) {
          const t = elapsed / 1200
          p = 80 * (1 - Math.pow(1 - t, 3))
        } else {
          p = 80 + Math.min(15, (elapsed - 1200) / 400)
        }
        setProgress(Math.min(95, p))
        if (loading) {
          rafRef.current = requestAnimationFrame(animate)
        }
      }
      rafRef.current = requestAnimationFrame(animate)
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    } else {
      // Завершение — досчитать до 100% и спрятать
      setProgress(100)
      const t = setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 shadow-[0_0_8px_oklch(0.7_0.15_160)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
