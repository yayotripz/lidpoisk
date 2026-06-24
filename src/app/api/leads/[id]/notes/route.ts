import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/leads/:id/notes — список заметок по лиду
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const notes = await db.leadNote.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        text: n.text,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    console.error("[notes] GET error", e)
    return NextResponse.json({ error: "Ошибка" }, { status: 500 })
  }
}

// POST /api/leads/:id/notes — добавить заметку
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const text = String(body.text || "").trim()
    if (!text) {
      return NextResponse.json({ error: "Текст заметки обязателен" }, { status: 400 })
    }

    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 })
    }

    const note = await db.leadNote.create({
      data: { leadId: id, text },
    })

    return NextResponse.json({
      ok: true,
      note: {
        id: note.id,
        text: note.text,
        createdAt: note.createdAt.toISOString(),
      },
    })
  } catch (e) {
    console.error("[notes] POST error", e)
    return NextResponse.json({ error: "Не удалось добавить заметку" }, { status: 500 })
  }
}

// DELETE /api/leads/:id/notes?noteId=... — удалить заметку
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const noteId = searchParams.get("noteId")
    if (!noteId) {
      return NextResponse.json({ error: "Укажите noteId" }, { status: 400 })
    }
    await db.leadNote.deleteMany({ where: { id: noteId, leadId: id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[notes] DELETE error", e)
    return NextResponse.json({ error: "Не удалось удалить заметку" }, { status: 500 })
  }
}
