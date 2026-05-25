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

      {/* ground glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: -45,
          height: 70,
          background:
            "linear-gradient(to top, rgba(180,10,0,0.75) 0%, rgba(200,20,0,0.30) 60%, transparent 100%)",
          filter: "blur(10px)",
          mixBlendMode: "screen",
          animation: "fire-glow 1.54s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 4,
        }}
      />

      {/* flame body */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -40,
          right: -40,
          bottom: -80,
          height: 0,
          filter: "blur(6px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        {/* outer tongues — red */}
        {[
          { left: "0%",  w: 90,  h: 210, dur: "1.40s", del: "0s",    rot: "-4deg",  br: "52% 48% 35% 22%", fx: "48% 90%" },
          { left: "5%",  w: 80,  h: 200, dur: "1.26s", del: "0.10s", rot:  "6deg",  br: "44% 56% 22% 38%", fx: "55% 86%" },
          { left: "10%", w: 90,  h: 192, dur: "1.32s", del: "0.20s", rot: "-2deg",  br: "60% 40% 28% 32%", fx: "42% 88%" },
          { left: "15%", w: 85,  h: 180, dur: "1.22s", del: "0.06s", rot:  "5deg",  br: "46% 54% 40% 18%", fx: "58% 85%" },
          { left: "20%", w: 95,  h: 168, dur: "1.18s", del: "0.16s", rot: "-7deg",  br: "55% 45% 18% 42%", fx: "45% 92%" },
          { left: "25%", w: 88,  h: 155, dur: "1.34s", del: "0.26s", rot:  "3deg",  br: "48% 52% 34% 26%", fx: "52% 87%" },
          { left: "30%", w: 92,  h: 145, dur: "1.28s", del: "0.04s", rot: "-5deg",  br: "62% 38% 26% 44%", fx: "40% 89%" },
          { left: "35%", w: 85,  h: 135, dur: "1.38s", del: "0.14s", rot:  "8deg",  br: "43% 57% 42% 20%", fx: "60% 84%" },
          { left: "40%", w: 98,  h: 126, dur: "1.24s", del: "0.22s", rot: "-3deg",  br: "50% 50% 30% 30%", fx: "50% 91%" },
          { left: "45%", w: 100, h: 120, dur: "1.42s", del: "0.08s", rot:  "4deg",  br: "57% 43% 20% 38%", fx: "46% 86%" },
          { left: "50%", w: 95,  h: 118, dur: "1.30s", del: "0.18s", rot: "-6deg",  br: "41% 59% 38% 24%", fx: "54% 88%" },
          { left: "55%", w: 100, h: 120, dur: "1.36s", del: "0.28s", rot:  "2deg",  br: "54% 46% 24% 36%", fx: "48% 90%" },
          { left: "60%", w: 92,  h: 126, dur: "1.20s", del: "0.12s", rot: "-8deg",  br: "47% 53% 44% 16%", fx: "56% 85%" },
          { left: "65%", w: 88,  h: 135, dur: "1.32s", del: "0.24s", rot:  "5deg",  br: "63% 37% 18% 46%", fx: "43% 87%" },
          { left: "70%", w: 85,  h: 145, dur: "1.26s", del: "0.02s", rot: "-2deg",  br: "49% 51% 36% 28%", fx: "51% 89%" },
          { left: "75%", w: 80,  h: 155, dur: "1.40s", del: "0.16s", rot:  "7deg",  br: "44% 56% 28% 34%", fx: "57% 86%" },
          { left: "80%", w: 85,  h: 168, dur: "1.28s", del: "0.10s", rot: "-4deg",  br: "58% 42% 22% 40%", fx: "44% 91%" },
          { left: "85%", w: 78,  h: 180, dur: "1.34s", del: "0.20s", rot:  "3deg",  br: "45% 55% 40% 22%", fx: "53% 88%" },
          { left: "90%", w: 82,  h: 192, dur: "1.22s", del: "0.06s", rot: "-6deg",  br: "61% 39% 32% 30%", fx: "47% 84%" },
          { left: "95%", w: 75,  h: 200, dur: "1.38s", del: "0.14s", rot:  "5deg",  br: "42% 58% 26% 36%", fx: "59% 87%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left,
              width: w,
              height: h,
              background: `radial-gradient(ellipse at ${fx}, rgba(180,10,0,0.92) 0%, rgba(210,25,0,0.55) 45%, transparent 80%)`,
              borderRadius: br,
              rotate: rot,
              transformOrigin: "bottom center",
              animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            }}
          />
        ))}

        {/* mid tongues — orange vivid */}
        {[
          { left: "2%",  w: 85,  h: 218, dur: "1.06s", del: "0.12s", rot:  "5deg",  br: "56% 44% 20% 38%", fx: "53% 87%" },
          { left: "7%",  w: 90,  h: 205, dur: "1.00s", del: "0.04s", rot: "-3deg",  br: "43% 57% 36% 26%", fx: "45% 85%" },
          { left: "12%", w: 88,  h: 192, dur: "1.12s", del: "0.18s", rot:  "7deg",  br: "61% 39% 24% 42%", fx: "58% 90%" },
          { left: "17%", w: 92,  h: 178, dur: "1.04s", del: "0.08s", rot: "-5deg",  br: "47% 53% 40% 20%", fx: "42% 88%" },
          { left: "22%", w: 95,  h: 162, dur: "1.10s", del: "0.22s", rot:  "2deg",  br: "52% 48% 28% 34%", fx: "55% 86%" },
          { left: "27%", w: 90,  h: 150, dur: "0.98s", del: "0.14s", rot: "-7deg",  br: "38% 62% 18% 46%", fx: "48% 91%" },
          { left: "32%", w: 95,  h: 140, dur: "1.14s", del: "0.02s", rot:  "4deg",  br: "58% 42% 32% 26%", fx: "40% 87%" },
          { left: "37%", w: 100, h: 132, dur: "1.06s", del: "0.26s", rot: "-2deg",  br: "45% 55% 44% 18%", fx: "56% 84%" },
          { left: "42%", w: 102, h: 124, dur: "1.02s", del: "0.10s", rot:  "6deg",  br: "64% 36% 22% 40%", fx: "44% 89%" },
          { left: "47%", w: 105, h: 118, dur: "1.10s", del: "0.20s", rot: "-4deg",  br: "50% 50% 38% 24%", fx: "52% 86%" },
          { left: "52%", w: 102, h: 118, dur: "1.04s", del: "0.06s", rot:  "3deg",  br: "42% 58% 26% 36%", fx: "47% 90%" },
          { left: "57%", w: 98,  h: 124, dur: "1.12s", del: "0.16s", rot: "-6deg",  br: "55% 45% 42% 20%", fx: "60% 85%" },
          { left: "62%", w: 94,  h: 132, dur: "1.00s", del: "0.28s", rot:  "8deg",  br: "46% 54% 18% 44%", fx: "43% 88%" },
          { left: "67%", w: 90,  h: 140, dur: "1.08s", del: "0.04s", rot: "-3deg",  br: "59% 41% 30% 32%", fx: "54% 87%" },
          { left: "72%", w: 86,  h: 150, dur: "1.02s", del: "0.18s", rot:  "5deg",  br: "44% 56% 36% 22%", fx: "49% 91%" },
          { left: "77%", w: 82,  h: 162, dur: "1.14s", del: "0.12s", rot: "-5deg",  br: "48% 52% 20% 42%", fx: "57% 86%" },
          { left: "82%", w: 85,  h: 178, dur: "1.06s", del: "0.22s", rot:  "2deg",  br: "62% 38% 40% 24%", fx: "41% 89%" },
          { left: "87%", w: 80,  h: 192, dur: "1.10s", del: "0.08s", rot: "-8deg",  br: "40% 60% 28% 38%", fx: "55% 84%" },
          { left: "92%", w: 78,  h: 205, dur: "1.00s", del: "0.14s", rot:  "4deg",  br: "53% 47% 34% 28%", fx: "46% 88%" },
          { left: "97%", w: 72,  h: 218, dur: "1.08s", del: "0.24s", rot: "-3deg",  br: "47% 53% 22% 40%", fx: "61% 87%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left,
              width: w,
              height: h,
              background: `radial-gradient(ellipse at ${fx}, rgba(200,30,0,0.95) 0%, rgba(230,55,0,0.70) 40%, rgba(180,15,0,0.30) 70%, transparent 88%)`,
              borderRadius: br,
              rotate: rot,
              transformOrigin: "bottom center",
              animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            }}
          />
        ))}

        {/* inner cores — yellow */}
        {[
          { left: "4%",  w: 60, h: 195, del: "0s",    rot:  "4deg",  br: "55% 45% 30% 24%", fx: "52% 84%" },
          { left: "13%", w: 65, h: 175, del: "0.16s", rot: "-5deg",  br: "42% 58% 20% 38%", fx: "45% 82%" },
          { left: "22%", w: 68, h: 155, del: "0.08s", rot:  "3deg",  br: "60% 40% 36% 22%", fx: "57% 86%" },
          { left: "31%", w: 70, h: 138, del: "0.22s", rot: "-7deg",  br: "46% 54% 24% 34%", fx: "43% 83%" },
          { left: "40%", w: 72, h: 122, del: "0.12s", rot:  "5deg",  br: "52% 48% 40% 18%", fx: "55% 85%" },
          { left: "49%", w: 74, h: 112, del: "0.04s", rot: "-2deg",  br: "48% 52% 28% 32%", fx: "50% 82%" },
          { left: "58%", w: 72, h: 122, del: "0.18s", rot:  "6deg",  br: "44% 56% 34% 26%", fx: "47% 84%" },
          { left: "67%", w: 68, h: 138, del: "0.10s", rot: "-4deg",  br: "58% 42% 22% 40%", fx: "54% 86%" },
          { left: "76%", w: 64, h: 155, del: "0.24s", rot:  "3deg",  br: "50% 50% 38% 20%", fx: "41% 83%" },
          { left: "85%", w: 60, h: 175, del: "0.06s", rot: "-6deg",  br: "45% 55% 18% 44%", fx: "58% 85%" },
          { left: "94%", w: 56, h: 195, del: "0.14s", rot:  "5deg",  br: "62% 38% 32% 28%", fx: "48% 82%" },
        ].map(({ left, w, h, del, rot, br, fx }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 0,
              left,
              width: w,
              height: h,
              background: `radial-gradient(ellipse at ${fx}, rgba(255,160,60,0.80) 0%, #ff6600 28%, #cc1800 58%, transparent 82%)`,
              borderRadius: br,
              rotate: rot,
              transformOrigin: "bottom center",
              animation: `fire-core 0.84s ${del} ease-in-out infinite`,
              filter: "blur(1.5px)",
            }}
          />
        ))}
      </div>
    </>
  );
}
