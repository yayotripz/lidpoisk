import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/leads/bulk-save — массовое сохранение лидов
// Принимает: { ids: string[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []

    if (ids.length === 0) {
      return NextResponse.json({ error: "Не выбраны лиды" }, { status: 400 })
    }

    // Проверяем существование лидов
    const leads = await db.lead.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    // Создаём записи SavedLead для тех, кого ещё нет
    const existing = await db.savedLead.findMany({
      where: { leadId: { in: ids } },
      select: { leadId: true },
    })
    const existingSet = new Set(existing.map((e) => e.leadId))
    const toCreate = leads.filter((l) => !existingSet.has(l.id))

    if (toCreate.length > 0) {
      await db.savedLead.createMany({
        data: toCreate.map((l) => ({ leadId: l.id })),
      })
    }

    return NextResponse.json({
      ok: true,
      saved: toCreate.length,
      alreadySaved: leads.length - toCreate.length,
    })
  } catch (e) {
    console.error("[bulk-save] error", e)
    return NextResponse.json({ error: "Ошибка массового сохранения" }, { status: 500 })
  }
}
