import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const dashboardRoutes = ["/overview", "/orders", "/menu", "/tables", "/staff", "/settings", "/performance", "/waiter", "/kitchen"];
const authRoutes = ["/login", "/register"];
const adminRoutes = ["/settings", "/staff"];

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

  const isAdmin = adminRoutes.some(
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

    if (isDashboard && user && isAdmin) {
      // Admin route, check role
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              // Handled by updateSession
            },
          },
        }
      );

      const { data: member } = await supabase
        .from("restaurant_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!member || (member.role !== "owner" && member.role !== "manager")) {
        const url = request.nextUrl.clone();
        url.pathname = "/overview"; // Redirect unauthorized staff
        return NextResponse.redirect(url);
      }
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
