"use client"

import * as React from "react"
import {
  Search,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  MapPin,
  AlertTriangle,
  Briefcase,
  Filter,
  X,
  Check,
  MapPinned,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  NICHES,
  COUNTRIES,
  PROBLEMS,
  COMPANY_TYPES,
  getCitiesForCountries,
  RUSSIA_CITIES_WITH_REGION,
} from "@/lib/constants"
import { useLeadsStore } from "@/store/leads-store"

function FilterSection({
  icon,
  title,
  count,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode
  title: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-border/60 pb-1">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between py-2 text-left">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="text-primary">{icon}</span>
              {title}
              {count ? (
                <Badge className="ml-1 h-5 px-1.5 text-[10px]">{count}</Badge>
              ) : null}
            </span>
            <ChevronDown
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-3 pt-1">
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// Компонент: поисковый combobox для выбора городов с группировкой по региону.
// - Показывает Input для текстового поиска
// - Под Input — dropdown с отфильтрованными городами, сгруппированными по региону
// - Поддерживает мультивыбор (чекбоксы), выбранные города показываются чипами сверху
function CityCombobox({
  availableCities,
  selected,
  onToggle,
}: {
  availableCities: string[]
  selected: string[]
  onToggle: (city: string) => void
}) {
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

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

  // Мапа: город -> регион (для российских городов). Для нероссийских — null.
  const cityRegionMap = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const c of RUSSIA_CITIES_WITH_REGION) m.set(c.city, c.region)
    return m
  }, [])

  // Отфильтрованный список — ищем и по городу, и по региону
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableCities
    return availableCities.filter((city) => {
      const region = cityRegionMap.get(city) || ""
      return (
        city.toLowerCase().includes(q) || region.toLowerCase().includes(q)
      )
    })
  }, [availableCities, search, cityRegionMap])

  // Группировка по региону
  const grouped = React.useMemo(() => {
    const map = new Map<string, string[]>()
    for (const city of filtered) {
      const region = cityRegionMap.get(city) || "Другие"
      if (!map.has(region)) map.set(region, [])
      map.get(region)!.push(city)
    }
    // Сортировка регионов: те, что начинаются с заглавной кириллической буквы, по алфавиту
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "ru"))
  }, [filtered, cityRegionMap])

  return (
    <div ref={containerRef} className="relative">
      {/* Выбранные города — чипы */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selected.map((city) => (
            <span
              key={city}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
            >
              {city}
              <button
                type="button"
                onClick={() => onToggle(city)}
                className="text-primary/70 hover:text-primary"
                aria-label={`Убрать ${city}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Поле поиска города */}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false)
            if (e.key === "Enter" && filtered.length > 0) {
              onToggle(filtered[0])
              setSearch("")
            }
          }}
          placeholder="Поиск города или области..."
          className="h-9 pl-7 pr-7 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Очистить"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown с результатами */}
      {open && (
        <div className="mt-1 max-h-72 overflow-y-auto scroll-area rounded-md border border-border bg-popover shadow-md">
          {grouped.length === 0 ? (
            <div className="px-3 py-4 text-center text-[11px] text-muted-foreground">
              Ничего не найдено
            </div>
          ) : (
            grouped.map(([region, cities]) => (
              <div key={region}>
                <div className="sticky top-0 z-10 flex items-center gap-1 bg-muted/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <MapPinned className="size-2.5" />
                  {region}
                  <span className="ml-auto rounded bg-muted-foreground/15 px-1 text-[9px] font-medium">
                    {cities.length}
                  </span>
                </div>
                {cities.map((city) => {
                  const checked = selected.includes(city)
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => onToggle(city)}
                      className={cn(
                        "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/70",
                        checked && "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background"
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span className={cn("flex-1", checked && "font-medium")}>
                        {city}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function FiltersPanel({ onSearch }: { onSearch: () => void }) {
  const { filters, toggleArray, setFilter, resetFilters, setQuery } = useLeadsStore()

  // Города зависят от выбранных стран. Если страны не выбраны — показываем все города.
  const availableCities = React.useMemo(() => {
    if (filters.countries.length === 0) {
      return COUNTRIES.flatMap((c) => c.cities)
    }
    return getCitiesForCountries(filters.countries)
  }, [filters.countries])

  // Локальное состояние для текстового поля поиска — debounce 400мс
  const [queryInput, setQueryInput] = React.useState(filters.query)
  React.useEffect(() => {
    setQueryInput(filters.query)
  }, [filters.query])

  React.useEffect(() => {
    if (queryInput === filters.query) return
    const t = setTimeout(() => {
      setQuery(queryInput)
    }, 400)
    return () => clearTimeout(t)
  }, [queryInput, filters.query, setQuery])

  const activeCount =
    filters.niche.length +
    filters.countries.length +
    filters.cities.length +
    filters.problems.length +
    (filters.companyType !== "any" ? 1 : 0) +
    (filters.query.trim().length > 0 ? 1 : 0)

  return (
    <div className="flex h-full flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="text-sm font-bold uppercase tracking-wide">Фильтры</h2>
          {activeCount > 0 && (
            <Badge className="h-5 px-1.5 text-[10px]">{activeCount}</Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={() => {
              resetFilters()
              setQueryInput("")
            }}
          >
            <RotateCcw className="size-3" />
            Сбросить
          </Button>
        )}
      </div>

      {/* Список фильтров */}
      <div className="scroll-area flex-1 overflow-y-auto px-4 py-2">
        {/* Текстовый поиск по названию/городу */}
        <div className="border-b border-border/60 pb-3 pt-2">
          <Label htmlFor="query-input" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
            <Search className="size-3.5 text-primary" />
            Поиск
          </Label>
          <Input
            id="query-input"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Поиск по названию или городу..."
            className="h-9 text-xs"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Введите часть названия компании или города — поиск сработает автоматически.
          </p>
        </div>

        {/* Ниша */}
        <FilterSection
          icon={<Briefcase className="size-4" />}
          title="Ниша бизнеса"
          count={filters.niche.length || undefined}
        >
          <div className="space-y-1.5">
            {NICHES.map((n) => {
              const checked = filters.niche.includes(n.key)
              return (
                <Label
                  key={n.key}
                  htmlFor={`niche-${n.key}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/70",
                    checked && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    id={`niche-${n.key}`}
                    checked={checked}
                    onCheckedChange={() => toggleArray("niche", n.key)}
                    className="size-4"
                  />
                  <span className="text-base leading-none">{n.icon}</span>
                  <span className={cn("flex-1", checked && "font-medium")}>{n.label}</span>
                </Label>
              )
            })}
          </div>
        </FilterSection>

        {/* Страна */}
        <FilterSection
          icon={<MapPin className="size-4" />}
          title="Страна (СНГ)"
          count={filters.countries.length || undefined}
        >
          <div className="space-y-1.5">
            {COUNTRIES.map((c) => {
              const checked = filters.countries.includes(c.key)
              return (
                <Label
                  key={c.key}
                  htmlFor={`country-${c.key}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/70",
                    checked && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    id={`country-${c.key}`}
                    checked={checked}
                    onCheckedChange={() => toggleArray("countries", c.key)}
                    className="size-4"
                  />
                  <span className={cn("flex-1", checked && "font-medium")}>{c.label}</span>
                  <span className="text-[10px] text-muted-foreground">{c.cities.length}</span>
                </Label>
              )
            })}
          </div>
        </FilterSection>

        {/* Город — поисковый combobox */}
        <FilterSection
          icon={<MapPin className="size-4" />}
          title="Город"
          count={filters.cities.length || undefined}
        >
          {filters.countries.length === 0 ? (
            <p className="mb-2 rounded-md bg-muted/60 px-2 py-1.5 text-[11px] text-muted-foreground">
              Показаны города всех стран. Выберите страну, чтобы сузить список.
            </p>
          ) : null}
          <CityCombobox
            availableCities={availableCities}
            selected={filters.cities}
            onToggle={(city) => toggleArray("cities", city)}
          />
        </FilterSection>

        {/* Проблемы */}
        <FilterSection
          icon={<AlertTriangle className="size-4" />}
          title="Проблемы бизнеса"
          count={filters.problems.length || undefined}
        >
          <div className="space-y-1.5">
            {PROBLEMS.map((p) => {
              const checked = filters.problems.includes(p.key)
              return (
                <Label
                  key={p.key}
                  htmlFor={`problem-${p.key}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-muted/70",
                    checked && "bg-primary/5",
                    p.mvp && "bg-amber-50/50 dark:bg-amber-950/10"
                  )}
                >
                  <Checkbox
                    id={`problem-${p.key}`}
                    checked={checked}
                    onCheckedChange={() => toggleArray("problems", p.key)}
                    className="mt-0.5 size-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(checked && "font-medium")}>{p.label}</span>
                      {p.mvp && (
                        <Badge className="h-4 px-1 text-[9px] bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                          MVP
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">+{p.score} балл.</span>
                  </div>
                </Label>
              )
            })}
          </div>
        </FilterSection>

        {/* Тип компании */}
        <FilterSection
          icon={<Building2 className="size-4" />}
          title="Тип компании"
          defaultOpen={false}
        >
          <Select
            value={filters.companyType}
            onValueChange={(v) => setFilter("companyType", v)}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map((t) => (
                <SelectItem key={t.key} value={t.key} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>
      </div>

      {/* Кнопка поиска (sticky внизу панели) */}
      <div className="border-t border-border/60 bg-card/80 p-3 backdrop-blur">
        <Button
          onClick={onSearch}
          className="h-11 w-full gap-2 text-sm font-semibold shadow-sm"
          size="lg"
        >
          <Search className="size-4" />
          Найти лидов
        </Button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          <Filter className="mr-1 inline size-3" />
          {activeCount > 0
            ? `Активно фильтров: ${activeCount}`
            : "Поиск по всей базе"}
        </p>
      </div>
    </div>
  )
}
