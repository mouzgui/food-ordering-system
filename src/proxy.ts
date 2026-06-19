import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const dashboardRoutes = ["/overview", "/orders", "/menu", "/tables", "/staff", "/settings"];
const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is a dashboard route that needs protection
  const isDashboard = dashboardRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Check if this is an auth route (login/register)
  const isAuth = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!isDashboard && !isAuth) {
    // Public routes (landing, customer ordering, etc.) — pass through
    return NextResponse.next();
  }

  try {
    const { user, supabaseResponse } = await updateSession(request);

    if (isDashboard && !user) {
      // Not logged in, trying to access dashboard → redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuth && user) {
      // Already logged in, trying to access login/register → redirect to dashboard
      return NextResponse.redirect(new URL("/overview", request.url));
    }

    // Merge Supabase cookies into the response
    return supabaseResponse;
  } catch {
    // If Supabase call fails, allow access (graceful degradation)
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Only run on app routes, skip static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
