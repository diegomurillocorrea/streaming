"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LuLogOut } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { createClient as createBrowserClient } from "@/utils/supabase/client";

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
        <Button
            variant="outline"
            onClick={handleLogout}
            disabled={loading}
            className="border-emerald-400/60"
        >
            <LuLogOut className="mr-2 h-4 w-4" />
            {loading ? "Logging out..." : "Log Out"}
        </Button>
    );
}