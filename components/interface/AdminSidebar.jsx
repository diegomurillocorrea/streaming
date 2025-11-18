"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuMail, LuBuilding2, LuCreditCard, LuUsers, LuWallet, LuLayoutDashboard, LuMonitorPlay } from "react-icons/lu";

const navItems = [
    {
        label: "Overview",
        href: "/administration",
        icon: LuLayoutDashboard,
    },
    {
        label: "Emails",
        href: "/administration/emails",
        icon: LuMail,
    },
    {
        label: "Companies",
        href: "/administration/companies",
        icon: LuBuilding2,
    },
    {
        label: "Cards",
        href: "/administration/cards",
        icon: LuCreditCard,
    },
    {
        label: "Clients",
        href: "/administration/clients",
        icon: LuUsers,
    },
    {
        label: "Bank accounts",
        href: "/administration/bank-accounts",
        icon: LuWallet,
    },
    {
        label: "Accounts",
        href: "/administration/accounts",
        icon: LuMonitorPlay,
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="h-screen sticky top-0 bg-emerald-950 border-r border-emerald-800 w-[15%] min-w-[220px] flex flex-col">
            <div className="px-4 py-4 border-b border-emerald-800">
                <Link
                    href="/"
                    className="inline-block cursor-pointer"
                >
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300 hover:text-emerald-100 transition-colors">
                        Streaming Murillo
                    </p>
                </Link>
                <p className="text-sm text-emerald-100">Administration</p>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer
                ${isActive
                                    ? "bg-emerald-700 text-emerald-50"
                                    : "text-emerald-200 hover:bg-emerald-800 hover:text-emerald-50"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}