// middleware.js (en la raíz del proyecto)
import { NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const PUBLIC_ROUTES = ["/login"];

export async function middleware(request) {
    const { supabaseResponse, user } = await updateSession(request);

    const pathname = request.nextUrl.pathname;
    const isLoggedIn = !!user;
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // User NOT logged in and trying to access a protected route
    if (!isLoggedIn && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // User logged in and trying to access /login
    if (isLoggedIn && pathname === "/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/"; // Cambia a "/dashboard" si querés
        return NextResponse.redirect(url);
    }

    // Default: continue the request with the updated response (cookies, etc.)
    return supabaseResponse;
}

// Match all routes except Next.js internals and static files
export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};