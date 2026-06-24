import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/admin/dedup — поиск и удаление дублей лидов
// Дубли: совпадение по нормализованному телефону + названию (case-insensitive)
// Возвращает найденные группы дублей и количество удалённых
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const dryRun = body.dryRun !== false // по умолчанию только анализ

    const allLeads = await db.lead.findMany({
      select: {
        id: true,
        companyName: true,
        phone: true,
        city: true,
        niche: true,
        leadScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    // Нормализация для сравнения
    const normName = (s: string) => s.toLowerCase().replace(/[^a-zа-я0-9]/gi, "")
    const normPhone = (s: string | null) => (s ? s.replace(/\D/g, "").slice(-10) : "")

    // Группировка по ключу (name + phone)
    const groups = new Map<string, typeof allLeads>()
    for (const lead of allLeads) {
      const key = `${normName(lead.companyName)}|${normPhone(lead.phone)}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(lead)
    }

    // Оставляем только группы с дублями (>1 записи)
    const duplicateGroups: {
      key: string
      keep: { id: string; companyName: string; phone: string | null; city: string }
      remove: { id: string; companyName: string; phone: string | null; city: string }[]
    }[] = []

    const idsToRemove: string[] = []

    for (const [, group] of groups) {
      if (group.length <= 1) continue
      // Сортируем: оставляем с наибольшим скором, удаляем остальные
      const sorted = [...group].sort((a, b) => b.leadScore - a.leadScore)
      const keep = sorted[0]
      const remove = sorted.slice(1)
      duplicateGroups.push({
        key: `${keep.companyName} (${keep.phone})`,
        keep: {
          id: keep.id,
          companyName: keep.companyName,
          phone: keep.phone,
          city: keep.city,
        },
        remove: remove.map((r) => ({
          id: r.id,
          companyName: r.companyName,
          phone: r.phone,
          city: r.city,
        })),
      })
      idsToRemove.push(...remove.map((r) => r.id))
    }

    if (!dryRun && idsToRemove.length > 0) {
      await db.lead.deleteMany({ where: { id: { in: idsToRemove } } })
    }

    return NextResponse.json({
      duplicateGroups,
      totalDuplicates: idsToRemove.length,
      groupsCount: duplicateGroups.length,
      action: dryRun ? "analysis" : "deleted",
      deleted: dryRun ? 0 : idsToRemove.length,
    })
  } catch (e) {
    console.error("[admin/dedup] error", e)
    return NextResponse.json({ error: "Ошибка дедупликации" }, { status: 500 })
  }
}
