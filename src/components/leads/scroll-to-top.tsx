"use client"

import * as React from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

type ScrollToTopProps = {
  /** Минимальное количество пикселей прокрутки, после которого появляется кнопка */
  threshold?: number
}

export function ScrollToTop({ threshold = 400 }: ScrollToTopProps) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    let ticking = false
    const updateVisibility = () => {
      const scrollY = window.scrollY
      setVisible(scrollY > threshold)
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateVisibility)
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    updateVisibility()
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold])

  const handleClick = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <button
      onClick={handleClick}
      aria-label="Наверх"
      className={cn(
        "fixed bottom-20 right-4 z-40 lg:bottom-6 lg:right-6",
        "flex size-11 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "transition-all duration-300 ease-out",
        "hover:scale-110 hover:shadow-xl active:scale-95",
        "border border-primary-foreground/10 backdrop-blur-sm",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp className="size-5" />
      {/* Pulse ring */}
      <span className="absolute inset-0 -z-10 rounded-full bg-primary/30 animate-ping-slow" />
    </button>
  )
}
