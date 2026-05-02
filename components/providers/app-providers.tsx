"use client"

import type { ReactNode } from "react"

import { AdminPeriodProvider } from "@/components/providers/admin-period-provider"

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return <AdminPeriodProvider>{children}</AdminPeriodProvider>
}
