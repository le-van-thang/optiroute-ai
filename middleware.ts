import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
    const isDashboardRoute = req.nextUrl.pathname.startsWith("/dashboard");
    const isItineraryRoute = req.nextUrl.pathname.startsWith("/itinerary");
    const isSplitBillRoute = req.nextUrl.pathname.startsWith("/split-bill");

    if (isAuthPage) {
      if (isAuth) {
        // Phase 26: Chỉnh chu - Nếu đang ở trang Login/Register mà có tham số lỗi (do bị Ban hoặc Xóa)
        // thì KHÔNG tự động chuyển hướng vào Dashboard để User còn xem được thông báo.
        const hasError = req.nextUrl.searchParams.has("error") || 
                        req.nextUrl.searchParams.has("reason") || 
                        req.nextUrl.searchParams.has("message") ||
                        req.nextUrl.searchParams.has("banned");
        
        if (!hasError) {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
      return null;
    }

    if (!isAuth && (isAdminRoute || isDashboardRoute || isItineraryRoute || isSplitBillRoute)) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }

    return null;
  },
  {
    callbacks: {
      async authorized() {
        // This is a work-around for handling redirect on auth pages.
        // We return true here so that the middleware function above
        // is always called.
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register", "/itinerary/:path*", "/split-bill/:path*"],
};
