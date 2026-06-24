"use client"

import * as React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function ToastProgress({ variant }: { variant?: "default" | "destructive" }) {
  const [w, setW] = React.useState(100)
  React.useEffect(() => {
    let raf: number
    const start = performance.now()
    const duration = 4000
    const animate = (ts: number) => {
      const elapsed = ts - start
      const p = Math.max(0, 100 - (elapsed / duration) * 100)
      setW(p)
      if (p > 0) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
      <div
        className={
          variant === "destructive"
            ? "h-full bg-rose-400 transition-[width] duration-100 ease-linear"
            : "h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-[width] duration-100 ease-linear"
        }
        style={{ width: `${w}%` }}
      />
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={4000}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            <ToastProgress variant={variant} />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}