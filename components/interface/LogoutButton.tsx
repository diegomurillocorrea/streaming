"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LuLogOut } from "react-icons/lu";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
    const router = useRouter();
    const supabase = useMemo(() => createBrowserClient(), []);
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
        router.push("/login");
    };

    return (
        <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            aria-label="Cerrar sesión"
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-[#0f3d35] bg-transparent px-3 py-2 text-xs text-[#a7f3d0] hover:bg-[#0f3d35]/40 disabled:opacity-60 cursor-pointer transition-colors"
        >
            <LuLogOut className="h-4 w-4" />
            {loading ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
    );
}