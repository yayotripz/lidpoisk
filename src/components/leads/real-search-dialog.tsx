"use client"

import * as React from "react"
import { Globe, Loader2, Search, Sparkles, MapPin, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { NICHES, getNicheLabel } from "@/lib/constants"
import { useQueryClient } from "@tanstack/react-query"
import { useLeadsStore } from "@/store/leads-store"

type RealSearchResponse = {
  ok: boolean
  found: number
  saved: number
  duplicates: number
  leads: Array<{
    id: string
    companyName: string
    niche: string
    city: string
    phone: string | null
    website: string | null
    telegram: string | null
    whatsapp: string | null
    leadScore: number
    problems: string[]
    source: string
  }>
  city: string
  country: string
  source: string
  debug: {
    geocoded: boolean
    overpassElements: number
    parsed: number
  }
  error?: string
}

export function RealSearchDialog() {
  const { realSearchOpen: open, setRealSearchOpen: setOpen, filters } = useLeadsStore()
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<RealSearchResponse | null>(null)
  const [niche, setNiche] = React.useState("restaurants")
  const [city, setCity] = React.useState("Москва")
  const [country, setCountry] = React.useState("russia")
  const { toast } = useToast()
  const qc = useQueryClient()

  // Sync with sidebar filters when opening
  React.useEffect(() => {
    if (open) {
      if (filters.niche[0]) setNiche(filters.niche[0])
      if (filters.cities[0]) setCity(filters.cities[0])
    }
  }, [open, filters.niche, filters.cities])

  async function handleSearch() {
    if (!city.trim()) {
      toast({ title: "Укажите город", variant: "destructive" })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/real-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          city: city.trim(),
          country: country || undefined,
          limit: 100,
          saveToDb: true,
        }),
      })
      const data: RealSearchResponse = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Ошибка поиска")
      }
      setResult(data)
      // Инвалидируем кэш лидов чтобы новый поиск показал свежие данные
      qc.invalidateQueries({ queryKey: ["leads"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      toast({
        title: `Найдено ${data.found} компаний`,
        description: `Добавлено в базу: ${data.saved} • Уже было: ${data.duplicates}`,
      })
    } catch (e) {
      toast({
        title: "Ошибка живого поиска",
        description: (e as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
          size="sm"
        >
          <Globe className="h-4 w-4" />
          Живой поиск в интернете
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" />
            Живой поиск компаний
          </DialogTitle>
          <DialogDescription>
            Поиск реальных компаний в OpenStreetMap (бесплатно, без лимитов).
            Источник: Nominatim + Overpass API. Найденные лиды сохраняются в
            общую базу и сразу доступны в основном поиске.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rs-niche">Ниша</Label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger id="rs-niche">
                  <SelectValue placeholder="Выберите нишу" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {NICHES.map((n) => (
                    <SelectItem key={n.key} value={n.key}>
                      {n.icon} {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-country">Страна (опционально)</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="rs-country">
                  <SelectValue placeholder="Не указывать" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="russia">Россия</SelectItem>
                  <SelectItem value="kazakhstan">Казахстан</SelectItem>
                  <SelectItem value="belarus">Беларусь</SelectItem>
                  <SelectItem value="ukraine">Украина</SelectItem>
                  <SelectItem value="uzbekistan">Узбекистан</SelectItem>
                  <SelectItem value="kyrgyzstan">Кыргызстан</SelectItem>
                  <SelectItem value="armenia">Армения</SelectItem>
                  <SelectItem value="georgia">Грузия</SelectItem>
                  <SelectItem value="azerbaijan">Азербайджан</SelectItem>
                  <SelectItem value="moldova">Молдова</SelectItem>
                  <SelectItem value="tajikistan">Таджикистан</SelectItem>
                  <SelectItem value="">Не указывать</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rs-city">Город</Label>
            <div className="flex gap-2">
              <Input
                id="rs-city"
                placeholder="Например: Москва, Алматы, Тбилиси"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleSearch()
                }}
              />
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Найти
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Поиск займёт 10-30 секунд. Источник: OpenStreetMap (Nominatim +
              Overpass). Покрытие в СНГ: ~70% городских бизнесов.
            </p>
          </div>

          {result && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Найдено: {result.found}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Добавлено в базу: {result.saved}
                </Badge>
                {result.duplicates > 0 && (
                  <Badge variant="outline">
                    Уже было: {result.duplicates}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {result.city}
                </Badge>
              </div>

              {result.found === 0 && (
                <div className="flex items-start gap-2 p-3 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Ничего не найдено в этом городе</p>
                    <p className="text-xs mt-1">
                      Возможные причины: город маленький и в OSM мало данных;
                      опечатка в названии; попробуйте указать страну или
                      английское название города (например «Almaty» вместо «Алматы»).
                    </p>
                  </div>
                </div>
              )}

              {result.leads.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Найденные лиды ({result.leads.length}):
                  </p>
                  {result.leads.slice(0, 30).map((l) => (
                    <div
                      key={l.id}
                      className="border rounded p-2 text-sm bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{l.companyName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{getNicheLabel(l.niche)}</span>
                            <span>•</span>
                            <span>{l.city}</span>
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {l.phone && (
                              <Badge variant="outline" className="text-xs py-0 h-4">
                                ☎ {l.phone.slice(-10)}
                              </Badge>
                            )}
                            {l.website && (
                              <Badge
                                variant="outline"
                                className="text-xs py-0 h-4 bg-emerald-50 dark:bg-emerald-950/30"
                              >
                                🌐 сайт
                              </Badge>
                            )}
                            {l.telegram && (
                              <Badge variant="outline" className="text-xs py-0 h-4">
                                ✈️ TG
                              </Badge>
                            )}
                            {l.whatsapp && (
                              <Badge variant="outline" className="text-xs py-0 h-4">
                                💬 WA
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-emerald-600 text-white text-xs">
                            скор {l.leadScore}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {result.leads.length > 30 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      … и ещё {result.leads.length - 30} лидов. Смотрите в
                      основном списке.
                    </p>
                  )}
                </div>
              )}

              {result.saved > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOpen(false)
                    // Триггерим основной поиск чтобы показать новые лиды
                    window.dispatchEvent(new CustomEvent("trigger-main-search"))
                  }}
                >
                  Показать в основном списке →
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="text-xs text-muted-foreground">
          <span>
            Источник:{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              © OpenStreetMap contributors
            </a>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
