"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const MAX_SCORE = 13

type ScoreGaugeProps = {
  score: number
  size?: number
}

function getColor(score: number): { stroke: string; glow: string } {
  if (score >= 10) {
    return {
      stroke: "oklch(0.627 0.194 149)", // emerald-500
      glow: "oklch(0.627 0.194 149 / 0.5)",
    }
  }
  if (score >= 6) {
    return {
      stroke: "oklch(0.795 0.184 86)", // amber-500
      glow: "transparent",
    }
  }
  return {
    stroke: "oklch(0.551 0.027 264)", // slate-400
    glow: "transparent",
  }
}

export function ScoreGauge({ score, size = 48 }: ScoreGaugeProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // Trigger animation after mount
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(score / MAX_SCORE, 1)
  const offset = circumference * (1 - pct)
  const { stroke, glow } = getColor(score)
  const isHigh = score >= 10

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", isHigh && "group")}
      style={{ width: size, height: size }}
    >
      {/* Glow pulse for high scores */}
      {isHigh && (
        <div
          className="absolute inset-0 rounded-full animate-pulse opacity-40"
          style={{
            boxShadow: `0 0 10px 2px ${glow}`,
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted-foreground/15"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? offset : circumference}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>

      {/* Score number in center */}
      <span
        className={cn(
          "absolute text-[11px] font-bold leading-none",
          score >= 10
            ? "text-emerald-600 dark:text-emerald-400"
            : score >= 6
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
        )}
      >
        {score}
      </span>
    </div>
  )
}
