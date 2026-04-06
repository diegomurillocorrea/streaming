import { NextResponse } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

const PUBLIC_ROUTES = ["/login"]

/** Rutas accesibles sin sesión (p. ej. clientes que solo copian datos bancarios). */
const isPublicPathname = (pathname: string) => {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (pathname === "/administration/bank-accounts/share") return true
  if (pathname.startsWith("/administration/bank-accounts/share/")) return true
  return false
}

/** Archivos en /public (evita que el proxy redirija a /login y rompa <img src="/logo.png" />). */
const isPublicStaticFile = (pathname: string) =>
  /\.(?:ico|png|jpe?g|gif|webp|svg|woff2?|ttf|eot)$/i.test(pathname)

export async function proxy(request) {
  const pathname = request.nextUrl.pathname

  if (isPublicStaticFile(pathname)) {
    return NextResponse.next()
  }

  const { supabaseResponse, user } = await updateSession(request)
  const isLoggedIn = !!user
  const isPublicRoute = isPublicPathname(pathname)

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
