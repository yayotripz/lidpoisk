import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/activity — данные для календаря активности
// Возвращает массив { date: "YYYY-MM-DD", count: number } за последние 119 дней (17 недель)
export async function GET() {
  try {
    // Группируем лиды по дате createdAt
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - 118) // 17 недель
    startDate.setHours(0, 0, 0, 0)

    // Получаем все лиды за период
    const leads = await db.lead.findMany({
      where: {
        createdAt: { gte: startDate, lte: today },
      },
      select: { createdAt: true },
    })

    // Группируем по дате
    const byDate = new Map<string, number>()
    for (const lead of leads) {
      const iso = lead.createdAt.toISOString().slice(0, 10)
      byDate.set(iso, (byDate.get(iso) ?? 0) + 1)
    }

    // Также добавляем поисковую активность
    const searches = await db.search.findMany({
      where: {
        createdAt: { gte: startDate, lte: today },
      },
      select: { createdAt: true },
    })
    for (const s of searches) {
      const iso = s.createdAt.toISOString().slice(0, 10)
      byDate.set(iso, (byDate.get(iso) ?? 0) + 1)
    }

    // Сохранённые лиды
    const savedLeads = await db.savedLead.findMany({
      where: {
        createdAt: { gte: startDate, lte: today },
      },
      select: { createdAt: true },
    })
    for (const s of savedLeads) {
      const iso = s.createdAt.toISOString().slice(0, 10)
      byDate.set(iso, (byDate.get(iso) ?? 0) + 1)
    }

    // Формируем массив за весь период
    const result: { date: string; count: number }[] = []
    const cursor = new Date(startDate)
    while (cursor <= today) {
      const iso = cursor.toISOString().slice(0, 10)
      result.push({ date: iso, count: byDate.get(iso) ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    return NextResponse.json({
      data: result,
      totalActivity: result.reduce((sum, d) => sum + d.count, 0),
      activeDays: result.filter((d) => d.count > 0).length,
      maxCount: result.reduce((max, d) => Math.max(max, d.count), 0),
    })
  } catch (e) {
    console.error("[activity] error", e)
    return NextResponse.json({ error: "Ошибка получения активности" }, { status: 500 })
  }
}
