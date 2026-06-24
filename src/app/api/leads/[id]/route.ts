import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  calculateLeadScore,
  detectProblems,
  serializeProblems,
} from "@/lib/leads"
import { NICHES, COUNTRIES, COMPANY_TYPES, DATA_SOURCES } from "@/lib/constants"

export const dynamic = "force-dynamic"

// PATCH /api/leads/:id — редактирование лида
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const existing = await db.lead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 })
    }

    // Собираем обновлённые поля
    const data: Record<string, unknown> = {}

    if (body.companyName !== undefined) {
      const v = String(body.companyName).trim()
      if (!v) return NextResponse.json({ error: "Название не может быть пустым" }, { status: 400 })
      data.companyName = v
    }
    if (body.niche !== undefined) {
      if (!NICHES.some((n) => n.key === body.niche))
        return NextResponse.json({ error: "Недопустимая ниша" }, { status: 400 })
      data.niche = body.niche
    }
    if (body.country !== undefined) {
      if (!COUNTRIES.some((c) => c.key === body.country))
        return NextResponse.json({ error: "Недопустимая страна" }, { status: 400 })
      data.country = body.country
    }
    if (body.city !== undefined) data.city = String(body.city).trim()
    if (body.address !== undefined) data.address = body.address ? String(body.address) : null
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone) : null
    if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp ? String(body.whatsapp) : null
    if (body.telegram !== undefined) data.telegram = body.telegram ? String(body.telegram) : null
    if (body.website !== undefined) data.website = body.website ? String(body.website) : null
    if (body.rating !== undefined) data.rating = Math.max(0, Math.min(5, Number(body.rating) || 0))
    if (body.reviewsCount !== undefined) data.reviewsCount = Math.max(0, Number(body.reviewsCount) || 0)
    if (body.source !== undefined) {
      data.source = DATA_SOURCES.includes(body.source) ? body.source : "Справочник"
    }
    if (body.companyType !== undefined) {
      data.companyType = COMPANY_TYPES.some((t) => t.key === body.companyType)
        ? body.companyType
        : "local"
    }
    if (body.notes !== undefined) data.notes = String(body.notes)

    // Пересчёт проблем и скора при изменении релевантных полей
    const needRecalc = ["website", "telegram", "whatsapp", "rating", "reviewsCount", "city"].some(
      (k) => body[k] !== undefined
    )
    if (needRecalc) {
      const merged = { ...existing, ...data } as typeof existing
      const problems = detectProblems({
        website: merged.website,
        telegram: merged.telegram,
        whatsapp: merged.whatsapp,
        rating: merged.rating,
        reviewsCount: merged.reviewsCount,
        socials: null,
        mapsCard: true,
      })
      data.problems = serializeProblems(problems)
      data.leadScore = calculateLeadScore({
        website: merged.website,
        telegram: merged.telegram,
        whatsapp: merged.whatsapp,
        rating: merged.rating,
        reviewsCount: merged.reviewsCount,
        city: merged.city,
      })
    }

    await db.lead.update({ where: { id }, data })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[leads/:id] PATCH error", e)
    return NextResponse.json({ error: "Не удалось обновить лид" }, { status: 500 })
  }
}

// DELETE /api/leads/:id — удаление лида
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.lead.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[leads/:id] DELETE error", e)
    return NextResponse.json({ error: "Не удалось удалить лид" }, { status: 500 })
  }
}
