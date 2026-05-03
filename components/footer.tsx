"use client"

import Image from "next/image"

/** Verde de marca DAIEGO (mismo en light / dark). */
const BRAND_GREEN = "#00BC7D"

export function Footer() {
  return (
    <footer
      className="flex w-full flex-wrap items-center justify-between gap-4 border-t border-white/25 px-4 py-4 text-white tablet:px-6 desktop:px-8"
      style={{ backgroundColor: BRAND_GREEN }}
      role="contentinfo"
      aria-label="Pie de página"
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
        {/* Fondo siempre oscuro: el logo no hereda modo claro/oscuro ni se ve “blanqueado”. */}
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 shadow-sm ring-1 ring-black/25 dark:bg-zinc-900 dark:ring-black/40">
          <Image
            src="/DAIEGO.png"
            alt="DAIEGO"
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 object-contain brightness-100 contrast-100 saturate-100 filter-none dark:brightness-100 dark:contrast-100 dark:saturate-100 dark:filter-none"
            unoptimized
          />
        </span>
      </span>
      <span
        className="text-sm font-medium text-black"
        aria-label="DAIEGO LLC copyright 2026"
      >
        DAIEGO LLC © 2026
      </span>
    </footer>
  )
}
