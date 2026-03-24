"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

const THEME_KEY = "theme"

const listeners = new Set<() => void>()

function notifyThemeListeners() {
  listeners.forEach((listener) => listener())
}

function getResolvedTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === "light" || saved === "dark") return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function subscribeTheme(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  const handleStorage = () => onStoreChange()
  window.addEventListener("storage", handleStorage)
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
    window.removeEventListener("storage", handleStorage)
    mq.removeEventListener("change", onStoreChange)
  }
}

function getServerThemeSnapshot() {
  return "light" as const
}

function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return
  if (theme === "dark") {
    document.documentElement.classList.add("dark")
    document.documentElement.classList.remove("light")
    return
  }
  document.documentElement.classList.add("light")
  document.documentElement.classList.remove("dark")
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => getResolvedTheme(),
    getServerThemeSnapshot
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    const next: "light" | "dark" = theme === "light" ? "dark" : "light"
    if (typeof localStorage !== "undefined") localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
    notifyThemeListeners()
  }, [theme])

  return { theme, toggleTheme }
}
