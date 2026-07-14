import { ImageResponse } from "next/og";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { accentOrDefault } from "@/lib/clan/cosmetics";

export const runtime = "nodejs";
export const alt = "PlayGame.ge — clan card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let name = "Clan";
  let tag = "";
  let avatar: string | null = null;
  let level = 1;
  let members = 0;
  let emblem = "";
  let accentToken: string | null = null;

  // Public `clans` read through the anon/RLS server client (crawlers have no
  // session → anon, which is fine since clans are publicly selectable).
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clans")
    .select("name, tag, avatar_url, level, emblem, accent_color, clan_members(id)")
    .eq("slug", slug)
    .maybeSingle();
  if (data) {
    name = data.name;
    tag = data.tag;
    avatar = data.avatar_url;
    level = data.level ?? 1;
    members = (data.clan_members as { id: string }[] | null)?.length ?? 0;
    emblem = data.emblem ?? "";
    accentToken = data.accent_color ?? null;
  }

  const accent = accentOrDefault(accentToken);
  const accentGradient = `linear-gradient(135deg, ${accent.hex}, ${accent.hex2})`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #070a14 0%, #0d1023 55%, #140f2e 100%)",
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
              background: accentGradient,
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
              borderRadius: "44px",
              background: accentGradient,
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
                style={{ width: "244px", height: "244px", borderRadius: "38px", objectFit: "cover" }}
              />
            ) : (
              <div style={{ display: "flex", color: "#fff", fontSize: "110px", fontWeight: 800 }}>
                {(tag || name).slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {tag && (
              <div style={{ display: "flex", color: "#fbbf24", fontSize: "32px", fontWeight: 800, letterSpacing: "1px" }}>
                [{tag}]
              </div>
            )}
            <div style={{ display: "flex", color: "#ffffff", fontSize: "68px", fontWeight: 800, lineHeight: 1.05, marginTop: "6px" }}>
              {emblem ? `${emblem} ${name}` : name}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 26px",
                  borderRadius: "9999px",
                  border: `2px solid ${accent.hex}`,
                  background: `${accent.hex}22`,
                  color: "#ffffff",
                  fontSize: "30px",
                  fontWeight: 800,
                }}
              >
                ⚡ დონე {level}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 26px",
                  borderRadius: "9999px",
                  border: "2px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "30px",
                  fontWeight: 800,
                }}
              >
                👥 {members}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ display: "flex", color: "rgba(255,255,255,0.65)", fontSize: "30px", fontWeight: 600 }}>
          შემოუერთდი კლანს ქართველი გეიმერების სოციალურ ქსელზე 🎮
        </div>
      </div>
    ),
    { ...size },
  );
}
