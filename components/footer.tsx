"use client"

import Image from "next/image"

export function Footer() {
  return (
    <footer
      className="flex w-full flex-wrap items-center justify-between gap-4 border-t border-zinc-200/90 bg-white px-4 py-4 text-zinc-700 dark:border-transparent dark:bg-emerald-500 dark:text-zinc-900 tablet:px-6 desktop:px-8"
      role="contentinfo"
      aria-label="Pie de página"
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <Image
          src="/DAIEGO.png"
          alt="DAIEGO"
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 object-contain"
          unoptimized
        />
      </span>
      <span className="text-sm font-medium" aria-label="DAIEGO LLC copyright 2026">
        DAIEGO LLC © 2026
      </span>
    </footer>
  )
}
