import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { parseTags, serializeTags, normalizeTag } from "@/lib/leads"

export const dynamic = "force-dynamic"

// GET /api/leads/[id]/tags — получить теги лида
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lead = await db.lead.findUnique({
      where: { id },
    })
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 })
    }
    return NextResponse.json({ tags: parseTags(lead.tags) })
  } catch (e) {
    console.error("[tags GET] error", e)
    return NextResponse.json({ error: "Ошибка получения тегов" }, { status: 500 })
  }
}

// POST /api/leads/[id]/tags — добавить тег
// Body: { tag: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const rawTag = typeof body.tag === "string" ? body.tag : ""
    const tag = normalizeTag(rawTag)
    if (!tag) {
      return NextResponse.json({ error: "Тег не может быть пустым" }, { status: 400 })
    }
    const lead = await db.lead.findUnique({
      where: { id },
    })
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 })
    }
    const tags = parseTags(lead.tags)
    // Дедупликация (case-insensitive)
    const exists = tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    if (!exists) {
      tags.push(tag)
    }
    if (tags.length > 20) {
      return NextResponse.json({ error: "Максимум 20 тегов" }, { status: 400 })
    }
    await db.lead.update({
      where: { id },
      data: { tags: serializeTags(tags) },
    })
    return NextResponse.json({ tags, added: !exists })
  } catch (e) {
    console.error("[tags POST] error", e)
    return NextResponse.json({ error: "Ошибка добавления тега" }, { status: 500 })
  }
}

// DELETE /api/leads/[id]/tags?tag=... — удалить тег
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(req.url)
    const tagToRemove = normalizeTag(url.searchParams.get("tag") ?? "")
    if (!tagToRemove) {
      return NextResponse.json({ error: "Не указан тег" }, { status: 400 })
    }
    const lead = await db.lead.findUnique({
      where: { id },
    })
    if (!lead) {
      return NextResponse.json({ error: "Лид не найден" }, { status: 404 })
    }
    const tags = parseTags(lead.tags).filter(
      (t) => t.toLowerCase() !== tagToRemove.toLowerCase()
    )
    await db.lead.update({
      where: { id },
      data: { tags: serializeTags(tags) },
    })
    return NextResponse.json({ tags, removed: true })
  } catch (e) {
    console.error("[tags DELETE] error", e)
    return NextResponse.json({ error: "Ошибка удаления тега" }, { status: 500 })
  }
}
