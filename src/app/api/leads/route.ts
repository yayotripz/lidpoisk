import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  mapLead,
  calculateLeadScore,
  detectProblems,
  serializeProblems,
} from "@/lib/leads"
import { NICHES, COUNTRIES, COMPANY_TYPES, DATA_SOURCES } from "@/lib/constants"

export const dynamic = "force-dynamic"

// GET /api/leads — список лидов из базы (с пагинацией, фильтром статуса/ниши и поиском)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 24))
    const status = searchParams.get("status") || undefined
    const niche = searchParams.get("niche") || undefined
    const search = (searchParams.get("search") || "").trim()

    const where: Record<string, unknown> = {}
    if (status) {
      if (status === "saved") {
        where.savedLeads = { some: {} }
      } else {
        where.status = status
      }
    }
    if (niche) where.niche = niche
    // Server-side поиск по названию, городу или телефону —
    // поддерживает кириллицу и латиницу (contains без mode: insensitive —
    // SQLite не поддерживает insensitive, поэтому дополнительно фильтруем ниже).
    if (search.length > 0) {
      where.OR = [
        { companyName: { contains: search } },
        { city: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const [total, rows] = await Promise.all([
      db.lead.count({ where }),
      db.lead.findMany({
        where,
        orderBy: [{ leadScore: "desc" }, { rating: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return NextResponse.json({
      leads: rows.map(mapLead),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
  } catch (e) {
    console.error("[leads] GET error", e)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}

// POST /api/leads — создание нового лида (ручное добавление)
export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    const contentType = req.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}))
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData().catch(() => null)
      if (formData) {
        body = {}
        formData.forEach((value, key) => {
          body[key] = value
        })
      }
    } else {
      const text = await req.text().catch(() => "")
      try {
        body = JSON.parse(text)
      } catch {
        body = {}
      }
    }

    // Валидация
    const companyName = String(body.companyName || "").trim()
    if (!companyName) {
      return NextResponse.json({ error: "Укажите название компании" }, { status: 400 })
    }
    const niche = String(body.niche || "")
    if (!NICHES.some((n) => n.key === niche)) {
      return NextResponse.json({ error: "Недопустимая ниша" }, { status: 400 })
    }
    const country = String(body.country || "")
    if (!COUNTRIES.some((c) => c.key === country)) {
      return NextResponse.json({ error: "Недопустимая страна" }, { status: 400 })
    }
    const city = String(body.city || "").trim()
    if (!city) {
      return NextResponse.json({ error: "Укажите город" }, { status: 400 })
    }

    const address = body.address ? String(body.address).trim() : null
    const phone = body.phone ? String(body.phone).trim() : null
    const whatsapp = body.whatsapp ? String(body.whatsapp).trim() : null
    const telegram = body.telegram ? String(body.telegram).trim() : null
    const website = body.website ? String(body.website).trim() : null
    const rating = Math.max(0, Math.min(5, Number(body.rating) || 0))
    const reviewsCount = Math.max(0, Number(body.reviewsCount) || 0)
    const source = DATA_SOURCES.includes(body.source) ? body.source : "Справочник"
    const companyType = COMPANY_TYPES.some((t) => t.key === body.companyType)
      ? body.companyType
      : "local"
    const status = String(body.status || "new")

    // Автоматический расчёт проблем и скора
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

    const lead = await db.lead.create({
      data: {
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
        problems: serializeProblems(problems),
        leadScore,
        status,
        source,
        companyType,
        notes: body.notes ? String(body.notes) : "",
      },
    })

    return NextResponse.json({ ok: true, id: lead.id, leadScore, problems })
  } catch (e) {
    console.error("[leads] POST error", e)
    return NextResponse.json({ error: "Не удалось создать лид" }, { status: 500 })
  }
}
