import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { LEAD_STATUSES } from "@/lib/constants"

export const dynamic = "force-dynamic"

// PATCH /api/leads/:id/status — меняет статус лида
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const status = String(body.status || "")

    const valid = LEAD_STATUSES.some((s) => s.key === status)
    if (!valid) {
      return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 })
    }

    const updated = await db.lead.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ ok: true, status: updated.status })
  } catch (e) {
    console.error("[leads/status] error", e)
    return NextResponse.json({ error: "Не удалось обновить статус" }, { status: 500 })
  }
}
