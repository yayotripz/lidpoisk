"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  History,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
  Briefcase,
  Building2,
  RotateCcw,
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getNicheLabel,
  getCountryLabel,
  getProblemLabel,
  COMPANY_TYPES,
} from "@/lib/constants"
import type { SearchFilters } from "@/lib/leads"
import { cn } from "@/lib/utils"

type SearchHistoryItem = {
  id: string
  niche: string[]
  countries: string[]
  cities: string[]
  selectedProblems: string[]
  companyType: string | null
  resultCount: number
  createdAt: string
}

type SearchHistoryProps = {
  onRestore: (filters: SearchFilters) => void
}

export function SearchHistory({ onRestore }: SearchHistoryProps) {
  const [open, setOpen] = React.useState(false)
  const { data } = useQuery<{ searches: SearchHistoryItem[]; total: number }>({
    queryKey: ["searches"],
    queryFn: async () => {
      const res = await fetch("/api/searches")
      if (!res.ok) throw new Error("searches")
      return res.json()
    },
    enabled: open, // подгружаем только когда открыто
  })

  const searches = data?.searches ?? []

  const handleRestore = (item: SearchHistoryItem) => {
    onRestore({
      niche: item.niche,
      countries: item.countries,
      cities: item.cities,
      problems: item.selectedProblems,
      companyType: item.companyType || "any",
      page: 1,
      query: "",
    })
    setOpen(false)
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-primary" />
              История поисков
              {data && data.total > 0 && (
                <Badge className="h-5 px-1.5 text-[10px]">{data.total}</Badge>
              )}
            </span>
            <ChevronRight
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                open && "rotate-90"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60">
            {searches.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Clock className="size-6 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  История поиска пуста.<br />
                  Выполните первый поиск — он появится здесь.
                </p>
              </div>
            ) : (
              <div className="scroll-area max-h-80 overflow-y-auto p-2 space-y-1.5">
                {searches.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleRestore(s)}
                    className="group w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {s.niche.length > 0 ? (
                          s.niche.slice(0, 2).map((n) => (
                            <Badge key={n} variant="secondary" className="text-[10px] gap-1">
                              <Briefcase className="size-2.5" />
                              {getNicheLabel(n)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Все ниши
                          </Badge>
                        )}
                        {s.niche.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{s.niche.length - 2}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                        <span className="font-semibold text-primary">{s.resultCount || "—"}</span>
                        <span>лидов</span>
                        <RotateCcw className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                      {s.countries.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="size-2.5" />
                          {s.countries.slice(0, 2).map(getCountryLabel).join(", ")}
                          {s.countries.length > 2 && ` +${s.countries.length - 2}`}
                        </span>
                      )}
                      {s.cities.length > 0 && (
                        <span>· {s.cities.slice(0, 2).join(", ")}{s.cities.length > 2 && ` +${s.cities.length - 2}`}</span>
                      )}
                      {s.selectedProblems.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          · <AlertTriangle className="size-2.5" />
                          {s.selectedProblems.slice(0, 2).map(getProblemLabel).join(", ")}
                          {s.selectedProblems.length > 2 && ` +${s.selectedProblems.length - 2}`}
                        </span>
                      )}
                      {s.companyType && s.companyType !== "any" && (
                        <span className="flex items-center gap-0.5">
                          · <Building2 className="size-2.5" />
                          {COMPANY_TYPES.find((t) => t.key === s.companyType)?.label || s.companyType}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                      {formatRelative(s.createdAt)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "только что"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} мин назад`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} ч назад`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days} дн назад`
  return new Date(iso).toLocaleDateString("ru-RU")
}
