"use client";

export function LobbyFireEffect() {
  return (
    <>
      <style>{`
        @keyframes fire-tongue {
          0%   { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px);  opacity: 0.9; }
          30%  { transform: translateX(-50%) scaleX(0.88) scaleY(1.1)  translateY(-6px); opacity: 1;   }
          60%  { transform: translateX(-50%) scaleX(1.1)  scaleY(0.94) translateY(-3px); opacity: 0.8; }
          100% { transform: translateX(-50%) scaleX(1)    scaleY(1)    translateY(0px);  opacity: 0.9; }
        }
        @keyframes fire-core {
          0%,100% { transform: translateX(-50%) scaleX(1)   scaleY(1);    opacity: 1;   }
          40%      { transform: translateX(-50%) scaleX(0.9) scaleY(1.12); opacity: 0.95; }
          70%      { transform: translateX(-50%) scaleX(1.08) scaleY(0.95); opacity: 1;  }
        }
        @keyframes fire-glow {
          0%,100% { opacity: 0.65; transform: translateX(-50%) scale(1);    }
          50%      { opacity: 0.95; transform: translateX(-50%) scale(1.12); }
        }
      `}</style>

      {/* ground glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "51.5%",
          bottom: "4.5%",
          transform: "translateX(-50%)",
          width: 200,
          height: 55,
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(255,80,0,0.85) 0%, rgba(255,40,0,0.4) 45%, transparent 78%)",
          filter: "blur(14px)",
          mixBlendMode: "screen",
          animation: "fire-glow 0.55s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* flame body — blurred container */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "51.5%",
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
          { l: -68, w: 44, h: 105, dur: "0.5s",  del: "0s" },
          { l: -44, w: 54, h: 140, dur: "0.47s", del: "0.07s" },
          { l: -16, w: 62, h: 170, dur: "0.42s", del: "0.03s" },
          { l:  16, w: 58, h: 155, dur: "0.49s", del: "0.11s" },
          { l:  44, w: 50, h: 125, dur: "0.46s", del: "0.05s" },
          { l:  68, w: 40, h: 100, dur: "0.51s", del: "0.09s" },
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
                "radial-gradient(ellipse at 50% 88%, #ff2200 0%, rgba(255,60,0,0.7) 45%, transparent 78%)",
              borderRadius: "50% 50% 28% 28%",
              transformOrigin: "bottom center",
              animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            }}
          />
        ))}

        {/* mid tongues — orange */}
        {[
          { l: -42, w: 48, h: 130, dur: "0.38s", del: "0.04s" },
          { l: -12, w: 58, h: 162, dur: "0.36s", del: "0s"    },
          { l:  18, w: 52, h: 148, dur: "0.4s",  del: "0.08s" },
          { l:  42, w: 44, h: 118, dur: "0.39s", del: "0.06s" },
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
                "radial-gradient(ellipse at 50% 85%, #ff7700 0%, rgba(255,120,0,0.65) 45%, transparent 76%)",
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
            left: -24,
            width: 48,
            height: 120,
            background:
              "radial-gradient(ellipse at 50% 82%, #ffffa0 0%, #ffdd00 25%, #ff9900 55%, transparent 82%)",
            borderRadius: "50% 50% 20% 20%",
            transformOrigin: "bottom center",
            animation: "fire-core 0.3s ease-in-out infinite",
            filter: "blur(1.5px)",
          }}
        />
      </div>
    </>
  );
}
