"use client"

import * as React from "react"
import { MapPin, X, Loader2, Search, Globe } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { COUNTRIES, RUSSIA_CITIES_WITH_REGION } from "@/lib/constants"

// ============================================================
// Локальный пул городов — быстро, без сети.
// Берём все города из COUNTRIES + региональный список России.
// ============================================================
type LocalCity = { name: string; region?: string; country?: string }

const LOCAL_CITIES: LocalCity[] = (() => {
  const arr: LocalCity[] = []
  // Россия — с регионами
  for (const r of RUSSIA_CITIES_WITH_REGION) {
    arr.push({ name: r.city, region: r.region, country: "russia" })
  }
  // Остальные страны
  for (const c of COUNTRIES) {
    if (c.key === "russia") continue
    for (const city of c.cities) {
      arr.push({ name: city, country: c.key })
    }
  }
  return arr
})()

// ============================================================
// Nominatim геокодер — для произвольных городов мира.
// Используем debounce 500ms, чтобы не долбить API.
// ============================================================
type NominatimSuggestion = {
  name: string
  display_name: string
  state?: string
  country: string
  lat: string
  lon: string
}

async function fetchNominatim(q: string, signal: AbortSignal): Promise<NominatimSuggestion[]> {
  try {
    const url = `/api/geocode?q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": "LidPoisk/1.2 (lead-search autocomplete)",
        Accept: "application/json",
      },
      signal,
    })
    if (!res.ok) return []
    const arr = (await res.json()) as Array<Record<string, unknown>>
    return arr
      .filter((x) => {
        // Берём только города/посёлки/деревни — не улицы и не дома
        const cls = x.class as string | undefined
        const tp = x.type as string | undefined
        if (cls === "place" && ["city", "town", "village", "hamlet"].includes(tp || "")) return true
        if (cls === "boundary" && tp === "administrative") return true
        return false
      })
      .slice(0, 6)
      .map((x) => ({
        name: (x.name as string) || "",
        display_name: (x.display_name as string) || "",
        state: (x.address as Record<string, string> | undefined)?.state,
        country: ((x.address as Record<string, string> | undefined)?.country) || "",
        lat: (x.lat as string) || "",
        lon: (x.lon as string) || "",
      }))
  } catch {
    return []
  }
}

// ============================================================
// Компонент
// ============================================================
export function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Начните вводить город...",
  className,
}: {
  value: string
  onChange: (v: string) => void
  onSelect?: (city: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [nominatimHits, setNominatimHits] = React.useState<NominatimSuggestion[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  // Закрытие по клику вне
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Очистка таймеров при размонтировании
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // Локальные подсказки (мгновенно)
  const localHits = React.useMemo(() => {
    const q = value.trim().toLowerCase()
    if (q.length < 1) return []
    return LOCAL_CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8)
  }, [value])

  // Nominatim-подсказки (debounce 500ms)
  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    const q = value.trim()
    if (q.length < 2) {
      setNominatimHits([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const hits = await fetchNominatim(q, ctrl.signal)
      // Фильтруем: не дублируем локальные
      const localNames = new Set(localHits.map((h) => h.name.toLowerCase()))
      const fresh = hits.filter((h) => h.name && !localNames.has(h.name.toLowerCase()))
      setNominatimHits(fresh)
      setLoading(false)
    }, 500)
  }, [value, localHits])

  const hasLocal = localHits.length > 0
  const hasNominatim = nominatimHits.length > 0
  const showDropdown = open && (hasLocal || hasNominatim || loading)

  function handlePick(city: string) {
    onChange(city)
    onSelect?.(city)
    setOpen(false)
    setNominatimHits([])
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false)
            if (e.key === "Enter") {
              // Если есть локальные подсказки — берём первую
              if (hasLocal) handlePick(localHits[0].name)
              else if (hasNominatim) handlePick(nominatimHits[0].name)
            }
          }}
          placeholder={placeholder}
          className="h-9 pl-7 pr-8 text-xs"
        />
        {loading && (
          <Loader2 className="absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!loading && value && (
          <button
            type="button"
            onClick={() => {
              onChange("")
              setNominatimHits([])
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Очистить"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="mt-1 max-h-80 overflow-y-auto scroll-area rounded-md border border-border bg-popover shadow-md z-50">
          {/* Локальные (мгновенные) подсказки */}
          {hasLocal && (
            <div>
              <div className="sticky top-0 z-10 flex items-center gap-1 bg-emerald-50/80 dark:bg-emerald-950/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 backdrop-blur">
                <Search className="size-2.5" />
                Из базы (мгновенно)
              </div>
              {localHits.map((c) => (
                <button
                  key={`local-${c.name}-${c.region || c.country}`}
                  type="button"
                  onClick={() => handlePick(c.name)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/70 transition-colors"
                >
                  <MapPin className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">{c.name}</span>
                  {c.region && (
                    <span className="text-[10px] text-muted-foreground">— {c.region}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Nominatim (сетевые) подсказки */}
          {(loading || hasNominatim) && (
            <div>
              <div className="sticky top-0 z-10 flex items-center gap-1 bg-sky-50/80 dark:bg-sky-950/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 backdrop-blur">
                <Globe />
                {!loading ? "Найдено в OpenStreetMap" : "Ищем в OpenStreetMap..."}
              </div>
              {loading && !hasNominatim && (
                <div className="px-3 py-2 text-[11px] text-muted-foreground">
                  Подождите, идёт запрос к Nominatim...
                </div>
              )}
              {nominatimHits.map((h, idx) => (
                <button
                  key={`nom-${idx}-${h.name}-${h.lat}`}
                  type="button"
                  onClick={() => handlePick(h.name)}
                  className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/70 transition-colors"
                >
                  <MapPin className="size-3 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{h.name}</div>
                    {h.state && h.state !== h.name && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {h.state}
                        {h.country ? `, ${h.country}` : ""}
                      </div>
                    )}
                    {!h.state && h.country && (
                      <div className="text-[10px] text-muted-foreground truncate">{h.country}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Ничего не найдено */}
          {!loading && !hasLocal && !hasNominatim && value.trim().length >= 2 && (
            <div className="px-3 py-3 text-center text-[11px] text-muted-foreground">
              Ничего не найдено. Попробуйте проверить написание или ввести английское название.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
