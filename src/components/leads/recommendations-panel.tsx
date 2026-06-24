"use client"

import * as React from "react"
import { MapPin, Flame } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Lead } from "@/lib/leads"
import {
  getNicheIcon,
  getNicheLabel,
  getCountryLabel,
  getProblemLabel,
} from "@/lib/constants"
import { ScoreGauge } from "@/components/leads/score-gauge"

type RecommendationsPanelProps = {
  leads: Lead[]
  onOpenDetail: (lead: Lead) => void
}

// Map problem keys to Lucide icon names (we'll render them as emoji/short labels)
const PROBLEM_ICON_MAP: Record<string, string> = {
  no_website: "🌐",
  no_telegram: "📨",
  no_whatsapp: "💬",
  low_rating: "⭐",
  few_reviews: "📝",
  no_messengers: "📵",
  bad_socials: "🔗",
  bad_maps_card: "🗺️",
}

export function RecommendationsPanel({ leads, onOpenDetail }: RecommendationsPanelProps) {
  // Filter leads with score >= 8 and take top 3
  const hotLeads = React.useMemo(() => {
    return [...leads]
      .filter((l) => l.leadScore >= 8)
      .sort((a, b) => b.leadScore - a.leadScore)
      .slice(0, 3)
  }, [leads])

  // Don't render if no qualifying leads
  if (hotLeads.length === 0) return null

  return (
    <div className="animate-recommendations-in">
      {/* Header */}
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-2.5 py-1">
          <Flame className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Рекомендуемые лиды
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Топ-{hotLeads.length} по скору
        </span>
      </div>

      {/* Cards — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0 scrollbar-thin">
        {hotLeads.map((lead, idx) => (
          <RecommendationCard
            key={lead.id}
            lead={lead}
            index={idx}
            onClick={() => onOpenDetail(lead)}
          />
        ))}
      </div>
    </div>
  )
}

type RecommendationCardProps = {
  lead: Lead
  index: number
  onClick: () => void
}

function RecommendationCard({ lead, index, onClick }: RecommendationCardProps) {
  // Top 3 problems for display
  const displayProblems = lead.problems.slice(0, 3)

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex min-w-[260px] flex-col rounded-xl border bg-card p-3.5 text-left shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-400/40",
        "animate-card-enter",
        "md:min-w-0"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top row: niche icon + company name + score gauge */}
      <div className="flex items-center gap-2.5">
        <ScoreGauge score={lead.leadScore} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{getNicheIcon(lead.niche)}</span>
            <h4 className="truncate text-sm font-semibold text-foreground" title={lead.companyName}>
              {lead.companyName}
            </h4>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">
              {lead.city}, {getCountryLabel(lead.country)}
            </span>
          </div>
        </div>
      </div>

      {/* Niche badge + problem icons */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px] font-medium">
          {getNicheLabel(lead.niche)}
        </Badge>
        {displayProblems.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            title={getProblemLabel(p)}
          >
            <span className="text-[11px]">{PROBLEM_ICON_MAP[p] ?? "⚠️"}</span>
            <span className="hidden sm:inline">{getProblemLabel(p)}</span>
          </span>
        ))}
        {lead.problems.length > 3 && (
          <span className="text-[10px] text-muted-foreground">
            +{lead.problems.length - 3}
          </span>
        )}
      </div>
    </button>
  )
}
