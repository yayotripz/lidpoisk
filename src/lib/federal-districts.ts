// Федеральные округа России — для географической группировки городов
// Источник: официальное деление РФ на 8 федеральных округов

export type FederalDistrict = {
  key: string
  label: string
  short: string
  emoji: string
  color: string // hex-цвет для графиков
}

export const FEDERAL_DISTRICTS: FederalDistrict[] = [
  { key: "cfo", label: "Центральный ФО", short: "ЦФО", emoji: "🏛️", color: "#10b981" },
  { key: "szfo", label: "Северо-Западный ФО", short: "СЗФО", emoji: "⚓", color: "#06b6d4" },
  { key: "yufo", label: "Южный ФО", short: "ЮФО", emoji: "☀️", color: "#f59e0b" },
  { key: "skfo", label: "Северо-Кавказский ФО", short: "СКФО", emoji: "🏔️", color: "#ef4444" },
  { key: "pfo", label: "Приволжский ФО", short: "ПФО", emoji: "🚢", color: "#8b5cf6" },
  { key: "urfo", label: "Уральский ФО", short: "УрФО", emoji: "⛏️", color: "#f97316" },
  { key: "sfo", label: "Сибирский ФО", short: "СФО", emoji: "🌲", color: "#0ea5e9" },
  { key: "dvfo", label: "Дальневосточный ФО", short: "ДВФО", emoji: "🌊", color: "#14b8a6" },
  { key: "foreign", label: "Другие страны", short: "СНГ", emoji: "🌍", color: "#a78bfa" },
]

// Маппинг регионов РФ (по суффиксу/названию) → федеральный округ
const REGION_TO_DISTRICT: { pattern: RegExp; district: string }[] = [
  // ЦФО
  { pattern: /Москва|Московская/i, district: "cfo" },
  { pattern: /Воронежская|Ярославская|Рязанская|Липецкая|Тульская|Курская|Ивановская|Брянская|Белгородская|Владимирская|Калужская|Орловская|Смоленская|Тверская|Тамбовская|Костромская/i, district: "cfo" },
  // СЗФО
  { pattern: /Санкт-Петербург|Ленинградская/i, district: "szfo" },
  { pattern: /Калининградская|Архангельская|Вологодская|Мурманская|Новгородская|Псковская|Карелия|Коми|Ненецкого/i, district: "szfo" },
  // ЮФО
  { pattern: /Краснодарский|Ростовская|Волгоградская|Астраханская|Севастополь|Крым|Республика Адygея|Адыгея|Калмыкия/i, district: "yufo" },
  // СКФО
  { pattern: /Дагестан|Чеченская|Ингушская|Северная Осетия|Кабардино-Балкарская|Карачаево-Черкесская|Ставропольский/i, district: "skfo" },
  // ПФО
  { pattern: /Нижегородская|Кировская|Самарская|Оренбургская|Пензенская|Пермский|Саратовская|Ульяновская|Чувашская|Мордовия|Татарстан|Марий Эл|Удмуртская|Башкортостан/i, district: "pfo" },
  // УрФО
  { pattern: /Свердловская|Челябинская|Тюменская|Курганская|Ханты-Мансийского|Ямало-Ненецкого/i, district: "urfo" },
  // СФО
  { pattern: /Алтайский|Красноярский|Иркутская|Кемеровская|Новосибирская|Омская|Томская|Забайкальский|Хакасия|Тыва|Бурятия|Алтай Республика/i, district: "sfo" },
  // ДВФО
  { pattern: /Приморский|Хабаровский|Амурская|Камчатский|Магаданская|Сахалинская|Якутия|Еврейская|Чукотского/i, district: "dvfo" },
]

// Получить федеральный округ по названию региона
export function getDistrictByRegion(region: string | undefined): string {
  if (!region) return "foreign"
  for (const entry of REGION_TO_DISTRICT) {
    if (entry.pattern.test(region)) return entry.district
  }
  return "foreign"
}

// Получить федеральный округ по городу России
// Использует таблицу RUSSIA_CITIES_WITH_REGION из constants.ts
export function getDistrictByCity(city: string, country: string, region?: string): string {
  if (country !== "RU" && country !== "Россия") return "foreign"
  // Если регион уже передан — используем его
  if (region) {
    const d = getDistrictByRegion(region)
    return d
  }
  return "foreign"
}

export function getDistrictLabel(key: string): string {
  return FEDERAL_DISTRICTS.find((d) => d.key === key)?.label ?? key
}

export function getDistrictShort(key: string): string {
  return FEDERAL_DISTRICTS.find((d) => d.key === key)?.short ?? key
}

export function getDistrictColor(key: string): string {
  return FEDERAL_DISTRICTS.find((d) => d.key === key)?.color ?? "#a78bfa"
}

export function getDistrictEmoji(key: string): string {
  return FEDERAL_DISTRICTS.find((d) => d.key === key)?.emoji ?? "🌍"
}
