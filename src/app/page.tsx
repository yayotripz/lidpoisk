"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  FileSpreadsheet,
  FileText,
  Bookmark,
  Inbox,
  Sparkles,
  Globe,
  Bot,
  MessageSquare,
  CalendarClock,
  Workflow,
  SlidersHorizontal,
  TrendingUp,
  LayoutDashboard,
  List,
  CheckSquare,
  Shield,
  MapPin,
  GitCompare,
  Share2,
  HelpCircle,
} from "lucide-react"
import { Header } from "@/components/leads/header"
import { Footer } from "@/components/leads/footer"
import { FiltersPanel } from "@/components/leads/filters-panel"
import { LeadCard } from "@/components/leads/lead-card"
import { Pagination } from "@/components/leads/pagination"
import { LoadingLeads } from "@/components/leads/loading-states"
import { LeadDetailDrawer } from "@/components/leads/lead-detail-drawer"
import { DashboardView } from "@/components/leads/dashboard-view"
import { SearchHistory } from "@/components/leads/search-history"
import { BulkActionBar } from "@/components/leads/bulk-action-bar"
import { AdminPanel } from "@/components/leads/admin-panel"
import { SortControl } from "@/components/leads/sort-control"
import { QuickStatsBar } from "@/components/leads/quick-stats-bar"
import { RecommendationsPanel } from "@/components/leads/recommendations-panel"
import { LoadingBar } from "@/components/leads/loading-bar"
import { LeadComparison } from "@/components/leads/lead-comparison"
import { FilterTemplates } from "@/components/leads/filter-templates"
import { KeyboardShortcutsHelp } from "@/components/leads/keyboard-shortcuts-help"
import { MobileBottomNav } from "@/components/leads/mobile-bottom-nav"
import { OnboardingTour, useResetOnboarding } from "@/components/leads/onboarding-tour"
import { ScrollToTop } from "@/components/leads/scroll-to-top"
import { ShareLeadDialog } from "@/components/leads/share-lead-dialog"
import { Confetti } from "@/components/leads/confetti"
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useLeadsStore } from "@/store/leads-store"
import type { Lead, SearchFilters } from "@/lib/leads"
import { getNicheLabel, getStatusLabel } from "@/lib/constants"

type SearchResponse = {
  leads: Lead[]
  total: number
  page: number
  totalPages: number
  pageSize: number
  suggestedNearby?: boolean
}

type Stats = {
  totalLeads: number
  savedCount: number
  searchesCount: number
  byStatus: Record<string, number>
  byNiche: Record<string, number>
  byCountry: Record<string, number>
  byProblem: Record<string, number>
  scoreBuckets: { range: string; count: number }[]
  avgScore: number
  maxScore: number
  minScore: number
  avgRating: number
  avgReviews: number
}

// Услуги агентства — для компактного баннера
const SERVICES = [
  { icon: Globe, label: "Разработка сайта" },
  { icon: Bot, label: "Telegram-бот" },
  { icon: MessageSquare, label: "WhatsApp-автоматизация" },
  { icon: CalendarClock, label: "Онлайн-запись" },
  { icon: Workflow, label: "Автоматизация заявок" },
]

export default function Home() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const {
    filters,
    activeTab,
    setActiveTab,
    setPage,
    setFilters,
    view,
    setView,
    sort,
    setSort,
    adminOpen,
    setAdminOpen,
  } = useLeadsStore()
  const [loadingStage, setLoadingStage] = React.useState(0)
  const [isSearching, setIsSearching] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false)

  // Локальное состояние результатов поиска (исправление бага searchMutation.setData)
  const [results, setResults] = React.useState<SearchResponse | null>(null)
  const [searchError, setSearchError] = React.useState(false)

  // Drawer
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
  const [drawerOpen, setDrawerOpen] = React.useState(false)

  // Bulk selection
  const [selectMode, setSelectMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())

  // Comparison mode (2-4 leads)
  const [compareMode, setCompareMode] = React.useState(false)
  const [compareIds, setCompareIds] = React.useState<Set<string>>(new Set())
  const [compareOpen, setCompareOpen] = React.useState(false)

  // Share dialog
  const [shareLead, setShareLead] = React.useState<Lead | null>(null)
  const [shareOpen, setShareOpen] = React.useState(false)

  // Onboarding tour (manual reset)
  const [tourForceOpen, setTourForceOpen] = React.useState(false)
  const resetOnboarding = useResetOnboarding()

  // Confetti trigger — celebration on first save
  const [confettiTrigger, setConfettiTrigger] = React.useState(0)
  const [confettiPos, setConfettiPos] = React.useState<{ x?: number; y?: number }>({})

  // --- Статистика ---
  const { data: stats } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats")
      if (!res.ok) throw new Error("stats")
      return res.json()
    },
    refetchInterval: 30000,
  })

  // --- Данные для календаря активности ---
  const { data: activityResponse } = useQuery<{
    data: { date: string; count: number }[]
    totalActivity: number
    activeDays: number
    maxCount: number
  }>({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await fetch("/api/activity")
      if (!res.ok) throw new Error("activity")
      return res.json()
    },
    refetchInterval: 60000,
  })
  const activityData = activityResponse?.data ?? []

  // --- Поиск лидов (локальная функция, не useMutation) ---
  const fetchLeads = React.useCallback(
    async (f: SearchFilters, sortKey: string, withAnimation = true) => {
      if (withAnimation) {
        setIsSearching(true)
        setLoadingStage(0)
        const t1 = setTimeout(() => setLoadingStage(1), 600)
        const t2 = setTimeout(() => setLoadingStage(2), 1200)
        try {
          const res = await fetch("/api/search-leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...f,
              sort: sortKey,
            }),
          })
          if (!res.ok) throw new Error("search")
          const data: SearchResponse = await res.json()
          setResults(data)
          setHasSearched(true)
          setSearchError(false)
          // Инвалидируем историю поисков
          queryClient.invalidateQueries({ queryKey: ["searches"] })
        } catch {
          setSearchError(true)
          toast({
            title: "Ошибка поиска",
            description: "Не удалось найти лидов. Попробуйте ещё раз.",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Повторить"
                onClick={() => runSearch()}
                className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
              >
                Повторить
              </ToastAction>
            ),
          })
        } finally {
          clearTimeout(t1)
          clearTimeout(t2)
          setIsSearching(false)
        }
      } else {
        // Пагинация — без анимации, но с быстрым лоадером
        setIsSearching(true)
        try {
          const res = await fetch("/api/search-leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...f, sort: sortKey, saveHistory: false }),
          })
          if (!res.ok) throw new Error("search")
          const data: SearchResponse = await res.json()
          setResults(data)
          setSearchError(false)
        } catch {
          setSearchError(true)
        } finally {
          setIsSearching(false)
        }
      }
    },
    [queryClient, toast]
  )

  const runSearch = React.useCallback(() => {
    setMobileFiltersOpen(false)
    setSelectedIds(new Set())
    setSelectMode(false)
    fetchLeads(filters, sort, true)
  }, [filters, sort, fetchLeads])

  // Автозапуск при монтировании
  React.useEffect(() => {
    fetchLeads(filters, sort, true)
  }, [])

  // Авто-поиск при изменении текстового запроса (debounce уже в фильтр-панели — 400мс)
  React.useEffect(() => {
    if (!hasSearched) return
    fetchLeads(filters, sort, false)
  }, [filters.query])

  // --- Сохранённые лиды ---
  const { data: savedData, refetch: refetchSaved } = useQuery<{ leads: Lead[]; total: number }>({
    queryKey: ["saved-leads"],
    queryFn: async () => {
      const res = await fetch("/api/saved-leads")
      if (!res.ok) throw new Error("saved")
      return res.json()
    },
  })
  const savedLeads = savedData?.leads ?? []
  const savedIds = React.useMemo(() => new Set(savedLeads.map((l) => l.id)), [savedLeads])

  // --- Смена страницы ---
  const handlePageChange = React.useCallback(
    (page: number) => {
      setPage(page)
      window.scrollTo({ top: 0, behavior: "smooth" })
      fetchLeads({ ...filters, page }, sort, false)
    },
    [filters, sort, fetchLeads, setPage]
  )

  // --- Сохранение лида ---
  const handleToggleSave = React.useCallback(
    async (id: string) => {
      const isSaved = savedIds.has(id)
      try {
        if (isSaved) {
          await fetch(`/api/leads/${id}/save`, { method: "DELETE" })
          toast({
            title: "Убрано из сохранённых",
            description: "Лид удалён из «Мои лиды»",
            action: (
              <ToastAction altText="Вернуть" onClick={() => handleToggleSave(id)}>
                Вернуть
              </ToastAction>
            ),
          })
        } else {
          await fetch(`/api/leads/${id}/save`, { method: "POST" })
          toast({
            title: "Лид сохранён",
            description: "Добавлено в «Мои лиды»",
            action: (
              <ToastAction altText="Отменить" onClick={() => handleToggleSave(id)}>
                Отменить
              </ToastAction>
            ),
          })
          // Confetti на первом сохранённом лиде (когда до этого было 0)
          if (savedIds.size === 0) {
            setConfettiPos({})
            setConfettiTrigger((t) => t + 1)
          }
        }
        refetchSaved()
        queryClient.invalidateQueries({ queryKey: ["stats"] })
      } catch {
        toast({
            title: "Ошибка сохранения",
            description: "Не удалось изменить статус сохранения",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Повторить"
                onClick={() => handleToggleSave(id)}
                className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
              >
                Повторить
              </ToastAction>
            ),
          })
      }
    },
    [savedIds, refetchSaved, queryClient, toast]
  )

  // --- Смена статуса (оптимистично через локальное состояние) ---
  const handleChangeStatus = React.useCallback(
    async (id: string, status: string, oldStatus?: string) => {
      // Оптимистичное обновление локального results
      const prev = results
      // Get old status from current lead
      const currentLead = prev?.leads.find((l) => l.id === id) ?? selectedLead
      const prevStatus = oldStatus ?? currentLead?.status ?? "new"
      if (prev) {
        setResults({
          ...prev,
          leads: prev.leads.map((l) => (l.id === id ? { ...l, status } : l)),
        })
      }
      // Также обновляем selectedLead если это он
      setSelectedLead((cur) => (cur && cur.id === id ? { ...cur, status } : cur))

      try {
        const res = await fetch(`/api/leads/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
        if (!res.ok) throw new Error("status")
        queryClient.invalidateQueries({ queryKey: ["stats"] })
        toast({
          title: "Статус обновлён",
          description: `${getStatusLabel(prevStatus)} → ${getStatusLabel(status)}`,
        })
      } catch {
        // Откат
        if (prev) setResults(prev)
        toast({ title: "Не удалось обновить статус", variant: "destructive",
          action: (
            <ToastAction
              altText="Повторить"
              onClick={() => handleChangeStatus(id, status)}
              className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
            >
              Повторить
            </ToastAction>
          ),
        })
      }
    },
    [results, queryClient, toast]
  )

  // --- Открытие drawer ---
  const handleOpenDetail = React.useCallback((lead: Lead) => {
    setSelectedLead(lead)
    setDrawerOpen(true)
  }, [])

  // --- Поделиться лидом ---
  const handleShare = React.useCallback((lead: Lead) => {
    setShareLead(lead)
    setShareOpen(true)
  }, [])

  // --- Перезапуск онбординг-тура ---
  const handleRestartTour = React.useCallback(() => {
    resetOnboarding()
    setTourForceOpen(true)
  }, [resetOnboarding])

  // --- Bulk selection ---
  const handleToggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleClearSelection = React.useCallback(() => {
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [])

  const handleBulkStatus = React.useCallback(
    async (status: string) => {
      const ids = Array.from(selectedIds)
      if (ids.length === 0) return
      // Оптимистично
      const prev = results
      if (prev) {
        setResults({
          ...prev,
          leads: prev.leads.map((l) =>
            selectedIds.has(l.id) ? { ...l, status } : l
          ),
        })
      }
      try {
        await fetch("/api/leads/bulk-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status }),
        })
        toast({
          title: `Статус изменён для ${ids.length} лидов`,
          description: `${getStatusLabel(status)} • Выбрано: ${ids.length}`,
        })
        queryClient.invalidateQueries({ queryKey: ["stats"] })
        handleClearSelection()
      } catch {
        if (prev) setResults(prev)
        toast({ title: "Ошибка массового обновления", variant: "destructive",
          action: (
            <ToastAction
              altText="Повторить"
              onClick={() => handleBulkStatus(status)}
              className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
            >
              Повторить
            </ToastAction>
          ),
        })
      }
    },
    [selectedIds, results, queryClient, toast, handleClearSelection]
  )

  const handleBulkSave = React.useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      const res = await fetch("/api/leads/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      toast({
        title: `Сохранено ${data.saved || 0} из ${ids.length}`,
        description: data.alreadySaved > 0 ? `${data.alreadySaved} уже были сохранены` : undefined,
      })
      refetchSaved()
      queryClient.invalidateQueries({ queryKey: ["stats"] })
      handleClearSelection()
    } catch {
      toast({ title: "Ошибка сохранения", variant: "destructive",
        action: (
          <ToastAction
            altText="Повторить"
            onClick={() => handleBulkSave()}
            className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900"
          >
            Повторить
          </ToastAction>
        ),
      })
    }
  }, [selectedIds, refetchSaved, queryClient, toast, handleClearSelection])

  const handleBulkExport = React.useCallback(() => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    // Экспортируем только выбранных по ID
    const params = new URLSearchParams({
      format: "xlsx",
      scope: "selected",
      ids: ids.join(","),
    })
    const url = `/api/export?${params.toString()}`
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-selected-${ids.length}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast({
      title: `Экспорт инициирован`,
      description: `${ids.length} лидов выгружается`,
    })
    handleClearSelection()
  }, [selectedIds, toast, handleClearSelection])

  // --- Смена сортировки ---
  const handleSortChange = React.useCallback(
    (newSort: "score" | "rating" | "reviews" | "name" | "newest") => {
      setSort(newSort)
      fetchLeads({ ...filters, page: 1 }, newSort, false)
    },
    [filters, setSort, fetchLeads]
  )

  // --- Восстановление фильтров из истории ---
  const handleRestoreFilters = React.useCallback(
    (restored: SearchFilters) => {
      setFilters(restored)
      setMobileFiltersOpen(false)
      fetchLeads(restored, sort, true)
    },
    [setFilters, sort, fetchLeads]
  )

  // --- Найти похожих лидов (по нише + городу текущего лида) ---
  const handleFindSimilar = React.useCallback(
    (lead: Lead) => {
      const newFilters = {
        niche: [lead.niche],
        countries: [] as string[],
        cities: [lead.city],
        problems: [] as string[],
        companyType: "any",
        page: 1,
        query: "",
      }
      setFilters(newFilters)
      setActiveTab("all")
      setSelectedIds(new Set())
      setSelectMode(false)
      setMobileFiltersOpen(false)
      setDrawerOpen(false)
      fetchLeads(newFilters, sort, true)
      toast({
        title: "Поиск похожих лидов",
        description: `Ниша: ${getNicheLabel(lead.niche)} • Город: ${lead.city}`,
      })
    },
    [setFilters, setActiveTab, sort, fetchLeads, toast]
  )

  // --- Сравнение лидов ---
  const handleToggleCompare = React.useCallback((id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 4) {
          toast({
            title: "Максимум 4 лида для сравнения",
            variant: "destructive",
          })
          return prev
        }
        next.add(id)
      }
      return next
    })
  }, [toast])

  const handleClearCompare = React.useCallback(() => {
    setCompareIds(new Set())
    setCompareMode(false)
  }, [])

  const compareLeads = React.useMemo(() => {
    if (compareIds.size === 0) return []
    const all = activeTab === "all" ? results?.leads ?? [] : savedLeads
    return all.filter((l) => compareIds.has(l.id))
  }, [compareIds, results, savedLeads, activeTab])

  // --- Горячие клавиши ---
  useKeyboardShortcuts([
    {
      key: "/",
      ignoreInputs: true,
      handler: (e) => {
        e.preventDefault()
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Поиск по названию"]'
        )
        input?.focus()
      },
    },
    {
      key: "escape",
      handler: () => {
        if (compareOpen) setCompareOpen(false)
        else if (drawerOpen) setDrawerOpen(false)
        else if (adminOpen) setAdminOpen(false)
      },
    },
    {
      key: "c",
      shift: true,
      ignoreInputs: true,
      handler: () => {
        // Shift+C когда выбраны лиды для сравнения — открыть сравнение
        if (compareIds.size >= 2) {
          setCompareOpen(true)
        }
      },
    },
    {
      key: "s",
      shift: true,
      ignoreInputs: true,
      handler: () => {
        // Shift+S — переключить режим массового выбора
        if (activeTab === "all" && view === "list") {
          setSelectMode(!selectMode)
          if (selectMode) setSelectedIds(new Set())
        }
      },
    },
    {
      key: "d",
      shift: true,
      ignoreInputs: true,
      handler: () => {
        // Shift+D — переключить вид список/дашборд
        if (activeTab === "all") {
          setView(view === "list" ? "dashboard" : "list")
        }
      },
    },
  ])

  // --- Экспорт ---
  const handleExport = React.useCallback(
    (format: "csv" | "xlsx") => {
      const scope = activeTab === "saved" ? "saved" : "all"
      const params = new URLSearchParams({ format, scope })
      if (scope === "all") {
        params.set("filters", JSON.stringify(filters))
      }
      const url = `/api/export?${params.toString()}`
      const a = document.createElement("a")
      a.href = url
      a.download = `leads-${scope}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast({
        title: `Экспорт ${format.toUpperCase()}`,
        description:
          scope === "saved" ? "Выгружаем сохранённых лидов" : "Выгружаем найденных лидов",
        action: (
          <ToastAction altText="Открыть" onClick={() => window.open(url, "_blank")}>
            Открыть
          </ToastAction>
        ),
      })
    },
    [activeTab, filters, toast]
  )

  const isLoading = isSearching && !hasSearched
  const showLeads = activeTab === "all" ? results?.leads ?? [] : savedLeads
  const showTotal = activeTab === "all" ? results?.total ?? 0 : savedLeads.length
  const showTotalPages = activeTab === "all" ? results?.totalPages ?? 1 : 1

  // Топ-4 ниши для отображения
  const topNiches = React.useMemo(() => {
    if (!stats?.byNiche) return []
    return Object.entries(stats.byNiche)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => ({ label: getNicheLabel(k), count: v }))
  }, [stats])

  return (
    <div className="app-bg flex min-h-screen flex-col">
      <LoadingBar loading={isSearching} />
      <Header stats={stats ?? null} />

      {/* Баннер услуг */}
      <div className="border-b border-border/40 bg-card/40">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6 scroll-area">
          <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Услуги:
          </span>
          {SERVICES.map((s) => {
            const Icon = s.icon
            return (
              <span
                key={s.label}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] text-foreground/80"
              >
                <Icon className="size-3 text-primary" />
                {s.label}
              </span>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 shrink-0 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={handleRestartTour}
          >
            <HelpCircle className="size-3.5" />
            Тур
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => setAdminOpen(true)}
          >
            <Shield className="size-3.5" />
            Админка
          </Button>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 pb-16 lg:pb-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[330px_1fr]">
          {/* Фильтры — десктоп (sticky) */}
          <aside className="hidden lg:flex flex-col gap-3">
            <div className="sticky top-[76px] max-h-[calc(100vh-92px)] overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              <FiltersPanel onSearch={runSearch} />
            </div>
            {/* Шаблоны фильтров */}
            <FilterTemplates
              currentFilters={filters}
              currentSort={sort}
              onApply={(f, s) => handleRestoreFilters(f)}
            />
            {/* История поисков под фильтрами */}
            <SearchHistory onRestore={handleRestoreFilters} />
          </aside>

          {/* Основная область результатов */}
          <section className="flex min-w-0 flex-col">
            {/* Шапка результатов: вкладки + вид + экспорт */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "saved")}>
                  <TabsList>
                    <TabsTrigger value="all" className="gap-1.5">
                      <Search className="size-3.5" />
                      Все лиды
                    </TabsTrigger>
                    <TabsTrigger value="saved" className="gap-1.5">
                      <Bookmark className="size-3.5" />
                      Мои лиды
                      {savedLeads.length > 0 && (
                        <Badge className="ml-1 h-4 px-1 text-[9px]">{savedLeads.length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Переключатель вида: список / дашборд */}
                {activeTab === "all" && (
                  <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
                    <Button
                      variant={view === "list" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setView("list")}
                    >
                      <List className="size-3.5" />
                      <span className="hidden sm:inline">Список</span>
                    </Button>
                    <Button
                      variant={view === "dashboard" ? "default" : "ghost"}
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => setView("dashboard")}
                    >
                      <LayoutDashboard className="size-3.5" />
                      <span className="hidden sm:inline">Дашборд</span>
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Кнопка массового выбора */}
                {activeTab === "all" && view === "list" && (
                  <Button
                    variant={selectMode ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectMode(!selectMode)
                      if (selectMode) setSelectedIds(new Set())
                    }}
                  >
                    <CheckSquare className="size-4" />
                    <span className="hidden sm:inline">
                      {selectMode ? "Готово" : "Выбрать"}
                    </span>
                  </Button>
                )}

                {/* Кнопка сравнения лидов */}
                {activeTab === "all" && view === "list" && (
                  <Button
                    variant={compareMode ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setCompareMode(!compareMode)
                      if (compareMode) handleClearCompare()
                    }}
                  >
                    <GitCompare className="size-4" />
                    <span className="hidden sm:inline">
                      {compareMode ? "Готово" : "Сравнить"}
                    </span>
                    {compareIds.size > 0 && (
                      <Badge className="ml-0.5 h-4 px-1 text-[9px]">
                        {compareIds.size}
                      </Badge>
                    )}
                  </Button>
                )}

                {/* Мобильная кнопка фильтров */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="size-4" />
                      Фильтры
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[320px] p-0 overflow-y-auto">
                    <SheetHeader className="px-4 py-3">
                      <SheetTitle>Фильтры поиска</SheetTitle>
                    </SheetHeader>
                    <div className="h-[calc(100%-56px)] overflow-y-auto">
                      <FiltersPanel onSearch={runSearch} />
                      <div className="p-3">
                        <FilterTemplates
                          currentFilters={filters}
                          currentSort={sort}
                          onApply={(f, s) => handleRestoreFilters(f)}
                        />
                      </div>
                      <div className="px-3 pb-3">
                        <SearchHistory onRestore={handleRestoreFilters} />
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExport("csv")}
                  disabled={activeTab === "saved" ? savedLeads.length === 0 : false}
                >
                  <FileText className="size-4" />
                  <span className="hidden sm:inline">CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExport("xlsx")}
                  disabled={activeTab === "saved" ? savedLeads.length === 0 : false}
                >
                  <FileSpreadsheet className="size-4" />
                  <span className="hidden sm:inline">XLSX</span>
                </Button>
              </div>
            </div>

            {/* Контент: дашборд или список */}
            {view === "dashboard" && activeTab === "all" ? (
              <DashboardView stats={stats ?? null} activityData={activityData} />
            ) : (
              <>
                {/* Banner: "suggestedNearby" — если в выбранном городе нет лидов, показываем соседние */}
                {activeTab === "all" && results?.suggestedNearby && !isSearching && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <div>
                      <p className="font-semibold">В выбранном городе лидов не нашлось.</p>
                      <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/80">
                        Показаны лиды по тем же фильтрам из других городов ({showTotal}). Сбросьте фильтр по городу или попробуйте поиск по названию.
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick stats bar (только для вкладки "Все лиды") */}
                {activeTab === "all" && !isSearching && showLeads.length > 0 && (
                  <QuickStatsBar leads={showLeads} total={showTotal} />
                )}

                {/* Smart recommendations panel (только для вкладки "Все лиды") */}
                {activeTab === "all" && !isSearching && showLeads.length > 0 && (
                  <RecommendationsPanel
                    leads={showLeads}
                    onOpenDetail={handleOpenDetail}
                  />
                )}

                {/* Строка информации о результате + сортировка */}
                {activeTab === "all" && (
                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Sparkles className="size-3.5 text-primary" />
                      {isSearching
                        ? "Выполняется поиск..."
                        : `Найдено лидов: ${showTotal}`}
                    </span>
                    {results && !isSearching && (
                      <span className="text-muted-foreground">
                        Страница {results.page} из {results.totalPages}
                      </span>
                    )}
                    {topNiches.length > 0 && !isSearching && (
                      <div className="ml-auto hidden items-center gap-1.5 lg:flex">
                        <span className="text-muted-foreground">Топ ниш:</span>
                        {topNiches.slice(0, 3).map((n) => (
                          <Badge key={n.label} variant="outline" className="text-[10px] font-normal">
                            {n.label} · {n.count}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Сортировка */}
                    {!isSearching && showLeads.length > 0 && (
                      <div className={topNiches.length > 0 ? "lg:ml-2" : "ml-auto"}>
                        <SortControl value={sort} onChange={handleSortChange} />
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk action bar */}
                {selectMode && (
                  <BulkActionBar
                    selectedCount={selectedIds.size}
                    onClearSelection={handleClearSelection}
                    onBulkStatus={handleBulkStatus}
                    onBulkSave={handleBulkSave}
                    onBulkExport={handleBulkExport}
                  />
                )}

                {/* Compare action bar */}
                {compareMode && (
                  <div className="sticky top-[60px] z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50/95 px-3 py-2 text-xs backdrop-blur-md shadow-md dark:border-emerald-800 dark:bg-emerald-950/85">
                    <GitCompare className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-900 dark:text-emerald-200">
                      Сравнение: выбрано {compareIds.size} из 4 лидов
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 gap-1.5 text-xs"
                        disabled={compareIds.size < 2}
                        onClick={() => setCompareOpen(true)}
                      >
                        <GitCompare className="size-3.5" />
                        Сравнить ({compareIds.size})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleClearCompare}
                      >
                        Сбросить
                      </Button>
                    </div>
                  </div>
                )}

                {/* Контент */}
                <div className="min-h-[400px]">
                  {activeTab === "all" ? (
                    <>
                      {isSearching && !results ? (
                        <LoadingLeads stage={loadingStage} />
                      ) : showLeads.length === 0 ? (
                        <EmptyState onReset={() => runSearch()} />
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {showLeads.map((lead, idx) => (
                              <div
                                key={lead.id}
                                className="animate-card-enter"
                                style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                              >
                                <LeadCard
                                  lead={lead}
                                  saved={savedIds.has(lead.id)}
                                  selected={selectedIds.has(lead.id)}
                                  selectable={selectMode}
                                  comparable={compareMode}
                                  compared={compareIds.has(lead.id)}
                                  index={idx}
                                  onToggleSave={handleToggleSave}
                                  onStatusChange={handleChangeStatus}
                                  onOpenDetail={handleOpenDetail}
                                  onToggleSelect={handleToggleSelect}
                                  onToggleCompare={handleToggleCompare}
                                  onFindSimilar={handleFindSimilar}
                                  onShare={handleShare}
                                />
                              </div>
                            ))}
                          </div>
                          {showTotalPages > 1 && (
                            <div className="mt-6">
                              <Pagination
                                page={filters.page}
                                totalPages={showTotalPages}
                                onPageChange={handlePageChange}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    /* Вкладка «Мои лиды» */
                    <>
                      {savedLeads.length === 0 ? (
                        <EmptySavedState />
                      ) : (
                        <>
                          <div className="mb-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <Bookmark className="size-3.5" />
                            Сохранённых лидов: {savedLeads.length}
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {savedLeads.map((lead, idx) => (
                              <LeadCard
                                key={lead.id}
                                lead={lead}
                                saved={true}
                                index={idx}
                                onToggleSave={handleToggleSave}
                                onStatusChange={handleChangeStatus}
                                onOpenDetail={handleOpenDetail}
                                onFindSimilar={handleFindSimilar}
                                onShare={handleShare}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Drawer деталей лида */}
      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        saved={selectedLead ? savedIds.has(selectedLead.id) : false}
        onToggleSave={handleToggleSave}
        onStatusChange={handleChangeStatus}
      />

      {/* Админ-панель */}
      {adminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}

      {/* Модал сравнения лидов */}
      <LeadComparison
        leads={compareLeads}
        open={compareOpen}
        onOpenChange={setCompareOpen}
        onSelectLead={handleOpenDetail}
      />

      {/* Кнопка и модал горячих клавиш */}
      <KeyboardShortcutsHelp />

      <MobileBottomNav
        savedCount={savedLeads.length}
        onOpenFilters={() => setMobileFiltersOpen(true)}
        onExport={() => handleExport("xlsx")}
      />

      {/* Плавающая кнопка наверх */}
      <ScrollToTop />

      {/* Онбординг-тур (первый визит или ручной запуск) */}
      <OnboardingTour
        forceOpen={tourForceOpen}
        onClose={() => setTourForceOpen(false)}
      />

      {/* Диалог «Поделиться лидом» */}
      <ShareLeadDialog
        lead={shareLead}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      {/* Конфетти — микро-празднование при первом сохранении лида */}
      <Confetti trigger={confettiTrigger} x={confettiPos.x} y={confettiPos.y} />

      <Footer />
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border border-dashed border-border bg-gradient-to-br from-card/80 via-card/50 to-emerald-50/30 dark:to-emerald-950/20 py-24 text-center animate-content-slide-up">
      {/* Декоративные фоновые элементы */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
        <div className="absolute left-1/4 top-1/4 size-32 rounded-full bg-emerald-500 blur-3xl animate-float-slow" />
        <div className="absolute right-1/4 bottom-1/4 size-40 rounded-full bg-teal-500 blur-3xl animate-float-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Декоративная сетка точек */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative animate-breathe">
        <div className="relative flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-muted to-muted/50 shadow-inner">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 shadow-lg">
            <Inbox className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          {/* Decorative sparkles */}
          <Sparkles className="absolute -right-2 -top-2 size-5 text-amber-400 animate-sparkle" />
          <Sparkles className="absolute -bottom-1 -left-2 size-3 text-emerald-400 animate-sparkle" style={{ animationDelay: "1s" }} />
        </div>
      </div>

      <div className="relative max-w-md space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="size-1.5 rounded-full bg-amber-500 animate-status-dot-pulse" />
          Поиск не дал результатов
        </div>
        <p className="text-xl font-bold text-foreground">
          По выбранным фильтрам лиды не найдены
        </p>
        <p className="text-sm text-muted-foreground">
          Попробуйте изменить город, нишу или проблемы. Также можно сбросить
          все фильтры и посмотреть всю базу.
        </p>
      </div>

      <div className="relative flex flex-col items-center gap-3">
        <Button onClick={onReset} variant="default" size="sm" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
          <Search className="size-4" />
          Показать всех лидов
        </Button>
        <p className="text-[11px] text-muted-foreground">
          В базе 3265 лидов в 451 городе — точно что-то найдётся
        </p>
      </div>

      {/* Декоративные плавающие иконки */}
      <div className="pointer-events-none absolute left-8 top-1/3 hidden opacity-20 sm:block">
        <Search className="size-6 text-emerald-500 animate-float-slow" />
      </div>
      <div className="pointer-events-none absolute right-8 top-1/4 hidden opacity-20 sm:block">
        <MapPin className="size-5 text-teal-500 animate-float-slow" style={{ animationDelay: "1.5s" }} />
      </div>
      <div className="pointer-events-none absolute bottom-12 left-1/4 hidden opacity-15 sm:block">
        <TrendingUp className="size-4 text-amber-500 animate-float-slow" style={{ animationDelay: "0.5s" }} />
      </div>
    </div>
  )
}

function EmptySavedState() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border border-dashed border-border bg-gradient-to-br from-card/80 via-card/50 to-emerald-50/30 dark:to-emerald-950/20 py-24 text-center animate-content-slide-up">
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]">
        <div className="absolute left-1/3 top-1/4 size-36 rounded-full bg-emerald-500 blur-3xl animate-float-slow" />
        <div className="absolute right-1/3 bottom-1/4 size-28 rounded-full bg-violet-500 blur-3xl animate-float-slow" style={{ animationDelay: "1.5s" }} />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative animate-breathe">
        <div className="relative flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-muted to-muted/50 shadow-inner">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-violet-100 dark:from-emerald-950 dark:to-violet-950 shadow-lg">
            <Bookmark className="size-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <Sparkles className="absolute -right-2 -top-2 size-5 text-violet-400 animate-sparkle" />
        </div>
      </div>

      <div className="relative max-w-md space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-medium text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
          <span className="size-1.5 rounded-full bg-violet-500 animate-status-dot-pulse" />
          Сохранённых лидов пока нет
        </div>
        <p className="text-xl font-bold text-foreground">
          Здесь будут ваши сохранённые лиды
        </p>
        <p className="text-sm text-muted-foreground">
          Нажимайте на иконку закладки в карточке компании, чтобы сохранить её
          и быстро вернуться позже. Сохранённые лиды можно экспортировать в CSV или Excel.
        </p>
      </div>

      {/* Подсказки в виде мини-карточек */}
      <div className="relative grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 p-3 text-center">
          <Bookmark className="size-4 text-emerald-500" />
          <span className="text-[10px] text-muted-foreground">Сохраняйте</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 p-3 text-center">
          <FileSpreadsheet className="size-4 text-amber-500" />
          <span className="text-[10px] text-muted-foreground">Экспортируйте</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 p-3 text-center">
          <TrendingUp className="size-4 text-violet-500" />
          <span className="text-[10px] text-muted-foreground">Работайте</span>
        </div>
      </div>
    </div>
  )
}
