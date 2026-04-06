"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Footer } from "@/components/footer"
import { useBreakpoint } from "@/hooks/use-breakpoint"
import { useTheme } from "@/hooks/use-theme"
import { createClient } from "@/lib/supabase/client"

const NAV_ITEMS = [
  { href: "/administration", label: "Dashboard" },
  { href: "/administration/monthly-finance", label: "Finanzas del mes" },
  { href: "/administration/accounts", label: "Cuentas" },
  { href: "/administration/clients", label: "Clientes" },
  { href: "/administration/companies", label: "Empresas" },
  { href: "/administration/cards", label: "Tarjetas" },
  { href: "/administration/emails", label: "Correos" },
  { href: "/administration/bank-accounts", label: "Cuentas bancarias" },
]

function useUserName() {
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setUserName(null)
        return
      }

      const metadata = user.user_metadata ?? {}
      setUserName(metadata.full_name ?? metadata.name ?? user.email ?? "Usuario")
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (!user) {
        setUserName(null)
        return
      }

      const metadata = user.user_metadata ?? {}
      setUserName(metadata.full_name ?? metadata.name ?? user.email ?? "Usuario")
    })

    return () => subscription.unsubscribe()
  }, [])

  return userName
}

function BrandLogoLink({
  href,
  onClick,
  size = "desktop",
}: {
  href: string
  onClick?: () => void
  size?: "desktop" | "mobile"
}) {
  const textClass = size === "mobile" ? "text-lg" : "text-xl"
  const imgClass = size === "mobile" ? "h-6 w-6" : "h-8 w-8"
  const imgPx = size === "mobile" ? 24 : 32

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`inline-flex items-center gap-2 font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 ${textClass}`}
      aria-label="DAIEGO Streaming"
    >
      <Image
        src="/DAIEGO.png"
        alt=""
        width={imgPx}
        height={imgPx}
        className={`${imgClass} shrink-0 object-contain`}
        unoptimized
      />
      <span>Streaming</span>
    </Link>
  )
}

function ThemeToggleButton({
  mobile = false,
}: {
  mobile?: boolean
}) {
  const { theme, toggleTheme } = useTheme()

  if (mobile) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/80 text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-white dark:focus:ring-offset-zinc-900"
        aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      >
        <span className="text-lg leading-none" aria-hidden>
          {theme === "light" ? "🌙" : "☀️"}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-left text-sm font-medium text-zinc-800 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700/90 dark:hover:text-white dark:focus:ring-offset-zinc-900"
      aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-base shadow-sm dark:bg-zinc-900 dark:shadow-none">
        {theme === "light" ? "🌙" : "☀️"}
      </span>
      <span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>
    </button>
  )
}

function BankAccountsSharePublicChrome({
  children,
  isMobile,
}: {
  children: React.ReactNode
  isMobile: boolean
}) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/95 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
        <BrandLogoLink
          href="/administration/bank-accounts/share"
          size={isMobile ? "mobile" : "desktop"}
        />
        {/* Icono compacto: el modo escritorio del toggle es para el sidebar ancho */}
        <ThemeToggleButton mobile />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
      <div className="shrink-0">
        <Footer />
      </div>
    </div>
  )
}

function SignOutButton() {
  const router = useRouter()

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push("/login")
  }, [router])

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-600 transition-all duration-200 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
      aria-label="Cerrar sesión"
    >
      Cerrar sesión
    </button>
  )
}

function NavContent({
  pathname,
  onNavClick,
  hideLogo,
  hideThemeToggle,
}: {
  pathname: string
  onNavClick?: () => void
  hideLogo?: boolean
  hideThemeToggle?: boolean
}) {
  const userName = useUserName()

  return (
    <>
      {!hideLogo && (
        <div className="flex h-16 items-center border-b border-zinc-200/80 px-5 dark:border-zinc-800">
          <BrandLogoLink href="/administration" onClick={onNavClick} size="desktop" />
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 p-3" role="navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/administration" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-zinc-200/80 p-3 dark:border-zinc-800">
        <div className="flex flex-col gap-2">
          {userName && (
            <div className="rounded-xl px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="block truncate">{userName}</span>
            </div>
          )}
          {!hideThemeToggle && <ThemeToggleButton />}
          <SignOutButton />
        </div>
      </div>
    </>
  )
}

export default function AdministrationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === "mobile"
  const isTablet = breakpoint === "tablet"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  const isBankAccountsShareRoute =
    pathname?.startsWith("/administration/bank-accounts/share") ?? false

  if (isBankAccountsShareRoute) {
    return (
      <BankAccountsSharePublicChrome isMobile={isMobile}>
        {children}
      </BankAccountsSharePublicChrome>
    )
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white dark:bg-zinc-950">
      {isMobile && (
        <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/95 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus:ring-offset-zinc-900"
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>
            <BrandLogoLink
              href="/administration"
              onClick={closeMobileMenu}
              size="mobile"
            />
          </div>
          <ThemeToggleButton mobile />
        </header>
      )}

      {isMobile && mobileMenuOpen && (
        <button
          type="button"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`
          flex h-full w-64 flex-col border-r border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none
          ${isMobile ? "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out" : ""}
          ${isMobile && !mobileMenuOpen ? "-translate-x-full" : ""}
          ${isMobile && mobileMenuOpen ? "translate-x-0 shadow-xl" : ""}
        `}
      >
        {isMobile && (
          <div className="flex h-14 items-center justify-between border-b border-zinc-200/80 px-4 dark:border-zinc-800">
            <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Menú
            </span>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>
        )}

        <NavContent
          pathname={pathname}
          onNavClick={isMobile ? closeMobileMenu : undefined}
          hideLogo={isMobile}
          hideThemeToggle={isMobile || isTablet}
        />
      </aside>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div
          className={`w-full flex-1 p-4 md:p-6 lg:p-8 ${isMobile ? "pt-20" : ""} ${isTablet ? "pt-10" : ""}`}
        >
          {children}
        </div>
        <div className="shrink-0">
          <Footer />
        </div>
      </main>
    </div>
  )
}
