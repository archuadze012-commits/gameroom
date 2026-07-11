import { NextResponse, type NextRequest } from "next/server";

// Invite capture. Someone lands on /i/CODE (a shared invite / gamer-card link),
// we stash the referral code in an httpOnly cookie and bounce them to the home
// page. Attribution is resolved later in the OAuth callback when they actually
// sign up (see app/auth/callback/route.ts). Invalid codes are harmless — the
// callback validates the code against a real profile before recording anything.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await params;
  const code = (raw ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase();

  const dest = new URL("/", request.url);
  const response = NextResponse.redirect(dest);

  if (code.length >= 4) {
    response.cookies.set("gr_ref", code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  return response;
}
