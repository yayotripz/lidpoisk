import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/searches — история поисков (последние 20)
export async function GET() {
  try {
    const rows = await db.search.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    const searches = rows.map((r) => ({
      id: r.id,
      niche: safeParse(r.niche),
      countries: safeParse(r.countries),
      cities: safeParse(r.cities),
      selectedProblems: safeParse(r.selectedProblems),
      companyType: r.companyType,
      resultCount: r.resultCount,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json({ searches, total: searches.length })
  } catch (e) {
    console.error("[searches] error", e)
    return NextResponse.json({ error: "Ошибка" }, { status: 500 })
  }
}

function safeParse(s: string | null): string[] {
  if (!s) return []
  try {
    const arr = JSON.parse(s)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
