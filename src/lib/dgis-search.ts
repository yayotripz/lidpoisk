// 2GIS Catalog API integration
// Docs: https://docs.2gis.com/ru/api/search/catalog
// Бесплатно до 5000 запросов/день, нужен ключ DGIS_API_KEY в .env
//
// Логика:
// 1. Геокодируем город через 2GIS Catalog (type=city, q=<город>) → получаем city_id
// 2. Ищем компании в этом городе по запросу (q=<категория+ключевые слова>)
// 3. Нормализуем результат в ParsedLead-совместимый формат

import {
  calculateLeadScore,
  detectProblems,
  type Lead,
} from "./leads"

const UA = "LidPoisk/1.2 (lead-search; 2gis) z.ai/2026"

// ============================================================
// Маппинг ниш → ключевые слова для 2GIS (текстовые запросы)
// ============================================================

const NICHE_TO_DGIS_KEYWORDS: Record<string, string[]> = {
  restaurants: ["ресторан", "кафе", "столовая"],
  dentistry: ["стоматология", "стоматологическая клиника", "зубной врач"],
  beauty: ["салон красоты", "парикмахерская", "барбершоп"],
  auto_repair: ["автосервис", "автомастерская", "шиномонтаж"],
  cleaning: ["клининг", "уборка помещений", "химчистка"],
  fitness: ["фитнес клуб", "спортзал", "тренажерный зал"],
  veterinary: ["ветеринарная клиника", "ветпомощь"],
  legal: ["юридическая компания", "адвокат"],
  real_estate: ["агентство недвижимости", "риелтор"],
  florists: ["цветы", "цветочный магазин"],
  repair_shoes: ["ремонт обуви"],
  repair_clothes: ["ателье", "ремонт одежды"],
  building_repair: ["ремонт квартир", "строительная компания"],
  pharmacies: ["аптека"],
}

// ============================================================
// Типы
// ============================================================

type DgisItem = {
  id: string
  name: string
  full_name?: string
  type?: string
  description?: string
  address?: { components?: Array<{ type: string; label?: string }> }
  address_name?: string
  contact_groups?: Array<{
    contacts: Array<{
      type: string
      value: string
      comment?: string
    }>
  }>
  rating?: number
  reviews_count?: number
  point?: { lat: number; lon: number }
}

type ParsedLeadDgis = {
  _osmId: string
  _source: "dgis"
  companyName: string
  niche: string
  country: string
  city: string
  address: string | null
  phone: string | null
  whatsapp: string | null
  telegram: string | null
  website: string | null
  rating: number
  reviewsCount: number
  problems: string[]
  leadScore: number
  status: string
  source: string
  companyType: string
  notes: string
}

// ============================================================
// Геокодинг города → city_id
// ============================================================

async function dgisGeocodeCity(city: string, country?: string): Promise<string | null> {
  const key = process.env.DGIS_API_KEY
  if (!key) return null

  const q = country ? `${city}, ${country}` : city
  const url = new URL("https://catalog.api.2gis.ru/3.0/items")
  url.searchParams.set("q", q)
  url.searchParams.set("type", "city")
  url.searchParams.set("key", key)
  url.searchParams.set("locale", "ru")
  url.searchParams.set("fields", "items.id,items.name,items.full_name,items.type")
  url.searchParams.set("limit", "5")

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const items = data?.result?.items ?? []
    if (items.length === 0) return null
    return items[0].id as string
  } catch {
    return null
  }
}

// ============================================================
// Поиск компаний
// ============================================================

async function dgisSearchItems(
  cityId: string,
  query: string,
  limit: number
): Promise<DgisItem[]> {
  const key = process.env.DGIS_API_KEY
  if (!key) return []

  const url = new URL("https://catalog.api.2gis.ru/3.0/items")
  url.searchParams.set("q", query)
  url.searchParams.set("city_id", cityId)
  url.searchParams.set("key", key)
  url.searchParams.set("locale", "ru")
  url.searchParams.set("sort", "rating")
  url.searchParams.set("fields", [
    "items.id",
    "items.name",
    "items.full_name",
    "items.type",
    "items.description",
    "items.address",
    "items.address_name",
    "items.contact_groups",
    "items.rating",
    "items.reviews_count",
    "items.point",
  ].join(","))
  url.searchParams.set("limit", String(Math.min(50, limit * 2)))

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    throw new Error(`2GIS HTTP ${res.status}`)
  }
  const data = await res.json()
  return (data?.result?.items ?? []) as DgisItem[]
}

// ============================================================
// Парсинг одного элемента → ParsedLeadDgis
// ============================================================

function parseDgisItem(
  item: DgisItem,
  niche: string,
  city: string,
  country: string
): ParsedLeadDgis | null {
  const companyName = (item.name || item.full_name || "").trim()
  if (!companyName) return null

  let address: string | null = null
  if (item.address_name) {
    address = item.address_name
  } else if (item.address?.components) {
    address = item.address.components
      .map((c) => c.label || "")
      .filter(Boolean)
      .join(", ") || null
  }

  let phone: string | null = null
  let whatsapp: string | null = null
  let telegram: string | null = null
  let website: string | null = null
  const groups = item.contact_groups ?? []
  for (const g of groups) {
    for (const c of g.contacts ?? []) {
      const v = (c.value || "").trim()
      if (!v) continue
      if (c.type === "phone" && !phone) phone = v
      else if (c.type === "website" && !website) {
        website = v.startsWith("http") ? v : `https://${v}`
      }
      else if (c.type === "telegram" && !telegram) {
        telegram = v.startsWith("@") || v.startsWith("http") ? v : `@${v}`
      }
      else if (c.type === "whatsapp" && !whatsapp) {
        whatsapp = v.startsWith("http") ? v : `https://wa.me/${v.replace(/\D/g, "")}`
      }
    }
  }

  const rating = typeof item.rating === "number" ? Math.min(5, Math.max(0, item.rating)) : 0
  const reviewsCount = typeof item.reviews_count === "number" ? item.reviews_count : 0

  const problems = detectProblems({
    website,
    telegram,
    whatsapp,
    rating,
    reviewsCount,
    socials: null,
    mapsCard: true,
  })
  const leadScore = calculateLeadScore({
    website,
    telegram,
    whatsapp,
    rating,
    reviewsCount,
    city,
  })

  return {
    _osmId: `dgis-${item.id}`,
    _source: "dgis",
    companyName,
    niche,
    country,
    city,
    address,
    phone,
    whatsapp,
    telegram,
    website,
    rating,
    reviewsCount,
    problems,
    leadScore,
    status: "new",
    source: "2GIS",
    companyType: "local",
    notes: "",
  }
}

// ============================================================
// Главная функция
// ============================================================

export type DgisSearchParams = {
  niche: string
  city: string
  country?: string
  limit?: number
}

export type DgisSearchResult = {
  found: number
  cityId: string | null
  leads: ParsedLeadDgis[]
  error?: string
}

export async function searchDgis(
  params: DgisSearchParams
): Promise<DgisSearchResult> {
  const key = process.env.DGIS_API_KEY
  if (!key) {
    return { found: 0, cityId: null, leads: [], error: "DGIS_API_KEY not set" }
  }

  const { niche, city } = params
  const country = params.country
  const limit = params.limit ?? 100

  const keywords = NICHE_TO_DGIS_KEYWORDS[niche]
  if (!keywords) {
    return { found: 0, cityId: null, leads: [], error: `niche ${niche} not supported` }
  }

  const cityId = await dgisGeocodeCity(city, country)
  if (!cityId) {
    return { found: 0, cityId: null, leads: [], error: `city not found in 2GIS: ${city}` }
  }

  const seen = new Set<string>()
  const allParsed: ParsedLeadDgis[] = []

  for (const kw of keywords) {
    try {
      const items = await dgisSearchItems(cityId, kw, limit)
      for (const item of items) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        const p = parseDgisItem(item, niche, city, country || "")
        if (p) allParsed.push(p)
      }
      if (allParsed.length >= limit * 2) break
    } catch (e) {
      console.error(`[2gis] search "${kw}" error:`, (e as Error).message)
    }
  }

  allParsed.sort((a, b) => {
    if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore
    return b.rating - a.rating
  })
  const slice = allParsed.slice(0, limit)

  return {
    found: slice.length,
    cityId,
    leads: slice,
  }
}

export function dgisLeadToLead(p: ParsedLeadDgis, idx: number): Lead {
  return {
    id: `dgis-${p._osmId}-${idx}`,
    companyName: p.companyName,
    niche: p.niche,
    country: p.country,
    city: p.city,
    address: p.address,
    phone: p.phone,
    whatsapp: p.whatsapp,
    telegram: p.telegram,
    website: p.website,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    problems: p.problems,
    leadScore: p.leadScore,
    status: p.status,
    source: p.source,
    companyType: p.companyType,
    notes: p.notes,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function isDgisConfigured(): boolean {
  return !!process.env.DGIS_API_KEY
}
