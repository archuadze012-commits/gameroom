import { ImageResponse } from "next/og";
import { createSupabaseAdminClientOrNull } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const alt = "PlayGame.ge — gamer card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  let name = "PlayGame";
  let handle = username;
  let avatar: string | null = null;
  let level = 1;

  const admin = createSupabaseAdminClientOrNull();
  if (admin) {
    const { data } = await admin
      .from("profiles")
      .select("username, display_name, avatar_url, level")
      .ilike("username", username)
      .maybeSingle();
    if (data) {
      name = data.display_name || data.username;
      handle = data.username;
      avatar = data.avatar_url;
      level = data.level ?? 1;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0a0714 0%, #150b23 55%, #1a0f2e 100%)",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", color: "#ffffff", fontSize: "30px", fontWeight: 800, letterSpacing: "1px" }}>
            PlayGame.ge
          </div>
        </div>

        {/* Center: avatar + identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "44px" }}>
          <div
            style={{
              width: "260px",
              height: "260px",
              borderRadius: "9999px",
              background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                width={244}
                height={244}
                style={{ width: "244px", height: "244px", borderRadius: "9999px", objectFit: "cover" }}
              />
            ) : (
              <div style={{ display: "flex", color: "#fff", fontSize: "120px", fontWeight: 800 }}>
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: "#ffffff", fontSize: "68px", fontWeight: 800, lineHeight: 1.05 }}>
              {name}
            </div>
            <div style={{ display: "flex", color: "#a78bfa", fontSize: "34px", marginTop: "8px" }}>@{handle}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "24px",
                padding: "12px 26px",
                borderRadius: "9999px",
                border: "2px solid rgba(139,92,246,0.5)",
                background: "rgba(139,92,246,0.15)",
                color: "#c4b5fd",
                fontSize: "30px",
                fontWeight: 800,
                width: "fit-content",
              }}
            >
              ⚡ LEVEL {level}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ display: "flex", color: "rgba(255,255,255,0.65)", fontSize: "30px", fontWeight: 600 }}>
          შემოუერთდი ქართველი გეიმერების სოციალურ ქსელს 🎮
        </div>
      </div>
    ),
    { ...size }
  );
}
