import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { mapLead } from "@/lib/leads"

export const dynamic = "force-dynamic"

// GET /api/saved-leads — список сохранённых лидов
export async function GET() {
  try {
    const saved = await db.savedLead.findMany({
      include: { lead: true },
      orderBy: { createdAt: "desc" },
    })

    const leads = saved
      .filter((s) => !!s.lead)
      .map((s) => ({ ...mapLead(s.lead), saved: true }))

    return NextResponse.json({ leads, total: leads.length })
  } catch (e) {
    console.error("[saved-leads] error", e)
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
