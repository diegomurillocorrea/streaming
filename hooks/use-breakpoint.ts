"use client"

import { useEffect, useState } from "react"

const BREAKPOINTS = {
  mobileMax: 768,
  tabletMax: 1280,
} as const

type Breakpoint = "mobile" | "tablet" | "desktop"

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "mobile"
  const width = window.innerWidth
  if (width <= BREAKPOINTS.mobileMax) return "mobile"
  if (width <= BREAKPOINTS.tabletMax) return "tablet"
  return "desktop"
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("mobile")

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint())
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return breakpoint
}
