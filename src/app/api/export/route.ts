import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { mapLead, type SearchFilters } from "@/lib/leads"
import {
  getNicheLabel,
  getCountryLabel,
  getProblemLabel,
  getStatusLabel,
} from "@/lib/constants"
import * as XLSX from "xlsx"

export const dynamic = "force-dynamic"

// GET /api/export?format=csv|xlsx&scope=all|saved|selected&filters=<json>&ids=<csv>
// Выгружает лидов в CSV или XLSX с учётом фильтров или выбранных ID
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = (searchParams.get("format") || "csv").toLowerCase()
    const scope = (searchParams.get("scope") || "all").toLowerCase()
    const filtersRaw = searchParams.get("filters")
    const idsRaw = searchParams.get("ids")

    let filters: SearchFilters | null = null
    if (filtersRaw) {
      try {
        const parsed = JSON.parse(filtersRaw)
        filters = {
          niche: Array.isArray(parsed.niche) ? parsed.niche : [],
          countries: Array.isArray(parsed.countries) ? parsed.countries : [],
          cities: Array.isArray(parsed.cities) ? parsed.cities : [],
          problems: Array.isArray(parsed.problems) ? parsed.problems : [],
          companyType: typeof parsed.companyType === "string" ? parsed.companyType : "any",
        }
      } catch {
        filters = null
      }
    }

    // Парсим выбранные ID (если scope=selected)
    const selectedIds = idsRaw
      ? idsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : []

    let rows
    if (scope === "selected" && selectedIds.length > 0) {
      // Экспорт только выбранных лидов (с сохранением порядка ID)
      const leadsById = await db.lead.findMany({
        where: { id: { in: selectedIds } },
      })
      const map = new Map(leadsById.map((l) => [l.id, l]))
      rows = selectedIds.map((id) => map.get(id)).filter(Boolean) as typeof leadsById
    } else if (scope === "saved") {
      const saved = await db.savedLead.findMany({
        include: { lead: true },
        orderBy: { createdAt: "desc" },
      })
      rows = saved.map((s) => s.lead)
    } else {
      const where: Record<string, unknown> = {}
      if (filters) {
        if (filters.niche.length > 0) where.niche = { in: filters.niche }
        if (filters.countries.length > 0) where.country = { in: filters.countries }
        if (filters.cities.length > 0) where.city = { in: filters.cities }
        if (filters.companyType && filters.companyType !== "any") {
          where.companyType = filters.companyType
        }
      }
      rows = await db.lead.findMany({
        where,
        orderBy: [{ leadScore: "desc" }, { rating: "desc" }],
      })
    }

    // Фильтрация по проблемам (на уровне приложения)
    if (filters && filters.problems.length > 0 && scope === "all") {
      rows = rows.filter((lead) => {
        const leadProblems: string[] = JSON.parse(lead.problems || "[]")
        return filters!.problems.every((p) => leadProblems.includes(p))
      })
    }

    const leads = rows.map(mapLead)

    const header = [
      "Название",
      "Ниша",
      "Страна",
      "Город",
      "Адрес",
      "Телефон",
      "WhatsApp",
      "Telegram",
      "Сайт",
      "Рейтинг",
      "Отзывы",
      "Проблемы",
      "Скор",
      "Статус",
      "Источник",
      "Тип компании",
      "Теги",
    ]

    const data = leads.map((l) => [
      l.companyName,
      getNicheLabel(l.niche),
      getCountryLabel(l.country),
      l.city,
      l.address || "",
      l.phone || "",
      l.whatsapp || "",
      l.telegram || "",
      l.website || "",
      l.rating,
      l.reviewsCount,
      l.problems.map(getProblemLabel).join("; "),
      l.leadScore,
      getStatusLabel(l.status),
      l.source,
      l.companyType,
      l.tags.join("; "),
    ])

    if (format === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet([header, ...data])
      ws["!cols"] = header.map((h) => ({ wch: Math.max(12, Math.min(40, h.length + 4)) }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Лиды")
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="leads-${scope}-${Date.now()}.xlsx"`,
        },
      })
    }

    const escapeCsv = (val: unknown) => {
      const s = String(val ?? "")
      if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const csv = [header, ...data]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n")

    return new NextResponse("\uFEFF" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${scope}-${Date.now()}.csv"`,
      },
    })
  } catch (e) {
    console.error("[export] error", e)
    return NextResponse.json({ error: "Ошибка экспорта" }, { status: 500 })
  }
}
