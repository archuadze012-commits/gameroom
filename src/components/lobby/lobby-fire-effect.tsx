"use client";

export function LobbyFireEffect() {
  return (
    <>
      <style>{`
        @keyframes fire-tongue {
          0%   { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px);  opacity: 0.7; }
          30%  { transform: translateX(-50%) scaleX(0.88) scaleY(1.1)  translateY(-6px); opacity: 0.8; }
          60%  { transform: translateX(-50%) scaleX(1.1)  scaleY(0.94) translateY(-3px); opacity: 0.6; }
          100% { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px);  opacity: 0.7; }
        }
        @keyframes fire-core {
          0%,100% { transform: translateX(-50%) scaleX(1)    scaleY(1);    opacity: 0.8;  }
          40%      { transform: translateX(-50%) scaleX(0.9)  scaleY(1.12); opacity: 0.75; }
          70%      { transform: translateX(-50%) scaleX(1.08) scaleY(0.95); opacity: 0.8;  }
        }
        @keyframes fire-glow {
          0%,100% { opacity: 0.45; transform: translateX(-50%) scale(1);    }
          50%      { opacity: 0.7;  transform: translateX(-50%) scale(1.12); }
        }
      `}</style>

      {/* ground glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50.5%",
          bottom: "4.5%",
          transform: "translateX(-50%)",
          width: 240,
          height: 66,
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(255,80,0,0.6) 0%, rgba(255,40,0,0.28) 45%, transparent 78%)",
          filter: "blur(14px)",
          mixBlendMode: "screen",
          animation: "fire-glow 0.77s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* flame body — blurred container */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50.5%",
          bottom: "5.5%",
          width: 0,
          height: 0,
          filter: "blur(6px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        {/* outer tongues — red */}
        {[
          { l: -82, w: 53, h: 126, dur: "0.70s", del: "0s"    },
          { l: -53, w: 65, h: 168, dur: "0.66s", del: "0.10s" },
          { l: -19, w: 74, h: 204, dur: "0.59s", del: "0.04s" },
          { l:  19, w: 70, h: 186, dur: "0.69s", del: "0.15s" },
          { l:  53, w: 60, h: 150, dur: "0.64s", del: "0.07s" },
          { l:  82, w: 48, h: 120, dur: "0.71s", del: "0.12s" },
        ].map(({ l, w, h, dur, del }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left: l,
              width: w,
              height: h,
              background:
                "radial-gradient(ellipse at 50% 88%, rgba(255,34,0,0.8) 0%, rgba(255,60,0,0.5) 45%, transparent 78%)",
              borderRadius: "50% 50% 28% 28%",
              transformOrigin: "bottom center",
              animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            }}
          />
        ))}

        {/* mid tongues — orange */}
        {[
          { l: -50, w: 58, h: 156, dur: "0.53s", del: "0.06s" },
          { l: -14, w: 70, h: 194, dur: "0.50s", del: "0s"    },
          { l:  22, w: 62, h: 178, dur: "0.56s", del: "0.11s" },
          { l:  50, w: 53, h: 142, dur: "0.55s", del: "0.08s" },
        ].map(({ l, w, h, dur, del }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left: l,
              width: w,
              height: h,
              background:
                "radial-gradient(ellipse at 50% 85%, rgba(255,119,0,0.75) 0%, rgba(255,120,0,0.45) 45%, transparent 76%)",
              borderRadius: "50% 50% 22% 22%",
              transformOrigin: "bottom center",
              animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            }}
          />
        ))}

        {/* inner core — yellow-white */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: -29,
            width: 58,
            height: 144,
            background:
              "radial-gradient(ellipse at 50% 82%, rgba(255,255,160,0.85) 0%, #ffdd00 25%, #ff9900 55%, transparent 82%)",
            borderRadius: "50% 50% 20% 20%",
            transformOrigin: "bottom center",
            animation: "fire-core 0.42s ease-in-out infinite",
            filter: "blur(1.5px)",
          }}
        />
      </div>
    </>
  );
}
