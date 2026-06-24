"use client"

import * as React from "react"

// Простая конфетти-анимация без внешних зависимостей.
// Используется для микро-празднования при первом сохранении лида.
type ConfettiProps = {
  /** Trigger — меняется при каждом запуске (например, increment) */
  trigger: number
  /** Координаты центра взрыва (по умолчанию центр экрана) */
  x?: number
  y?: number
}

type Particle = {
  id: number
  dx: number
  dy: number
  color: string
  size: number
  delay: number
}

const COLORS = [
  "#10b981",
  "#14b8a6",
  "#f59e0b",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
]

export function Confetti({ trigger, x, y }: ConfettiProps) {
  const [particles, setParticles] = React.useState<Particle[]>([])

  React.useEffect(() => {
    if (trigger === 0) return
    // Генерируем 20 частиц
    const newParticles: Particle[] = Array.from({ length: 20 }).map((_, i) => {
      const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.3
      const distance = 50 + Math.random() * 80
      return {
        id: trigger * 100 + i,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance - 30,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 4,
        delay: Math.random() * 150,
      }
    })
    setParticles(newParticles)
    // Удаляем частицы после завершения анимации
    const t = setTimeout(() => setParticles([]), 1300)
    return () => clearTimeout(t)
  }, [trigger])

  if (particles.length === 0) return null

  const centerX = x ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 0)
  const centerY = y ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 0)

  return (
    <div
      className="pointer-events-none fixed z-[200]"
      style={{
        left: `${centerX}px`,
        top: `${centerY}px`,
      }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: "2px",
            transform: "translate(0, 0)",
            animation: `confetti-burst-${p.id} 1.1s ease-out forwards`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
      <style>
        {particles.map((p) => `
          @keyframes confetti-burst-${p.id} {
            0% {
              opacity: 1;
              transform: translate(0, 0) scale(0.5) rotate(0deg);
            }
            50% {
              opacity: 1;
              transform: translate(${p.dx * 0.7}px, ${p.dy * 0.7}px) scale(1) rotate(180deg);
            }
            100% {
              opacity: 0;
              transform: translate(${p.dx}px, ${p.dy + 60}px) scale(0.7) rotate(360deg);
            }
          }
        `).join("\n")}
      </style>
    </div>
  )
}
