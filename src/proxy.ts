import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Explicit path matcher avoids standard capturing groups that break Cloudflare Pages/Workers.
     * Matches the exact prefixes checked in src/lib/supabase/middleware.ts.
     */
    "/admin/:path*",
    "/feed/:path*",
    "/messages/:path*",
    "/settings/:path*",
    "/articles/new",
    "/clans/new",
    "/lfg/new",
    "/rooms/new",
    "/free-pc-games/voice-test",
    "/api/admin/:path*",
    "/api/conversations/:path*",
    "/api/notifications/:path*",
    "/api/profile/:path*",
    "/api/push/:path*",
  ],
};
