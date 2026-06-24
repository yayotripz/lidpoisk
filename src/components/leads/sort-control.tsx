"use client"

import * as React from "react"
import { ArrowUpDown, TrendingUp, Star, Users, Clock, ArrowDownAZ } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SortKey = "score" | "rating" | "reviews" | "name" | "newest"

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "score", label: "По перспективности", icon: <TrendingUp className="size-3.5" /> },
  { key: "rating", label: "По рейтингу", icon: <Star className="size-3.5" /> },
  { key: "reviews", label: "По отзывам", icon: <Users className="size-3.5" /> },
  { key: "name", label: "По названию (А-Я)", icon: <ArrowDownAZ className="size-3.5" /> },
  { key: "newest", label: "Сначала новые", icon: <Clock className="size-3.5" /> },
]

export function SortControl({
  value,
  onChange,
}: {
  value: SortKey
  onChange: (v: SortKey) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger className="h-8 w-[180px] gap-1.5 text-xs">
        <ArrowUpDown className="size-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.key} value={o.key} className="text-xs">
            <span className="flex items-center gap-1.5">
              {o.icon}
            </span>
            <span className="ml-1.5">{o.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
