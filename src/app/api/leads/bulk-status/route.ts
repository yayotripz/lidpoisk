import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { LEAD_STATUSES } from "@/lib/constants"

export const dynamic = "force-dynamic"

// POST /api/leads/bulk-status — массовая смена статуса
// Принимает: { ids: string[], status: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []
    const status = String(body.status || "")

    if (ids.length === 0) {
      return NextResponse.json({ error: "Не выбраны лиды" }, { status: 400 })
    }
    if (!LEAD_STATUSES.some((s) => s.key === status)) {
      return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 })
    }

    const result = await db.lead.updateMany({
      where: { id: { in: ids } },
      data: { status },
    })

    return NextResponse.json({ ok: true, updated: result.count })
  } catch (e) {
    console.error("[bulk-status] error", e)
    return NextResponse.json({ error: "Ошибка массового обновления" }, { status: 500 })
  }
}
