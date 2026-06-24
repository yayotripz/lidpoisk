import { NextRequest, NextResponse } from "next/server"
import { searchRealLeads } from "@/lib/osm-search"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// POST /api/real-search
// Принимает: { niche: string, city: string, country?: string, limit?: number, saveToDb?: boolean }
// Возвращает: { found, saved, duplicates, leads, city, country, source, debug }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const niche = typeof body.niche === "string" ? body.niche : ""
    const city = typeof body.city === "string" ? body.city.trim() : ""
    const country = typeof body.country === "string" ? body.country.trim() : undefined
    const limit = Math.min(200, Math.max(10, Number(body.limit) || 100))
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

    const result = await searchRealLeads({ niche, city, country, limit, saveToDb })

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (e) {
    console.error("[real-search] error:", e)
    return NextResponse.json(
      { error: (e as Error).message || "Ошибка поиска" },
      { status: 500 }
    )
  }
}

// GET — для теста через браузер
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const niche = url.searchParams.get("niche") || "restaurants"
  const city = url.searchParams.get("city") || "Москва"
  const country = url.searchParams.get("country") || undefined
  const limit = Math.min(50, Math.max(5, Number(url.searchParams.get("limit")) || 20))
  try {
    const result = await searchRealLeads({ niche, city, country, limit, saveToDb: false })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
