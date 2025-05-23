import { NextRequest, NextResponse } from "next/server";

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
    // Log the request for debugging
    console.log(
        `[${new Date().toISOString()}] ${request.method} ${request.nextUrl.pathname}`,
    );

    // Handle service worker requests - prevent 404 errors
    if (request.nextUrl.pathname === "/sw.js") {
        // Return an empty service worker script to prevent 404 errors
        return new NextResponse("// This is a placeholder service worker\n", {
            headers: {
                "Content-Type": "application/javascript",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        });
    }

    // Add trailing slashes to navigation routes for consistency
    const routesToAddTrailingSlash = [
        "/dashboard",
        "/inventory",
        "/vendors",
        "/thread-orders",
        "/dyeing-process",
        "/fabric-production",
        "/sales",
        "/ledger",
        "/reports",
        "/settings",
    ];

    // Check if the current path needs a trailing slash
    for (const route of routesToAddTrailingSlash) {
        if (request.nextUrl.pathname === route) {
            return NextResponse.redirect(new URL(`${route}/`, request.url));
        }
    }

    // Redirect root path to dashboard when authenticated
    if (
        request.nextUrl.pathname === "/" &&
        request.cookies.has("__clerk_session")
    ) {
        return NextResponse.redirect(new URL("/dashboard/", request.url));
    }

    // Fix inventory redirect issue - if someone tries to access inventory directly
    // Only apply this redirect if the user is trying to access the inventory page directly,
    // not if they're navigating there intentionally
    // if (request.nextUrl.pathname === '/dashboard/' &&
    //     !request.headers.get('referer')?.includes('/inventory') &&
    //     !request.headers.get('referer')?.includes('/dashboard')) {
    //   return NextResponse.redirect(new URL('/dashboard/', request.url));
    // }

    return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
    matcher: [
        // Match root path
        "/",
        // Handle dashboard routes
        "/dashboard",
        "/dashboard/:path*",
        // Handle inventory routes
        "/inventory",
        "/inventory/:path*",
        // Handle vendor routes
        "/vendors",
        "/vendors/:path*",
        // Handle thread orders routes
        "/thread-orders",
        "/thread-orders/:path*",
        // Handle dyeing process routes
        "/dyeing-process",
        "/dyeing-process/:path*",
        // Handle fabric production routes
        "/fabric-production",
        "/fabric-production/:path*",
        // Handle sales routes
        "/sales",
        "/sales/:path*",
        // Handle ledger routes
        "/ledger",
        "/ledger/:path*",
        // Handle reports routes
        "/reports",
        "/reports/:path*",
        // Handle settings routes
        "/settings",
        "/settings/:path*",
        // Handle API routes
        "/api/:path*",
        // Handle service worker requests
        "/sw.js",
    ],
};
