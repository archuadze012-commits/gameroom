import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/auth/login", request.url));
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith("sb-")) {
      response.cookies.delete(name);
    }
  });
  return response;
}
