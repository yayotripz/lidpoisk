"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Copy,
  Shield,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  Phone,
  Globe,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  NICHES,
  COUNTRIES,
  COMPANY_TYPES,
  DATA_SOURCES,
  LEAD_STATUSES,
  getNicheLabel,
  getCountryLabel,
} from "@/lib/constants"
import type { Lead } from "@/lib/leads"
import { cn } from "@/lib/utils"

type AdminPanelProps = {
  onClose: () => void
}

type LeadFormData = {
  id?: string
  companyName: string
  niche: string
  country: string
  city: string
  address: string
  phone: string
  whatsapp: string
  telegram: string
  website: string
  rating: string
  reviewsCount: string
  source: string
  companyType: string
  status: string
  notes: string
}

const EMPTY_FORM: LeadFormData = {
  companyName: "",
  niche: "restaurants",
  country: "russia",
  city: "",
  address: "",
  phone: "",
  whatsapp: "",
  telegram: "",
  website: "",
  rating: "0",
  reviewsCount: "0",
  source: "Справочник",
  companyType: "local",
  status: "new",
  notes: "",
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)
  const [editingLead, setEditingLead] = React.useState<Lead | null>(null)
  const [showForm, setShowForm] = React.useState(false)
  const [dedupOpen, setDedupOpen] = React.useState(false)

  // Список лидов
  const { data, isLoading, refetch } = useQuery<{
    leads: Lead[]
    total: number
    totalPages: number
  }>({
    queryKey: ["admin-leads", search, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
      })
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/leads?${params}`)
      if (!res.ok) throw new Error("leads")
      const d = await res.json()
      // Клиентский поиск по названию
      if (search) {
        const q = search.toLowerCase()
        d.leads = d.leads.filter(
          (l: Lead) =>
            l.companyName.toLowerCase().includes(q) ||
            l.city.toLowerCase().includes(q) ||
            (l.phone || "").includes(q)
        )
        d.total = d.leads.length
      }
      return d
    },
  })

  const leads = data?.leads ?? []

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setShowForm(true)
  }

  const handleAdd = () => {
    setEditingLead(null)
    setShowForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Удалить лид «${name}»? Действие необратимо.`)) return
    try {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast({ title: "Лид удалён" })
      refetch()
      queryClient.invalidateQueries({ queryKey: ["stats"] })
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Шапка админки */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-600 text-white">
            <Shield className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Админ-панель</h2>
            <p className="text-xs text-muted-foreground">
              Управление лидами, дедупликация, ручное редактирование
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setDedupOpen(true)}
          >
            <Copy className="size-4" />
            <span className="hidden sm:inline">Дедупликация</span>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleAdd}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">Добавить</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, городу, телефону..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="h-9 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          Всего: {data?.total ?? 0}
        </span>
      </div>

      {/* Таблица лидов */}
      <div className="flex-1 overflow-auto scroll-area p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Building2 className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Лиды не найдены</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Компания</th>
                  <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Ниша</th>
                  <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Город</th>
                  <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Контакты</th>
                  <th className="px-3 py-2 text-center font-medium">Скор</th>
                  <th className="px-3 py-2 text-left font-medium">Статус</th>
                  <th className="px-3 py-2 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground truncate max-w-[200px]">
                        {lead.companyName}
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {lead.city}
                      </div>
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px]">
                        {getNicheLabel(lead.niche)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell text-xs">
                      {lead.city}
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="size-3" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.website && (
                          <span className="flex items-center gap-1 text-primary truncate max-w-[150px]">
                            <Globe className="size-3" />
                            {lead.website.replace(/^https?:\/\//, "")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold",
                          lead.leadScore >= 10
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : lead.leadScore >= 6
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {lead.leadScore}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">
                        {LEAD_STATUSES.find((s) => s.key === lead.status)?.label || lead.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => handleEdit(lead)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          onClick={() => handleDelete(lead.id, lead.companyName)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Пагинация */}
        {data && data.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </Button>
            <span className="text-xs text-muted-foreground">
              Страница {page} из {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Далее
            </Button>
          </div>
        )}
      </div>

      {/* Форма редактирования/добавления */}
      {showForm && (
        <LeadFormDialog
          lead={editingLead}
          open={showForm}
          onOpenChange={setShowForm}
          onSaved={() => {
            refetch()
            queryClient.invalidateQueries({ queryKey: ["stats"] })
            setShowForm(false)
          }}
        />
      )}

      {/* Диалог дедупликации */}
      <DedupDialog open={dedupOpen} onOpenChange={setDedupOpen} onDone={() => refetch()} />
    </div>
  )
}

// --- Форма лида ---
function LeadFormDialog({
  lead,
  open,
  onOpenChange,
  onSaved,
}: {
  lead: Lead | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [form, setForm] = React.useState<LeadFormData>(EMPTY_FORM)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (lead) {
      setForm({
        id: lead.id,
        companyName: lead.companyName,
        niche: lead.niche,
        country: lead.country,
        city: lead.city,
        address: lead.address || "",
        phone: lead.phone || "",
        whatsapp: lead.whatsapp || "",
        telegram: lead.telegram || "",
        website: lead.website || "",
        rating: String(lead.rating),
        reviewsCount: String(lead.reviewsCount),
        source: lead.source,
        companyType: lead.companyType,
        status: lead.status,
        notes: lead.notes || "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [lead])

  const set = (k: keyof LeadFormData, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.companyName.trim() || !form.city.trim()) {
      toast({ title: "Заполните название и город", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        companyName: form.companyName,
        niche: form.niche,
        country: form.country,
        city: form.city,
        address: form.address || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        telegram: form.telegram || null,
        website: form.website || null,
        rating: Number(form.rating) || 0,
        reviewsCount: Number(form.reviewsCount) || 0,
        source: form.source,
        companyType: form.companyType,
        status: form.status,
        notes: form.notes,
      }
      const res = lead
        ? await fetch(`/api/leads/${lead.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Ошибка")
      }
      toast({
        title: lead ? "Лид обновлён" : "Лид создан",
        description: lead ? undefined : "Скор и проблемы пересчитаны автоматически",
      })
      onSaved()
    } catch (e) {
      toast({
        title: "Ошибка сохранения",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Города для выбранной страны
  const cities = COUNTRIES.find((c) => c.key === form.country)?.cities ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle>{lead ? "Редактировать лид" : "Добавить лид"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Изменения применятся автоматически. Скор и проблемы пересчитаются."
              : "Новый лид будет добавлен в базу. Скор и проблемы определятся автоматически."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="companyName">Название компании *</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                placeholder="ООО «Ромашка»"
              />
            </div>

            <div>
              <Label>Ниша</Label>
              <Select value={form.niche} onValueChange={(v) => set("niche", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n.key} value={n.key}>
                      {n.icon} {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Тип компании</Label>
              <Select value={form.companyType} onValueChange={(v) => set("companyType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.filter((t) => t.key !== "any").map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Страна</Label>
              <Select
                value={form.country}
                onValueChange={(v) => set("country", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Город *</Label>
              <Select value={form.city} onValueChange={(v) => set("city", v)}>
                <SelectTrigger><SelectValue placeholder="Выберите город" /></SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Адрес</Label>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="ул. Ленина, д. 10"
              />
            </div>

            <div>
              <Label>Телефон</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+79991234567"
              />
            </div>

            <div>
              <Label>WhatsApp (ссылка или пусто)</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                placeholder="https://wa.me/79991234567"
              />
            </div>

            <div>
              <Label>Telegram</Label>
              <Input
                value={form.telegram}
                onChange={(e) => set("telegram", e.target.value)}
                placeholder="@username"
              />
            </div>

            <div>
              <Label>Сайт</Label>
              <Input
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://example.ru"
              />
            </div>

            <div>
              <Label>Рейтинг (0–5)</Label>
              <Input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(e) => set("rating", e.target.value)}
              />
            </div>

            <div>
              <Label>Кол-во отзывов</Label>
              <Input
                type="number"
                min="0"
                value={form.reviewsCount}
                onChange={(e) => set("reviewsCount", e.target.value)}
              />
            </div>

            <div>
              <Label>Источник</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Заметки</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Внутренние заметки по лиду..."
                className="min-h-[60px]"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {lead ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Диалог дедупликации ---
type DedupGroup = {
  key: string
  keep: { id: string; companyName: string; phone: string | null; city: string }
  remove: { id: string; companyName: string; phone: string | null; city: string }[]
}

function DedupDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onDone: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [groups, setGroups] = React.useState<DedupGroup[]>([])
  const [totalDuplicates, setTotalDuplicates] = React.useState(0)
  const [analyzed, setAnalyzed] = React.useState(false)

  const runAnalysis = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      })
      const data = await res.json()
      setGroups(data.duplicateGroups || [])
      setTotalDuplicates(data.totalDuplicates || 0)
      setAnalyzed(true)
    } catch {
      toast({ title: "Ошибка анализа", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch("/api/admin/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      })
      const data = await res.json()
      toast({
        title: `Удалено дублей: ${data.deleted}`,
        description: `Из ${data.groupsCount} групп`,
      })
      onDone()
      onOpenChange(false)
      setGroups([])
      setAnalyzed(false)
    } catch {
      toast({ title: "Ошибка удаления", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  React.useEffect(() => {
    if (open && !analyzed) runAnalysis()
  }, [open, analyzed])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-area">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-5 text-primary" />
            Дедупликация лидов
          </DialogTitle>
          <DialogDescription>
            Поиск дублей по названию компании + телефону. Оставляется лид с наивысшим скором.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Анализируем базу...</span>
          </div>
        ) : groups.length === 0 ? (
          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertTitle className="text-emerald-800 dark:text-emerald-300">
              Дублей не найдено
            </AlertTitle>
            <AlertDescription className="text-emerald-700 dark:text-emerald-400">
              В базе нет повторяющихся компаний.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3 py-2">
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-300">
                Найдено {groups.length} групп дублей
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Всего будет удалено {totalDuplicates} записей. Останутся лиды с наивысшим скором.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 max-h-[400px] overflow-y-auto scroll-area">
              {groups.map((g, i) => (
                <Card key={i} className="border-border/60">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Оставить: {g.keep.companyName}
                      <span className="text-muted-foreground font-normal">
                        ({g.keep.city})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <div className="space-y-1">
                      {g.remove.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 className="size-3" />
                          <span className="line-through opacity-70">{r.companyName}</span>
                          <span className="text-muted-foreground">({r.city})</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          {groups.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Удалить {totalDuplicates} дублей
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
