import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { PROBLEMS, RUSSIA_CITIES_WITH_REGION } from "@/lib/constants"
import { parseProblems } from "@/lib/leads"
import { getDistrictByRegion, FEDERAL_DISTRICTS } from "@/lib/federal-districts"

export const dynamic = "force-dynamic"

// GET /api/stats — общая статистика для панели + дашборд
export async function GET() {
  try {
    const [totalLeads, savedCount, searchesCount] = await Promise.all([
      db.lead.count(),
      db.savedLead.count(),
      db.search.count(),
    ])

    // Статусы
    const statusRows = await db.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    })
    const byStatus = statusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = r._count._all
      return acc
    }, {})

    // Ниша
    const nicheRows = await db.lead.groupBy({
      by: ["niche"],
      _count: { _all: true },
    })
    const byNiche = nicheRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.niche] = r._count._all
      return acc
    }, {})

    // Страна
    const countryRows = await db.lead.groupBy({
      by: ["country"],
      _count: { _all: true },
    })
    const byCountry = countryRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.country] = r._count._all
      return acc
    }, {})

    // Город — топ-30 для тепловой карты
    const cityRows = await db.lead.groupBy({
      by: ["city", "country"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 30,
    })
    // Сначала строим карту город → регион (только для России)
    const cityToRegion = new Map<string, string>()
    for (const c of RUSSIA_CITIES_WITH_REGION) {
      cityToRegion.set(c.city, c.region)
    }
    // Топ-30 городов с упоминанием страны и федерального округа
    const byCity = cityRows.map((r) => {
      const isRussia = r.country === "RU" || r.country === "Россия"
      const region = isRussia ? cityToRegion.get(r.city) : undefined
      const district = isRussia ? getDistrictByRegion(region) : "foreign"
      return {
        city: r.city,
        country: r.country,
        count: r._count._all,
        region: region ?? null,
        district,
      }
    })

    // Распределение по федеральным округам
    // Берём все города России из БД и группируем по федеральному округу
    const allRussiaCityRows = await db.lead.findMany({
      where: { OR: [{ country: "RU" }, { country: "Россия" }] },
      select: { city: true },
    })
    const byFederalDistrict: Record<string, number> = {}
    for (const d of FEDERAL_DISTRICTS) byFederalDistrict[d.key] = 0
    for (const row of allRussiaCityRows) {
      const region = cityToRegion.get(row.city)
      const district = region ? getDistrictByRegion(region) : "foreign"
      byFederalDistrict[district] = (byFederalDistrict[district] ?? 0) + 1
    }

    // Средний скор
    const agg = await db.lead.aggregate({
      _avg: { leadScore: true, rating: true, reviewsCount: true },
      _max: { leadScore: true },
      _min: { leadScore: true },
    })

    // Распределение по скорам (buckets)
    const allLeads = await db.lead.findMany({
      select: { leadScore: true, problems: true },
    })
    const scoreBuckets = [
      { range: "0-3", count: 0 },
      { range: "4-6", count: 0 },
      { range: "7-9", count: 0 },
      { range: "10-12", count: 0 },
      { range: "13+", count: 0 },
    ]
    for (const l of allLeads) {
      const s = l.leadScore
      if (s <= 3) scoreBuckets[0].count++
      else if (s <= 6) scoreBuckets[1].count++
      else if (s <= 9) scoreBuckets[2].count++
      else if (s <= 12) scoreBuckets[3].count++
      else scoreBuckets[4].count++
    }

    // Распределение по проблемам
    const byProblem: Record<string, number> = {}
    for (const p of PROBLEMS) byProblem[p.key] = 0
    for (const l of allLeads) {
      const probs = parseProblems(l.problems)
      for (const p of probs) {
        if (byProblem[p] !== undefined) byProblem[p]++
      }
    }

    return NextResponse.json({
      totalLeads,
      savedCount,
      searchesCount,
      byStatus,
      byNiche,
      byCountry,
      byCity,
      byFederalDistrict,
      byProblem,
      scoreBuckets,
      avgScore: Math.round((agg._avg.leadScore ?? 0) * 10) / 10,
      maxScore: agg._max.leadScore ?? 0,
      minScore: agg._min.leadScore ?? 0,
      avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      avgReviews: Math.round(agg._avg.reviewsCount ?? 0),
    })
  } catch (e) {
    console.error("[stats] error", e)
    return NextResponse.json({ error: "Ошибка статистики" }, { status: 500 })
  }
}
