import { NextResponse } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

const PUBLIC_ROUTES = ["/login"]

export async function proxy(request) {
  const { supabaseResponse, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname
  const isLoggedIn = !!user
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  if (!isLoggedIn && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isLoggedIn && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
