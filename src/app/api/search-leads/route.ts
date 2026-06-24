import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { mapLead, type SearchFilters } from "@/lib/leads"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 24

// Допустимые поля сортировки
const VALID_SORTS = ["score", "rating", "reviews", "name", "newest"] as const
type SortKey = (typeof VALID_SORTS)[number]

// POST /api/search-leads
// Принимает: niche[], countries[], cities[], problems[], companyType, page, sort, saveHistory, query
// Возвращает: { leads, total, page, totalPages, suggestedNearby? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const filters: SearchFilters = {
      niche: Array.isArray(body.niche) ? body.niche : [],
      countries: Array.isArray(body.countries) ? body.countries : [],
      cities: Array.isArray(body.cities) ? body.cities : [],
      problems: Array.isArray(body.problems) ? body.problems : [],
      companyType: typeof body.companyType === "string" ? body.companyType : "any",
    }
    const page = Math.max(1, Number(body.page) || 1)
    const sort: SortKey = VALID_SORTS.includes(body.sort) ? body.sort : "score"
    const saveHistory = body.saveHistory !== false // по умолчанию true
    // Текстовый поиск по названию компании или городу
    const query: string =
      typeof body.query === "string" ? body.query.trim() : ""

    // Сохраняем поисковый запрос в историю ТОЛЬКО для первой страницы
    // и только если saveHistory=true (пагинация не создаёт дублей)
    if (saveHistory && page === 1) {
      // Дедупликация: если последний поиск имеет идентичные фильтры — не создаём новый
      const lastSearch = await db.search.findFirst({
        orderBy: { createdAt: "desc" },
      })
      const isDuplicate =
        lastSearch &&
        lastSearch.niche === JSON.stringify(filters.niche) &&
        lastSearch.countries === JSON.stringify(filters.countries) &&
        lastSearch.cities === JSON.stringify(filters.cities) &&
        lastSearch.selectedProblems === JSON.stringify(filters.problems) &&
        (lastSearch.companyType || "any") === (filters.companyType || "any")

      if (!isDuplicate) {
        await db.search.create({
          data: {
            niche: JSON.stringify(filters.niche),
            countries: JSON.stringify(filters.countries),
            cities: JSON.stringify(filters.cities),
            selectedProblems: JSON.stringify(filters.problems),
            companyType: filters.companyType === "any" ? null : filters.companyType,
          },
        })
      }
    }

    // Формируем условия where
    const where: Record<string, unknown> = {}

    if (filters.niche.length > 0) {
      where.niche = { in: filters.niche }
    }
    if (filters.countries.length > 0) {
      where.country = { in: filters.countries }
    }
    if (filters.cities.length > 0) {
      where.city = { in: filters.cities }
    }
    if (filters.companyType && filters.companyType !== "any") {
      where.companyType = filters.companyType
    }

    // Текстовый поиск по названию компании или городу
    if (query.length > 0) {
      where.OR = [
        { companyName: { contains: query } },
        { city: { contains: query } },
      ]
    }

    // Проблемы — фильтруем на уровне приложения, т.к. они хранятся как JSON-строка
    let candidates = await db.lead.findMany({ where })

    if (filters.problems.length > 0) {
      candidates = candidates.filter((lead) => {
        const leadProblems: string[] = JSON.parse(lead.problems || "[]")
        // Лид подходит, если у него есть ВСЕ выбранные проблемы
        return filters.problems.every((p) => leadProblems.includes(p))
      })
    }

    // Сортировка
    candidates.sort((a, b) => {
      switch (sort) {
        case "rating":
          if (b.rating !== a.rating) return b.rating - a.rating
          return b.leadScore - a.leadScore
        case "reviews":
          return b.reviewsCount - a.reviewsCount
        case "name":
          return a.companyName.localeCompare(b.companyName, "ru")
        case "newest":
          return b.createdAt.getTime() - a.createdAt.getTime()
        case "score":
        default:
          if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore
          return b.rating - a.rating
      }
    })

    const total = candidates.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * PAGE_SIZE
    const pageItems = candidates.slice(start, start + PAGE_SIZE)

    // Fallback: если выбран город(а) и результат пуст — пробуем без фильтра по городу,
    // сохраняя остальные фильтры (ниша/страна/проблемы/тип/query). Помечаем suggestedNearby=true.
    if (total === 0 && filters.cities.length > 0) {
      const whereNoCity: Record<string, unknown> = {}
      if (filters.niche.length > 0) {
        whereNoCity.niche = { in: filters.niche }
      }
      if (filters.countries.length > 0) {
        whereNoCity.country = { in: filters.countries }
      }
      if (filters.companyType && filters.companyType !== "any") {
        whereNoCity.companyType = filters.companyType
      }
      // Текстовый поиск — НЕ применяем query о городу в fallback (чтобы вернуть именно
      // соседние города), но companyName-поиск сохраняем.
      if (query.length > 0) {
        whereNoCity.OR = [{ companyName: { contains: query } }]
      }

      let nearby = await db.lead.findMany({ where: whereNoCity })
      if (filters.problems.length > 0) {
        nearby = nearby.filter((lead) => {
          const leadProblems: string[] = JSON.parse(lead.problems || "[]")
          return filters.problems.every((p) => leadProblems.includes(p))
        })
      }
      nearby.sort((a, b) => {
        if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore
        return b.rating - a.rating
      })

      const nearbyTotal = nearby.length
      const nearbyTotalPages = Math.max(1, Math.ceil(nearbyTotal / PAGE_SIZE))
      const nearbySafePage = Math.min(page, nearbyTotalPages)
      const nearbyStart = (nearbySafePage - 1) * PAGE_SIZE
      const nearbyItems = nearby.slice(nearbyStart, nearbyStart + PAGE_SIZE)

      return NextResponse.json({
        leads: nearbyItems.map(mapLead),
        total: nearbyTotal,
        page: nearbySafePage,
        totalPages: nearbyTotalPages,
        pageSize: PAGE_SIZE,
        sort,
        suggestedNearby: true,
      })
    }

    return NextResponse.json({
      leads: pageItems.map(mapLead),
      total,
      page: safePage,
      totalPages,
      pageSize: PAGE_SIZE,
      sort,
      suggestedNearby: false,
    })
  } catch (e) {
    console.error("[search-leads] error", e)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
