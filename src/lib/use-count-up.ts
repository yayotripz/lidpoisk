"use client"

import * as React from "react"

/**
 * Анимирует число от 0 до target при первом появлении ненулевого значения.
 * При последующих изменениях target просто устанавливает новое значение
 * (без повторной анимации — чтобы не «прыгало» при refetch-запросах).
 *
 * Использует requestAnimationFrame + easeOutCubic для плавности.
 *
 * @param target   — целевое число
 * @param duration — длительность анимации в мс (по умолчанию 800)
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = React.useState(0)
  // Флаг: уже ли мы хоть раз анимировали ненулевое значение
  const animatedRef = React.useRef(false)

  React.useEffect(() => {
    if (target <= 0) {
      setValue(0)
      return
    }

    // Если уже анимировали — просто показываем актуальное значение
    if (animatedRef.current) {
      setValue(target)
      return
    }

    // Первое ненулевое значение — запускаем анимацию 0 → target
    animatedRef.current = true
    let raf: number | null = null
    let startTs: number | null = null

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts
      const elapsed = ts - startTs
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic — плавное замедление к концу
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [target, duration])

  return value
}

/**
 * Форматирует число с разделителем разрядов (русская локаль → "3 266").
 */
export function formatRu(value: number): string {
  return value.toLocaleString("ru-RU")
}
