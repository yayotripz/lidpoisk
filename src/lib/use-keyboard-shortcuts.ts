"use client"

import { useEffect } from "react"

type ShortcutHandler = (e: KeyboardEvent) => void

export type ShortcutDef = {
  key: string
  handler: ShortcutHandler
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  // Не срабатывать если фокус в input/textarea/select/contenteditable
  ignoreInputs?: boolean
}

function isTypingTarget(e: Event): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    t.isContentEditable
  )
}

export function useKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        if (s.ignoreInputs && isTypingTarget(e)) continue
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true
        const metaMatch = s.meta ? e.metaKey : true
        const shiftMatch = s.shift ? e.shiftKey : true
        const altMatch = s.alt ? e.altKey : true
        if (
          e.key.toLowerCase() === s.key.toLowerCase() &&
          ctrlMatch &&
          metaMatch &&
          shiftMatch &&
          altMatch
        ) {
          // Если не указаны модификаторы — не перехватываем если зажат ctrl/meta
          if (!s.ctrl && !s.meta && (e.ctrlKey || e.metaKey)) continue
          s.handler(e)
          break
        }
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [shortcuts])
}
