"use client"

import { create } from "zustand"

export type FiltersState = {
  niche: string[]
  countries: string[]
  cities: string[]
  problems: string[]
  companyType: string
  page: number
  query: string
}

export type SortKey = "score" | "rating" | "reviews" | "name" | "newest"

type LeadsStore = {
  filters: FiltersState
  setFilter: <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => void
  toggleArray: (key: "niche" | "countries" | "cities" | "problems", value: string) => void
  resetFilters: () => void
  setFilters: (filters: FiltersState) => void
  setPage: (page: number) => void
  setQuery: (query: string) => void
  sort: SortKey
  setSort: (sort: SortKey) => void
  // UI tabs
  activeTab: "all" | "saved"
  setActiveTab: (tab: "all" | "saved") => void
  // UI view
  view: "list" | "dashboard"
  setView: (view: "list" | "dashboard") => void
  // UI admin panel
  adminOpen: boolean
  setAdminOpen: (open: boolean) => void
}

const DEFAULT_FILTERS: FiltersState = {
  niche: [],
  countries: [],
  cities: [],
  problems: [],
  companyType: "any",
  page: 1,
  query: "",
}

export const useLeadsStore = create<LeadsStore>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value, ...(key !== "page" ? { page: 1 } : {}) },
    })),
  toggleArray: (key, value) =>
    set((state) => {
      const arr = state.filters[key]
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value]
      return {
        filters: { ...state.filters, [key]: next, page: 1 },
      }
    }),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  setFilters: (filters) => set({ filters }),
  setQuery: (query) =>
    set((state) => ({ filters: { ...state.filters, query, page: 1 } })),
  setPage: (page) =>
    set((state) => ({ filters: { ...state.filters, page } })),
  sort: "score",
  setSort: (sort) =>
    set((state) => ({ sort, filters: { ...state.filters, page: 1 } })),
  activeTab: "all",
  setActiveTab: (activeTab) => set({ activeTab }),
  view: "list",
  setView: (view) => set({ view }),
  adminOpen: false,
  setAdminOpen: (adminOpen) => set({ adminOpen }),
}))
