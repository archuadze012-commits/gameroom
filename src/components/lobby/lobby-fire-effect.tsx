"use client";

export function LobbyFireEffect() {
  return (
    <>
      <style>{`
        @keyframes fire-tongue {
          0%   { transform: scaleX(1)    scaleY(1)    translateY(0px);  opacity: 0.7; }
          30%  { transform: scaleX(0.88) scaleY(1.1)  translateY(-6px); opacity: 0.8; }
          60%  { transform: scaleX(1.1)  scaleY(0.94) translateY(-3px); opacity: 0.6; }
          100% { transform: scaleX(1)    scaleY(1)    translateY(0px);  opacity: 0.7; }
        }
        @keyframes fire-core {
          0%,100% { transform: scaleX(1)    scaleY(1);    opacity: 0.8;  }
          40%      { transform: scaleX(0.9)  scaleY(1.12); opacity: 0.75; }
          70%      { transform: scaleX(1.08) scaleY(0.95); opacity: 0.8;  }
        }
        @keyframes fire-glow {
          0%,100% { opacity: 0.5;  }
          50%      { opacity: 0.75; }
        }
      `}</style>

      {/* ground glow — full width */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 60,
          background:
            "linear-gradient(to top, rgba(255,60,0,0.55) 0%, rgba(255,40,0,0.2) 60%, transparent 100%)",
          filter: "blur(10px)",
          mixBlendMode: "screen",
          animation: "fire-glow 0.77s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* flame body — full width container */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 0,
          filter: "blur(6px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        {/* outer tongues — red, spread across full width */}
        {[
          { left: "2%",   w: 80,  h: 110, dur: "0.70s", del: "0s"    },
          { left: "10%",  w: 65,  h: 145, dur: "0.66s", del: "0.10s" },
          { left: "18%",  w: 75,  h: 175, dur: "0.59s", del: "0.04s" },
          { left: "27%",  w: 70,  h: 160, dur: "0.69s", del: "0.15s" },
          { left: "36%",  w: 80,  h: 190, dur: "0.64s", del: "0.07s" },
          { left: "45%",  w: 85,  h: 210, dur: "0.71s", del: "0.12s" },
          { left: "54%",  w: 80,  h: 195, dur: "0.67s", del: "0.03s" },
          { left: "63%",  w: 72,  h: 170, dur: "0.62s", del: "0.09s" },
          { left: "72%",  w: 68,  h: 150, dur: "0.68s", del: "0.14s" },
          { left: "81%",  w: 60,  h: 130, dur: "0.65s", del: "0.06s" },
          { left: "90%",  w: 55,  h: 110, dur: "0.72s", del: "0.11s" },
        ].map(({ left, w, h, dur, del }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left,
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
          { left: "6%",   w: 70,  h: 140, dur: "0.53s", del: "0.06s" },
          { left: "15%",  w: 80,  h: 168, dur: "0.50s", del: "0s"    },
          { left: "24%",  w: 75,  h: 182, dur: "0.56s", del: "0.11s" },
          { left: "33%",  w: 85,  h: 200, dur: "0.55s", del: "0.08s" },
          { left: "42%",  w: 90,  h: 218, dur: "0.52s", del: "0.05s" },
          { left: "51%",  w: 82,  h: 205, dur: "0.57s", del: "0.13s" },
          { left: "60%",  w: 76,  h: 185, dur: "0.54s", del: "0.02s" },
          { left: "69%",  w: 70,  h: 165, dur: "0.51s", del: "0.09s" },
          { left: "78%",  w: 65,  h: 148, dur: "0.58s", del: "0.07s" },
          { left: "87%",  w: 60,  h: 130, dur: "0.53s", del: "0.04s" },
        ].map(({ left, w, h, dur, del }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left,
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

        {/* inner cores — yellow, evenly spaced */}
        {[
          { left: "10%", w: 50, h: 130, del: "0s"    },
          { left: "25%", w: 60, h: 155, del: "0.08s" },
          { left: "40%", w: 65, h: 170, del: "0.04s" },
          { left: "55%", w: 63, h: 165, del: "0.12s" },
          { left: "70%", w: 55, h: 145, del: "0.06s" },
          { left: "85%", w: 48, h: 128, del: "0.10s" },
        ].map(({ left, w, h, del }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left,
              width: w,
              height: h,
              background:
                "radial-gradient(ellipse at 50% 82%, rgba(255,255,160,0.8) 0%, #ffdd00 25%, #ff9900 55%, transparent 82%)",
              borderRadius: "50% 50% 20% 20%",
              transformOrigin: "bottom center",
              animation: `fire-core 0.42s ${del} ease-in-out infinite`,
              filter: "blur(1.5px)",
            }}
          />
        ))}
      </div>
    </>
  );
}
