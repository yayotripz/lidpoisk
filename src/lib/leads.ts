import { PROBLEMS, BIG_CITIES } from "./constants"

// Тип лида (на стороне клиента и API)
export type Lead = {
  id: string
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
  problems: string[] // ключи проблем
  leadScore: number
  status: string
  source: string
  companyType: string
  notes: string
  tags: string[] // пользовательские теги
  createdAt: string
  updatedAt: string
  saved?: boolean
}

export type SearchFilters = {
  niche: string[]
  countries: string[]
  cities: string[]
  problems: string[]
  companyType: string
  page?: number
  query?: string
}

// Рассчёт скоринга лида по правилам ТЗ:
// +3 нет сайта, +3 нет telegram, +2 нет whatsapp,
// +1 рейтинг > 4.2, +1 много отзывов (>50), +1 крупный город
export function calculateLeadScore(params: {
  website: string | null
  telegram: string | null
  whatsapp: string | null
  rating: number
  reviewsCount: number
  city: string
}): number {
  let score = 0
  if (!params.website) score += 3
  if (!params.telegram) score += 3
  if (!params.whatsapp) score += 2
  if (params.rating > 4.2) score += 1
  if (params.reviewsCount > 50) score += 1
  if (BIG_CITIES.has(params.city)) score += 1
  return score
}

// Определение списка проблем по данным компании
export function detectProblems(params: {
  website: string | null
  telegram: string | null
  whatsapp: string | null
  rating: number
  reviewsCount: number
  socials?: string | null
  mapsCard?: boolean
}): string[] {
  const problems: string[] = []
  if (!params.website) problems.push("no_website")
  if (!params.telegram) problems.push("no_telegram")
  if (!params.whatsapp) problems.push("no_whatsapp")
  if (params.reviewsCount < 10) problems.push("few_reviews")
  if (params.rating > 0 && params.rating < 3.8) problems.push("low_rating")
  if (!params.socials) problems.push("bad_socials")
  if (params.mapsCard === false) problems.push("bad_maps_card")
  if (!params.whatsapp && !params.telegram) problems.push("no_messengers")
  return problems
}

export function problemScoreSum(problems: string[]): number {
  return problems.reduce((sum, key) => {
    const p = PROBLEMS.find((p) => p.key === key)
    return sum + (p?.score ?? 0)
  }, 0)
}

// Нормализация телефона в формат wa.me (только цифры, ведущий + для tel:)
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 6) return null
  return digits
}

export function telHref(phone: string | null): string | null {
  const d = normalizePhone(phone)
  return d ? `tel:+${d}` : null
}

export function whatsappHref(phone: string | null, wa: string | null): string | null {
  // Если есть прямая wa-ссылка — используем её, иначе формируем по номеру
  if (wa) return wa
  const d = normalizePhone(phone)
  return d ? `https://wa.me/${d}` : null
}

export function telegramHref(tg: string | null): string | null {
  if (!tg) return null
  if (tg.startsWith("http")) return tg
  if (tg.startsWith("@")) return `https://t.me/${tg.slice(1)}`
  return `https://t.me/${tg}`
}

// Парсинг JSON-поля problems (String -> string[])
export function parseProblems(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export function serializeProblems(arr: string[]): string {
  return JSON.stringify(arr)
}

// Парсинг JSON-поля tags (String -> string[])
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((t) => typeof t === "string" && t.length > 0) : []
  } catch {
    return []
  }
}

export function serializeTags(arr: string[]): string {
  return JSON.stringify(arr.slice(0, 20)) // максимум 20 тегов
}

// Нормализация тега: trim, lowercase первая буква, удаление спецсимволов
export function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ").slice(0, 30)
}

// Маппинг строки БД -> объект Lead
export function mapLead(row: {
  id: string
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
  problems: string
  leadScore: number
  status: string
  source: string
  companyType: string
  notes?: string | null
  tags?: string | null
  createdAt: Date
  updatedAt: Date
}): Lead {
  return {
    id: row.id,
    companyName: row.companyName,
    niche: row.niche,
    country: row.country,
    city: row.city,
    address: row.address,
    phone: row.phone,
    whatsapp: row.whatsapp,
    telegram: row.telegram,
    website: row.website,
    rating: row.rating,
    reviewsCount: row.reviewsCount,
    problems: parseProblems(row.problems),
    leadScore: row.leadScore,
    status: row.status,
    source: row.source,
    companyType: row.companyType,
    notes: row.notes ?? "",
    tags: parseTags(row.tags ?? "[]"),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
