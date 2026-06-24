import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/leads/:id/save — сохранить лид в «Мои лиды»
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 })
    }

    // upsert, чтобы не создавать дубль
    const saved = await db.savedLead.upsert({
      where: { leadId: id },
      update: {},
      create: { leadId: id },
    })

    return NextResponse.json({ ok: true, savedId: saved.id })
  } catch (e) {
    console.error("[leads/save] POST error", e)
    return NextResponse.json({ error: "Не удалось сохранить лид" }, { status: 500 })
  }
}

// DELETE /api/leads/:id/save — убрать из сохранённых
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.savedLead.deleteMany({ where: { leadId: id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[leads/save] DELETE error", e)
    return NextResponse.json({ error: "Не удалось убрать из сохранённых" }, { status: 500 })
  }
}
