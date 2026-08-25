import { ImageResponse } from "next/og";
import { getWrappedData } from "@/lib/wrapped/data";

export const runtime = "nodejs";
export const alt = "PlayGame Wrapped — სეზონური რთანი";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await getWrappedData(username);

  const name =
    data?.profile.display_name || data?.profile.username || "PlayGame";
  const handle = data?.profile.username ?? username;
  const avatar = data?.profile.avatar_url ?? null;
  const seasonLabel = data?.season.labelKa ?? "";
  const thin = !data || data.isThin;

  const newFollowers = data?.public.newFollowers ?? 0;
  const posts = data?.public.postsPublished ?? 0;
  const level = data?.profile.level ?? 1;
  const topGame = data?.public.topGame?.name_ka ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0a0714 0%, #150b23 55%, #1a0f2e 100%)",
          padding: "64px",
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
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: 800,
              letterSpacing: "1px",
            }}
          >
            PlayGame Wrapped
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "8px",
              padding: "6px 16px",
              borderRadius: "9999px",
              background: "rgba(139,92,246,0.18)",
              border: "2px solid rgba(139,92,246,0.4)",
              color: "#c4b5fd",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            {seasonLabel}
          </div>
        </div>

        {/* Center: avatar + identity + hero */}
        <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
          <div
            style={{
              width: "220px",
              height: "220px",
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
                alt=""
                width={206}
                height={206}
                style={{
                  width: "206px",
                  height: "206px",
                  borderRadius: "9999px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  color: "#fff",
                  fontSize: "100px",
                  fontWeight: 800,
                }}
              >
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: "58px",
                fontWeight: 800,
                lineHeight: 1.05,
              }}
            >
              {name}
            </div>
            <div
              style={{
                display: "flex",
                color: "#a78bfa",
                fontSize: "30px",
                marginTop: "6px",
              }}
            >
              @{handle}
            </div>

            {thin ? (
              <div
                style={{
                  display: "flex",
                  marginTop: "22px",
                  color: "#c4b5fd",
                  fontSize: "32px",
                  fontWeight: 700,
                }}
              >
                სეზონი ჯერ გრძელდება 🎮
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  marginTop: "20px",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    color: "#ffffff",
                    fontSize: "72px",
                    fontWeight: 800,
                  }}
                >
                  +{newFollowers.toLocaleString()}
                </div>
                <div
                  style={{
                    display: "flex",
                    color: "#c4b5fd",
                    fontSize: "26px",
                    fontWeight: 700,
                  }}
                >
                  ახალი გამომწერი
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom stat chips */}
        {thin ? (
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.65)",
              fontSize: "28px",
              fontWeight: 600,
            }}
          >
            შექმენი შენი PlayGame Wrapped — playgame.ge 🎮
          </div>
        ) : (
          <div style={{ display: "flex", gap: "16px" }}>
            <Chip label="პოსტი" value={String(posts)} />
            <Chip label="დონე" value={String(level)} />
            {topGame ? <Chip label="თამაში" value={topGame} /> : null}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px 28px",
        borderRadius: "18px",
        border: "2px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ display: "flex", color: "#ffffff", fontSize: "40px", fontWeight: 800 }}>
        {value}
      </div>
      <div
        style={{
          display: "flex",
          color: "rgba(255,255,255,0.5)",
          fontSize: "20px",
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        {label}
      </div>
    </div>
  );
}
