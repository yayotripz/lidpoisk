/**
 * OSM (OpenStreetMap) live search via Overpass API.
 * Полностью бесплатно, без API-ключей. Источник: openstreetmap.org
 *
 * Стратегия:
 *  1. Nominatim → получаем bounding box города
 *  2. Overpass → ищем точки бизнеса по OSM-тегам внутри bbox
 *  3. Парсим теги → унифицированный формат Lead
 *  4. Сохраняем в БД (если ещё не существует такой телефон/название)
 */

import { db } from "./db"
import { calculateLeadScore, type Lead } from "./leads"
import { getNicheLabel } from "./constants"

// ============================================================
// Маппинг ниш → OSM-теги
// ============================================================

type OsmFilter = { [k: string]: string } // { amenity: dentist } | { shop: hairdresser }

const NICHE_TO_OSM: Record<string, OsmFilter[]> = {
  restaurants:   [{ "amenity": "restaurant" }, { "amenity": "cafe" }, { "amenity": "fast_food" }],
  beauty:        [{ "shop": "hairdresser" }, { "shop": "beauty" }, { "amenity": "spa" }],
  dentistry:     [{ "amenity": "dentist" }, { "healthcare": "dentist" }],
  autoservice:   [{ "shop": "car_repair" }, { "amenity": "car_wash" }, { "amenity": "fuel" }],
  fitness:       [{ "leisure": "fitness_centre" }, { "leisure": "sports_centre" }, { "sport": "fitness" }],
  cleaning:      [{ "shop": "dry_cleaning" }, { "amenity": "dry_cleaning" }],
  food_delivery: [{ "amenity": "fast_food" }, { "shop": "bakery" }, { "shop": "convenience" }],
  clothing:      [{ "shop": "clothes" }, { "shop": "shoes" }, { "shop": "fashion" }],
  online_schools:[{ "amenity": "training" }, { "amenity": "language_school" }],
  tech_repair:   [{ "craft": "electronics_repair" }, { "shop": "mobile_phone" }, { "shop": "computer" }],
  legal:         [{ "office": "lawyer" }, { "office": "notary" }],
  construction:  [{ "craft": "plumber" }, { "craft": "electrician" }, { "building": "commercial" }, { "shop": "doityourself" }],
  medical:       [{ "amenity": "clinic" }, { "amenity": "doctors" }, { "amenity": "hospital" }, { "healthcare": "clinic" }],
  education:     [{ "amenity": "school" }, { "amenity": "kindergarten" }, { "amenity": "college" }, { "amenity": "training" }],
}

// ============================================================
// Overpass mirrors — выбираем по очереди при сбое
// ============================================================

const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
]

const UA = "LidPoisk/1.0 (lead-search; contact: deploy@lidpoisk) z.ai/2026"

// ============================================================
// Nominatim: город → bounding box
// ============================================================

type NominatimResult = {
  lat: string
  lon: string
  boundingbox: [string, string, string, string] // [south, north, west, east]
  name: string
  display_name: string
}

async function geocodeCity(city: string, country?: string): Promise<NominatimResult | null> {
  const q = country ? `${city}, ${country}` : city
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=ru`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "application/json" },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      console.error(`[osm] Nominatim HTTP ${res.status}`)
      return null
    }
    const arr = (await res.json()) as NominatimResult[]
    return arr && arr.length > 0 ? arr[0] : null
  } catch (e) {
    console.error("[osm] Nominatim error:", (e as Error).message)
    return null
  }
}

// ============================================================
// Overpass: поиск по bbox
// ============================================================

type OsmElement = {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements: OsmElement[]
}

function buildOverpassQuery(filters: OsmFilter[], bbox: [number, number, number, number]): string {
  // bbox = [south, west, north, east]
  const [s, w, n, e] = bbox
  const bboxStr = `${s},${w},${n},${e}`
  const parts: string[] = []
  for (const f of filters) {
    for (const [k, v] of Object.entries(f)) {
      // node только — быстрее и покрывает 95% POI
      parts.push(`node["${k}"="${v}"](${bboxStr});`)
    }
  }
  return `[out:json][timeout:20];(${parts.join("")});out 300;`
}

async function tryOneOverpass(ep: string, query: string, timeoutMs: number): Promise<OsmElement[]> {
  const res = await fetch(ep, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: "data=" + encodeURIComponent(query),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`Overpass ${ep} HTTP ${res.status}`)
  const data = (await res.json()) as OverpassResponse
  if (!data || !Array.isArray(data.elements)) throw new Error(`Overpass ${ep} bad response`)
  return data.elements
}

async function queryOverpass(query: string): Promise<OsmElement[]> {
  // Параллельно бьём по 2 зеркалам, берём первый ответивший
  const endpoints = OVERPASS_ENDPOINTS.slice(0, 2)
  const timeoutMs = 30_000
  try {
    const result = await Promise.any(
      endpoints.map((ep) => tryOneOverpass(ep, query, timeoutMs))
    )
    return result
  } catch (e) {
    // Все 2 упали — пробуем остальные последовательно
    console.error("[osm] primary mirrors failed:", (e as Error).message)
    for (const ep of OVERPASS_ENDPOINTS.slice(2)) {
      try {
        return await tryOneOverpass(ep, query, 25_000)
      } catch (e2) {
        console.error(`[osm] mirror ${ep} failed:`, (e2 as Error).message)
      }
    }
    return []
  }
}

// ============================================================
// Парсинг OSM-тегов → Lead
// ============================================================

function getTag(tags: Record<string, string>, ...keys: string[]): string | null {
  for (const k of keys) {
    if (tags[k] && tags[k].trim()) return tags[k].trim()
  }
  return null
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  // OSM часто хранит несколько номеров через ; или ,
  // Берём первый
  let first = phone.split(/[;,]/)[0].trim()
  // Убираем всё кроме + и цифр
  let p = first.replace(/[^\d+]/g, "")
  // Если начинается без + и длина 11 — добавляем +
  if (!p.startsWith("+") && p.length === 11) p = "+" + p
  // Если 10 цифр — считаем что это российский/снг номер без кода
  if (!p.startsWith("+") && p.length === 10) p = "+7" + p
  return p.length >= 10 ? p : null
}

function detectProblems(tags: Record<string, string>): string[] {
  const problems: string[] = []
  const hasWebsite = !!(tags.website || tags["contact:website"] || tags.url)
  const hasPhone = !!(tags.phone || tags["contact:phone"])
  const hasWhatsapp = !!(tags["contact:whatsapp"] || tags.whatsapp || tags["contact:mobile"])
  const hasTelegram = !!(tags["contact:telegram"] || tags.telegram)

  if (!hasWebsite) problems.push("no_website")
  if (!hasTelegram) problems.push("no_telegram")
  if (!hasWhatsapp) problems.push("no_whatsapp")
  if (!hasPhone) problems.push("no_phone")
  if (!hasWebsite && !hasTelegram && !hasWhatsapp) problems.push("no_messengers")
  if (hasPhone && !hasWebsite && !hasWhatsapp && !hasTelegram) problems.push("bad_socials")

  return problems
}

function parseElement(el: OsmElement, niche: string, city: string, country: string): Omit<Lead, "id" | "createdAt" | "updatedAt" | "saved" | "tags"> | null {
  if (!el.tags) return null
  const tags = el.tags
  const name = tags.name || tags["name:ru"] || tags.brand
  if (!name) return null // безымянные POI пропускаем

  const phone = normalizePhone(getTag(tags, "phone", "contact:phone", "contact:mobile"))
  const website = getTag(tags, "website", "contact:website", "url")
  const whatsapp = getTag(tags, "contact:whatsapp", "whatsapp")
    ? normalizePhone(getTag(tags, "contact:whatsapp", "whatsapp"))
    : null
  const telegram = getTag(tags, "contact:telegram", "telegram")

  const addressParts = [
    getTag(tags, "addr:street"),
    getTag(tags, "addr:housenumber"),
  ].filter(Boolean)
  const address = addressParts.length > 0 ? addressParts.join(", ") : null

  const problems = detectProblems(tags)
  const score = calculateLeadScore({
    website: website || null,
    telegram: telegram || null,
    whatsapp: whatsapp,
    rating: 0, // у OSM нет рейтингов
    reviewsCount: 0,
    city,
  })

  return {
    companyName: name,
    niche,
    country,
    city,
    address,
    phone,
    whatsapp,
    telegram: telegram ? (telegram.startsWith("@") ? telegram : "@" + telegram) : null,
    website,
    rating: 0,
    reviewsCount: 0,
    problems,
    leadScore: score,
    status: "new",
    source: "OpenStreetMap",
    companyType: "local",
    notes: "",
  }
}

// ============================================================
// Дедупликация и сохранение в БД
// ============================================================

async function saveToDatabase(
  leads: Array<Omit<Lead, "id" | "createdAt" | "updatedAt" | "saved" | "tags">>
): Promise<{ saved: number; duplicates: number }> {
  let saved = 0
  let duplicates = 0
  for (const l of leads) {
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
      continue
    }

    await db.lead.create({
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
    saved++
  }
  return { saved, duplicates }
}

// ============================================================
// Главная функция: searchRealLeads
// ============================================================

export type RealSearchParams = {
  niche: string        // одна ниша (key из NICHES)
  city: string         // название города на русском
  country?: string     // страна (опционально, для дизамбигуации)
  limit?: number       // максимум результатов (default 100)
  saveToDb?: boolean   // сохранять в БД (default true)
  excludeOsmIds?: string[]
}

export type RealSearchResult = {
  found: number
  saved: number
  duplicates: number
  leads: Lead[]
  city: string
  country: string
  bbox: [number, number, number, number] | null
  source: string
  debug: {
    geocoded: boolean
    overpassElements: number
    parsed: number
    mirrorsTried: number
  }
}

export async function searchRealLeads(params: RealSearchParams): Promise<RealSearchResult> {
  const { niche, city, country } = params
  const limit = params.limit ?? 100
  const saveToDb = params.saveToDb !== false

  const filters = NICHE_TO_OSM[niche]
  if (!filters) {
    throw new Error(`Неизвестная ниша: ${niche}`)
  }

  // 1. Геокодируем город → bbox
  const geo = await geocodeCity(city, country)
  if (!geo || !geo.boundingbox) {
    return {
      found: 0,
      saved: 0,
      duplicates: 0,
      leads: [],
      city,
      country: country || "",
      bbox: null,
      source: "OpenStreetMap",
      debug: { geocoded: false, overpassElements: 0, parsed: 0, mirrorsTried: 0 },
    }
  }

  const [s, n, w, e] = geo.boundingbox
  const bbox: [number, number, number, number] = [
    parseFloat(s), parseFloat(w), parseFloat(n), parseFloat(e),
  ]

  // 2. Overpass запрос
  const query = buildOverpassQuery(filters, bbox)
  const elements = await queryOverpass(query)

  // 3. Парсинг
  const detectedCountry = country || ""
  const parsed: Array<Omit<Lead, "id" | "createdAt" | "updatedAt" | "saved" | "tags">> = []
  const seenNames = new Set<string>()

  for (const el of elements) {
    if (params.excludeOsmIds && (params.excludeOsmIds.includes(`node-${el.id}`) || params.excludeOsmIds.includes(el.id.toString()))) {
      continue
    }
    // way → берём center координаты (Overpass out center)
    if (el.type === "way" && !el.lat && (el as { center?: { lat: number; lon: number } }).center) {
      // уже есть center
    }
    const parsedEl = parseElement(el, niche, city, detectedCountry)
    if (!parsedEl) continue
    // Дедуп внутри одного поиска
    const key = `${parsedEl.companyName}|${parsedEl.phone || ""}`
    if (seenNames.has(key)) continue
    seenNames.add(key)
    parsed.push(parsedEl)
    if (parsed.length >= limit) break
  }

  // 4. Сохраняем в БД
  let saved = 0
  let duplicates = 0
  if (saveToDb && parsed.length > 0) {
    const res = await saveToDatabase(parsed)
    saved = res.saved
    duplicates = res.duplicates
  }

  // 5. Получаем сохранённые лиды с id из БД (для фронтенда)
  const savedLeads: Lead[] = []
  if (saveToDb && saved > 0) {
    // Возвращаем последние добавленные
    const rows = await db.lead.findMany({
      where: {
        source: "OpenStreetMap",
        city,
        niche,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    for (const r of rows) {
      savedLeads.push({
        id: r.id,
        companyName: r.companyName,
        niche: r.niche,
        country: r.country,
        city: r.city,
        address: r.address,
        phone: r.phone,
        whatsapp: r.whatsapp,
        telegram: r.telegram,
        website: r.website,
        rating: r.rating,
        reviewsCount: r.reviewsCount,
        problems: JSON.parse(r.problems || "[]"),
        leadScore: r.leadScore,
        status: r.status,
        source: r.source,
        companyType: r.companyType,
        notes: r.notes || "",
        tags: JSON.parse(r.tags || "[]"),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })
    }
  } else {
    // Возвращаем распарсенные без id (фронтенд покажет как «предпросмотр»)
    for (const p of parsed) {
      savedLeads.push({
        id: `preview-${Math.random().toString(36).slice(2)}`,
        ...p,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  return {
    found: parsed.length,
    saved,
    duplicates,
    leads: savedLeads,
    city,
    country: detectedCountry,
    bbox,
    source: "OpenStreetMap",
    debug: {
      geocoded: true,
      overpassElements: elements.length,
      parsed: parsed.length,
      mirrorsTried: 0,
    },
  }
}

// Экспортируем для использования в UI
export const OSM_NICHE_KEYS = Object.keys(NICHE_TO_OSM)
export const OSM_SUPPORTED_NICHES = OSM_NICHE_KEYS.map((k) => ({
  key: k,
  label: getNicheLabel(k),
}))
