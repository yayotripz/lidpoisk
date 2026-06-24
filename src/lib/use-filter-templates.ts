"use client"

import * as React from "react"
import type { FiltersState, SortKey } from "@/store/leads-store"

export type FilterTemplate = {
  id: string
  name: string
  emoji: string
  filters: FiltersState
  sort: SortKey
  createdAt: number
}

const STORAGE_KEY = "lidpoisk:filter-templates"
const MAX_TEMPLATES = 12

const EMOJIS = ["🔍", "🎯", "📍", "⭐", "🚀", "💡", "🔥", "✨", "📊", "🏢", "🦷", "🍽️"]

function loadFromStorage(): FilterTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(templates: FilterTemplate[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch {
    // ignore
  }
}

export function useFilterTemplates() {
  const [templates, setTemplates] = React.useState<FilterTemplate[]>([])

  React.useEffect(() => {
    setTemplates(loadFromStorage())
  }, [])

  const addTemplate = React.useCallback(
    (name: string, filters: FiltersState, sort: SortKey) => {
      const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
      const newTpl: FilterTemplate = {
        id,
        name: name.trim().slice(0, 60) || "Без названия",
        emoji,
        filters: { ...filters, page: 1 },
        sort,
        createdAt: Date.now(),
      }
      setTemplates((prev) => {
        const next = [newTpl, ...prev].slice(0, MAX_TEMPLATES)
        saveToStorage(next)
        return next
      })
      return newTpl
    },
    []
  )

  const removeTemplate = React.useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id)
      saveToStorage(next)
      return next
    })
  }, [])

  const renameTemplate = React.useCallback((id: string, name: string) => {
    setTemplates((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, name: name.trim().slice(0, 60) || t.name } : t
      )
      saveToStorage(next)
      return next
    })
  }, [])

  return {
    templates,
    addTemplate,
    removeTemplate,
    renameTemplate,
    maxTemplates: MAX_TEMPLATES,
  }
}
