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

      {/* ground glow — full width, pushed to very bottom */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -20,
          height: 70,
          background:
            "linear-gradient(to top, rgba(255,60,0,0.65) 0%, rgba(255,40,0,0.25) 60%, transparent 100%)",
          filter: "blur(10px)",
          mixBlendMode: "screen",
          animation: "fire-glow 0.77s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* flame body — sunk below bottom edge so only upper parts visible */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -40,
          right: -40,
          bottom: -55,
          height: 0,
          filter: "blur(6px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        {/* outer tongues — red, dense every ~5%, U-curve: edges tallest */}
        {[
          { left: "0%",   w: 90,  h: 210, dur: "0.70s", del: "0s"    },
          { left: "5%",   w: 80,  h: 200, dur: "0.63s", del: "0.05s" },
          { left: "10%",  w: 90,  h: 192, dur: "0.66s", del: "0.10s" },
          { left: "15%",  w: 85,  h: 180, dur: "0.61s", del: "0.03s" },
          { left: "20%",  w: 95,  h: 168, dur: "0.59s", del: "0.08s" },
          { left: "25%",  w: 88,  h: 155, dur: "0.67s", del: "0.13s" },
          { left: "30%",  w: 92,  h: 145, dur: "0.64s", del: "0.02s" },
          { left: "35%",  w: 85,  h: 135, dur: "0.69s", del: "0.07s" },
          { left: "40%",  w: 98,  h: 126, dur: "0.62s", del: "0.11s" },
          { left: "45%",  w: 100, h: 120, dur: "0.71s", del: "0.04s" },
          { left: "50%",  w: 95,  h: 118, dur: "0.65s", del: "0.09s" },
          { left: "55%",  w: 100, h: 120, dur: "0.68s", del: "0.14s" },
          { left: "60%",  w: 92,  h: 126, dur: "0.60s", del: "0.06s" },
          { left: "65%",  w: 88,  h: 135, dur: "0.66s", del: "0.12s" },
          { left: "70%",  w: 85,  h: 145, dur: "0.63s", del: "0.01s" },
          { left: "75%",  w: 80,  h: 155, dur: "0.70s", del: "0.08s" },
          { left: "80%",  w: 85,  h: 168, dur: "0.64s", del: "0.05s" },
          { left: "85%",  w: 78,  h: 180, dur: "0.67s", del: "0.10s" },
          { left: "90%",  w: 82,  h: 192, dur: "0.61s", del: "0.03s" },
          { left: "95%",  w: 75,  h: 200, dur: "0.69s", del: "0.07s" },
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
                "radial-gradient(ellipse at 50% 88%, rgba(255,34,0,0.85) 0%, rgba(255,60,0,0.55) 45%, transparent 80%)",
              borderRadius: "50% 50% 28% 28%",
              transformOrigin: "bottom center",
              animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            }}
          />
        ))}

        {/* mid tongues — orange vivid, U-curve: edges tallest */}
        {[
          { left: "2%",   w: 85,  h: 218, dur: "0.53s", del: "0.06s" },
          { left: "7%",   w: 90,  h: 205, dur: "0.50s", del: "0.02s" },
          { left: "12%",  w: 88,  h: 192, dur: "0.56s", del: "0.09s" },
          { left: "17%",  w: 92,  h: 178, dur: "0.52s", del: "0.04s" },
          { left: "22%",  w: 95,  h: 162, dur: "0.55s", del: "0.11s" },
          { left: "27%",  w: 90,  h: 150, dur: "0.49s", del: "0.07s" },
          { left: "32%",  w: 95,  h: 140, dur: "0.57s", del: "0.01s" },
          { left: "37%",  w: 100, h: 132, dur: "0.53s", del: "0.13s" },
          { left: "42%",  w: 102, h: 124, dur: "0.51s", del: "0.05s" },
          { left: "47%",  w: 105, h: 118, dur: "0.55s", del: "0.10s" },
          { left: "52%",  w: 102, h: 118, dur: "0.52s", del: "0.03s" },
          { left: "57%",  w: 98,  h: 124, dur: "0.56s", del: "0.08s" },
          { left: "62%",  w: 94,  h: 132, dur: "0.50s", del: "0.14s" },
          { left: "67%",  w: 90,  h: 140, dur: "0.54s", del: "0.02s" },
          { left: "72%",  w: 86,  h: 150, dur: "0.51s", del: "0.09s" },
          { left: "77%",  w: 82,  h: 162, dur: "0.57s", del: "0.06s" },
          { left: "82%",  w: 85,  h: 178, dur: "0.53s", del: "0.11s" },
          { left: "87%",  w: 80,  h: 192, dur: "0.55s", del: "0.04s" },
          { left: "92%",  w: 78,  h: 205, dur: "0.50s", del: "0.07s" },
          { left: "97%",  w: 72,  h: 218, dur: "0.54s", del: "0.12s" },
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
                "radial-gradient(ellipse at 50% 85%, rgba(255,95,0,0.95) 0%, rgba(255,140,0,0.75) 40%, rgba(255,60,0,0.3) 70%, transparent 88%)",
              borderRadius: "50% 50% 22% 22%",
              transformOrigin: "bottom center",
              animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            }}
          />
        ))}

        {/* inner cores — yellow, U-curve: edges tallest */}
        {[
          { left: "4%",  w: 60, h: 195, del: "0s"    },
          { left: "13%", w: 65, h: 175, del: "0.08s" },
          { left: "22%", w: 68, h: 155, del: "0.04s" },
          { left: "31%", w: 70, h: 138, del: "0.11s" },
          { left: "40%", w: 72, h: 122, del: "0.06s" },
          { left: "49%", w: 74, h: 112, del: "0.02s" },
          { left: "58%", w: 72, h: 122, del: "0.09s" },
          { left: "67%", w: 68, h: 138, del: "0.05s" },
          { left: "76%", w: 64, h: 155, del: "0.12s" },
          { left: "85%", w: 60, h: 175, del: "0.03s" },
          { left: "94%", w: 56, h: 195, del: "0.07s" },
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
                "radial-gradient(ellipse at 50% 82%, rgba(255,255,160,0.82) 0%, #ffdd00 25%, #ff9900 55%, transparent 82%)",
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
