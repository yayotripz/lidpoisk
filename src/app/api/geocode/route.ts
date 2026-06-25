import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q") || ""
  if (!q) {
    return NextResponse.json([])
  }

  try {
    const targetUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      q
    )}&limit=8&addressdetails=1&accept-language=ru`
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "LidPoisk/1.2 (lead-search autocomplete server-side)",
        Accept: "application/json",
      },
    })
    if (!res.ok) return NextResponse.json([])
    const arr = await res.json()
    return NextResponse.json(arr)
  } catch (e) {
    console.error("Geocode error", e)
    return NextResponse.json([])
  }
}
