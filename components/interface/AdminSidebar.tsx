"use client";

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { LuSun } from "react-icons/lu"

import { createClient as createBrowserClient } from "@/utils/supabase/client"
import LogoutButton from "@/components/interface/LogoutButton"

const navItems = [
    {
        label: "Resumen",
        href: "/administration",
    },
    {
        label: "Correos",
        href: "/administration/emails",
    },
    {
        label: "Empresas",
        href: "/administration/companies",
    },
    {
        label: "Tarjetas",
        href: "/administration/cards",
    },
    {
        label: "Clientes",
        href: "/administration/clients",
    },
    {
        label: "Cuentas bancarias",
        href: "/administration/bank-accounts",
    },
    {
        label: "Cuentas",
        href: "/administration/accounts",
    },
];

export default function AdminSidebar() {
    const pathname = usePathname()
    const supabase = useMemo(() => createBrowserClient(), [])
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true

        supabase.auth.getUser().then(({ data }) => {
            if (!mounted) return
            setUserEmail(data?.user?.email ?? null)
        })

        return () => {
            mounted = false
        }
    }, [supabase])

    return (
        <aside className="h-screen sticky top-0 w-[240px] min-w-[240px] flex flex-col bg-[#0b2a23] border-r border-[#0f3d35]">
            <div className="px-4 py-5 border-b border-[#0f3d35]">
                <Link href="/" className="inline-block cursor-pointer">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#7ddbbf] hover:text-[#eafff5] transition-colors">
                        DAIEGO Streaming
                    </p>
                </Link>
                <p className="text-sm text-[#d1fae5] mt-1">Administración</p>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={
                                isActive
                                    ? "block rounded-md bg-[#0f5b49] text-white pl-2 pr-3 py-2 border-l-4 border-[#34d399]"
                                    : "block rounded-md text-[#a7f3d0] px-3 py-2 hover:bg-[#0f3d35] hover:text-[#eafff5] transition-colors"
                            }
                        >
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className="px-4 pb-5 pt-4 border-t border-[#0f3d35] space-y-3">
                <div className="flex items-center gap-2 text-xs text-[#a7f3d0]">
                    <LuSun className="h-4 w-4" />
                    <span>Modo claro</span>
                </div>

                <p className="text-[11px] text-[#a7f3d0] break-all">
                    {userEmail ?? ""}
                </p>

                <LogoutButton />
            </div>
        </aside>
    );
}