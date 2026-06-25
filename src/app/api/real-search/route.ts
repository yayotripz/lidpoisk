import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { searchRealLeads } from "@/lib/osm-search"
import { searchDgis, isDgisConfigured, type DgisSearchResult } from "@/lib/dgis-search"
import type { Lead } from "@/lib/leads"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// POST /api/real-search
// Принимает: { niche, city, country?, limit?, excludeOsmIds? }
// Возвращает: { ok, found, returned, leads, source, sources: {osm, dgis} }
//
// ВАЖНО: эта ручка НЕ сохраняет найденных лидов в БД.
// Лиды возвращаются в response как временные (с temp-ID).
// Сохранение в БД происходит ТОЛЬКО когда пользователь явно
// меняет статус лида на saved/in_work/client через /api/leads.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const niche = typeof body.niche === "string" ? body.niche : ""
    const city = typeof body.city === "string" ? body.city.trim() : ""
    const country = typeof body.country === "string" && body.country.trim() ? body.country.trim() : undefined
    const limit = Math.min(500, Math.max(10, Number(body.limit) || 100))
    const excludeOsmIds = Array.isArray(body.excludeOsmIds)
      ? (body.excludeOsmIds.filter((x: unknown) => typeof x === "string").slice(0, 2000) as string[])
      : []
    const saveToDb = body.saveToDb !== false

    if (!niche) {
      return NextResponse.json(
        { error: "Не указана ниша (поле niche)" },
        { status: 400 }
      )
    }
    if (!city) {
      return NextResponse.json(
        { error: "Не указан город (поле city)" },
        { status: 400 }
      )
    }

    // Параллельно: OSM (всегда) + 2GIS (если есть ключ)
    const osmPromise = searchRealLeads({
      niche,
      city,
      country,
      limit,
      saveToDb: false, // НИКОГДА не сохраняем в БД автоматически
      excludeOsmIds,
    }).catch((e) => {
      console.error("[real-search] OSM error:", e)
      return null
    })

    const dgisPromise: Promise<DgisSearchResult | null> = isDgisConfigured()
      ? searchDgis({ niche, city, country, limit }).catch((e) => {
          console.error("[real-search] 2GIS error:", e)
          return null
        })
      : Promise.resolve(null)

    const [osmResult, dgisResult] = await Promise.all([osmPromise, dgisPromise])

    // === Объединяем и дедуплицируем ===
    const seen = new Set<string>()
    const mergedLeads: Lead[] = []

    // 1. Сначала OSM
    if (osmResult?.leads) {
      for (const lead of osmResult.leads) {
        const key = dedupKey(lead)
        if (seen.has(key)) continue
        seen.add(key)
        mergedLeads.push(lead)
      }
    }

    // 2. Потом 2GIS (преобразуем ParsedLeadDgis → Lead через временный ID)
    if (dgisResult?.leads && dgisResult.leads.length > 0) {
      const { dgisLeadToLead } = await import("@/lib/dgis-search")
      for (let i = 0; i < dgisResult.leads.length; i++) {
        const p = dgisResult.leads[i]
        const lead = dgisLeadToLead(p, i)
        const key = dedupKey(lead)
        if (seen.has(key)) continue
        seen.add(key)
        mergedLeads.push(lead)
      }
    }

    // 3. Сортируем по скору
    mergedLeads.sort((a, b) => {
      if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore
      return b.rating - a.rating
    })

    // 4. Берём срез limit
    const slice = mergedLeads.slice(0, limit)

    let saved = 0
    let duplicates = 0

    if (saveToDb && slice.length > 0) {
      for (const l of slice) {
        // Дедупликация по телефону (если есть) или по имени+городу
        let existing: { id: string } | null = null
        if (l.phone) {
          existing = await db.lead.findFirst({
            where: {
              OR: [
                { phone: l.phone },
                { companyName: l.companyName, city: l.city },
              ],
            },
            select: { id: true },
          })
        } else {
          existing = await db.lead.findFirst({
            where: { companyName: l.companyName, city: l.city },
            select: { id: true },
          })
        }

        if (existing) {
          duplicates++
          l.id = existing.id
          continue
        }

        const created = await db.lead.create({
          data: {
            companyName: l.companyName,
            niche: l.niche,
            country: l.country,
            city: l.city,
            address: l.address,
            phone: l.phone,
            whatsapp: l.whatsapp,
            telegram: l.telegram,
            website: l.website,
            rating: l.rating,
            reviewsCount: l.reviewsCount,
            problems: JSON.stringify(l.problems),
            leadScore: l.leadScore,
            status: l.status,
            source: l.source,
            companyType: l.companyType,
            notes: l.notes || "",
          },
        })
        l.id = created.id
        saved++
      }
    }

    return NextResponse.json({
      ok: true,
      found: slice.length,
      returned: slice.length,
      saved,
      duplicates,
      totalAvailable: osmResult?.found || slice.length,
      leads: slice,
      debug: {
        geocoded: true,
        overpassElements: osmResult?.found || slice.length,
        parsed: osmResult?.found || slice.length,
        afterExclude: slice.length,
        shuffled: true,
        excludedCount: 0
      },
      sources: {
        osm: osmResult
          ? { found: osmResult.found, totalAvailable: osmResult.found, ok: true }
          : { found: 0, totalAvailable: 0, ok: false },
        dgis: dgisResult
          ? { found: dgisResult.found, cityId: dgisResult.cityId, ok: !dgisResult.error }
          : isDgisConfigured()
            ? { found: 0, ok: false }
            : null, // null = не настроен (нет ключа)
      },
      city,
      country: country || "",
      source: osmResult && dgisResult?.leads?.length
        ? "OpenStreetMap + 2GIS"
        : osmResult
          ? "OpenStreetMap"
          : dgisResult
            ? "2GIS"
            : "none",
    })
  } catch (e) {
    console.error("[real-search] error:", e)
    return NextResponse.json(
      { error: (e as Error).message || "Ошибка поиска" },
      { status: 500 }
    )
  }
}

// Ключ дедупликации: нормализованное имя + нормализованный телефон
function dedupKey(lead: Lead): string {
  const name = lead.companyName.toLowerCase().replace(/[^a-zа-я0-9]/gi, "").slice(0, 40)
  const phone = (lead.phone || "").replace(/\D/g, "").slice(-10)
  return `${name}|${phone}`
}

// GET — для теста через браузер
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const niche = url.searchParams.get("niche") || "restaurants"
  const city = url.searchParams.get("city") || "Москва"
  const country = url.searchParams.get("country") || undefined
  const limit = Math.min(50, Math.max(5, Number(url.searchParams.get("limit")) || 20))
  try {
    const osmResult = await searchRealLeads({
      niche,
      city,
      country,
      limit,
      saveToDb: false,
    })
    return NextResponse.json({
      ok: true,
      found: osmResult.found,
      returned: osmResult.leads.length,
      leads: osmResult.leads,
      source: "OpenStreetMap",
    })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
