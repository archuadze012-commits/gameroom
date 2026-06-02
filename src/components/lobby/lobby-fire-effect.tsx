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
          bottom: 10,
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
          bottom: -45,
          height: 0,
          filter: "blur(6px)",
          mixBlendMode: "screen",
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        {/* outer tongues — red, U-curve with tall edges */}
        {[
          { left: "0%",  w: 90,  h: 345, dur: "1.40s", del: "0s",    rot: "-4deg", br: "52% 48% 35% 22%", fx: "48% 90%" },
          { left: "5%",  w: 80,  h: 325, dur: "1.26s", del: "0.10s", rot:  "6deg", br: "44% 56% 22% 38%", fx: "55% 86%" },
          { left: "10%", w: 90,  h: 305, dur: "1.32s", del: "0.20s", rot: "-2deg", br: "60% 40% 28% 32%", fx: "42% 88%" },
          { left: "15%", w: 85,  h: 282, dur: "1.22s", del: "0.06s", rot:  "5deg", br: "46% 54% 40% 18%", fx: "58% 85%" },
          { left: "20%", w: 95,  h: 258, dur: "1.18s", del: "0.16s", rot: "-7deg", br: "55% 45% 18% 42%", fx: "45% 92%" },
          { left: "25%", w: 88,  h: 232, dur: "1.34s", del: "0.26s", rot:  "3deg", br: "48% 52% 34% 26%", fx: "52% 87%" },
          { left: "30%", w: 92,  h: 207, dur: "1.28s", del: "0.04s", rot: "-5deg", br: "62% 38% 26% 44%", fx: "40% 89%" },
          { left: "35%", w: 85,  h: 184, dur: "1.38s", del: "0.14s", rot:  "8deg", br: "43% 57% 42% 20%", fx: "60% 84%" },
          { left: "40%", w: 98,  h: 164, dur: "1.24s", del: "0.22s", rot: "-3deg", br: "50% 50% 30% 30%", fx: "50% 91%" },
          { left: "45%", w: 100, h: 150, dur: "1.42s", del: "0.08s", rot:  "4deg", br: "57% 43% 20% 38%", fx: "46% 86%" },
          { left: "50%", w: 95,  h: 144, dur: "1.30s", del: "0.18s", rot: "-6deg", br: "41% 59% 38% 24%", fx: "54% 88%" },
          { left: "55%", w: 100, h: 150, dur: "1.36s", del: "0.28s", rot:  "2deg", br: "54% 46% 24% 36%", fx: "48% 90%" },
          { left: "60%", w: 92,  h: 164, dur: "1.20s", del: "0.12s", rot: "-8deg", br: "47% 53% 44% 16%", fx: "56% 85%" },
          { left: "65%", w: 88,  h: 184, dur: "1.32s", del: "0.24s", rot:  "5deg", br: "63% 37% 18% 46%", fx: "43% 87%" },
          { left: "70%", w: 85,  h: 207, dur: "1.26s", del: "0.02s", rot: "-2deg", br: "49% 51% 36% 28%", fx: "51% 89%" },
          { left: "75%", w: 80,  h: 232, dur: "1.40s", del: "0.16s", rot:  "7deg", br: "44% 56% 28% 34%", fx: "57% 86%" },
          { left: "80%", w: 85,  h: 258, dur: "1.28s", del: "0.10s", rot: "-4deg", br: "58% 42% 22% 40%", fx: "44% 91%" },
          { left: "85%", w: 78,  h: 282, dur: "1.34s", del: "0.20s", rot:  "3deg", br: "45% 55% 40% 22%", fx: "53% 88%" },
          { left: "90%", w: 82,  h: 305, dur: "1.22s", del: "0.06s", rot: "-6deg", br: "61% 39% 32% 30%", fx: "47% 84%" },
          { left: "95%", w: 75,  h: 325, dur: "1.38s", del: "0.14s", rot:  "5deg", br: "42% 58% 26% 36%", fx: "59% 87%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: `radial-gradient(ellipse at ${fx}, rgba(180,10,0,0.92) 0%, rgba(210,25,0,0.55) 45%, transparent 80%)`,
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-tongue ${dur} ${del} ease-in-out infinite` }} />
        ))}

        {/* mid tongues — orange vivid, U-curve */}
        {[
          { left: "2%",  w: 85,  h: 358, dur: "1.06s", del: "0.12s", rot:  "5deg", br: "56% 44% 20% 38%", fx: "53% 87%" },
          { left: "7%",  w: 90,  h: 340, dur: "1.00s", del: "0.04s", rot: "-3deg", br: "43% 57% 36% 26%", fx: "45% 85%" },
          { left: "12%", w: 88,  h: 318, dur: "1.12s", del: "0.18s", rot:  "7deg", br: "61% 39% 24% 42%", fx: "58% 90%" },
          { left: "17%", w: 92,  h: 294, dur: "1.04s", del: "0.08s", rot: "-5deg", br: "47% 53% 40% 20%", fx: "42% 88%" },
          { left: "22%", w: 95,  h: 268, dur: "1.10s", del: "0.22s", rot:  "2deg", br: "52% 48% 28% 34%", fx: "55% 86%" },
          { left: "27%", w: 90,  h: 244, dur: "0.98s", del: "0.14s", rot: "-7deg", br: "38% 62% 18% 46%", fx: "48% 91%" },
          { left: "32%", w: 95,  h: 220, dur: "1.14s", del: "0.02s", rot:  "4deg", br: "58% 42% 32% 26%", fx: "40% 87%" },
          { left: "37%", w: 100, h: 198, dur: "1.06s", del: "0.26s", rot: "-2deg", br: "45% 55% 44% 18%", fx: "56% 84%" },
          { left: "42%", w: 102, h: 176, dur: "1.02s", del: "0.10s", rot:  "6deg", br: "64% 36% 22% 40%", fx: "44% 89%" },
          { left: "47%", w: 105, h: 158, dur: "1.10s", del: "0.20s", rot: "-4deg", br: "50% 50% 38% 24%", fx: "52% 86%" },
          { left: "52%", w: 102, h: 152, dur: "1.04s", del: "0.06s", rot:  "3deg", br: "42% 58% 26% 36%", fx: "47% 90%" },
          { left: "57%", w: 98,  h: 158, dur: "1.12s", del: "0.16s", rot: "-6deg", br: "55% 45% 42% 20%", fx: "60% 85%" },
          { left: "62%", w: 94,  h: 176, dur: "1.00s", del: "0.28s", rot:  "8deg", br: "46% 54% 18% 44%", fx: "43% 88%" },
          { left: "67%", w: 90,  h: 198, dur: "1.08s", del: "0.04s", rot: "-3deg", br: "59% 41% 30% 32%", fx: "54% 87%" },
          { left: "72%", w: 86,  h: 220, dur: "1.02s", del: "0.18s", rot:  "5deg", br: "44% 56% 36% 22%", fx: "49% 91%" },
          { left: "77%", w: 82,  h: 244, dur: "1.14s", del: "0.12s", rot: "-5deg", br: "48% 52% 20% 42%", fx: "57% 86%" },
          { left: "82%", w: 85,  h: 268, dur: "1.06s", del: "0.22s", rot:  "2deg", br: "62% 38% 40% 24%", fx: "41% 89%" },
          { left: "87%", w: 80,  h: 294, dur: "1.10s", del: "0.08s", rot: "-8deg", br: "40% 60% 28% 38%", fx: "55% 84%" },
          { left: "92%", w: 78,  h: 318, dur: "1.00s", del: "0.14s", rot:  "4deg", br: "53% 47% 34% 28%", fx: "46% 88%" },
          { left: "97%", w: 72,  h: 340, dur: "1.08s", del: "0.24s", rot: "-3deg", br: "47% 53% 22% 40%", fx: "61% 87%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: `radial-gradient(ellipse at ${fx}, rgba(200,30,0,0.95) 0%, rgba(230,55,0,0.70) 40%, rgba(180,15,0,0.30) 70%, transparent 88%)`,
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-tongue ${dur} ${del} ease-in-out infinite` }} />
        ))}

        {/* inner cores — yellow, U-curve */}
        {[
          { left: "4%",  w: 60, h: 320, del: "0s",    rot:  "4deg", br: "55% 45% 30% 24%", fx: "52% 84%" },
          { left: "13%", w: 65, h: 292, del: "0.16s", rot: "-5deg", br: "42% 58% 20% 38%", fx: "45% 82%" },
          { left: "22%", w: 68, h: 260, del: "0.08s", rot:  "3deg", br: "60% 40% 36% 22%", fx: "57% 86%" },
          { left: "31%", w: 70, h: 226, del: "0.22s", rot: "-7deg", br: "46% 54% 24% 34%", fx: "43% 83%" },
          { left: "40%", w: 72, h: 192, del: "0.12s", rot:  "5deg", br: "52% 48% 40% 18%", fx: "55% 85%" },
          { left: "49%", w: 74, h: 172, del: "0.04s", rot: "-2deg", br: "48% 52% 28% 32%", fx: "50% 82%" },
          { left: "58%", w: 72, h: 192, del: "0.18s", rot:  "6deg", br: "44% 56% 34% 26%", fx: "47% 84%" },
          { left: "67%", w: 68, h: 226, del: "0.10s", rot: "-4deg", br: "58% 42% 22% 40%", fx: "54% 86%" },
          { left: "76%", w: 64, h: 260, del: "0.24s", rot:  "3deg", br: "50% 50% 38% 20%", fx: "41% 83%" },
          { left: "85%", w: 60, h: 292, del: "0.06s", rot: "-6deg", br: "45% 55% 18% 44%", fx: "58% 85%" },
          { left: "94%", w: 56, h: 320, del: "0.14s", rot:  "5deg", br: "62% 38% 32% 28%", fx: "48% 82%" },
        ].map(({ left, w, h, del, rot, br, fx }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: `radial-gradient(ellipse at ${fx}, rgba(255,160,60,0.80) 0%, #ff6600 28%, #cc1800 58%, transparent 82%)`,
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-core 0.84s ${del} ease-in-out infinite`, filter: "blur(1.5px)" }} />
        ))}

        {/* corner boosters */}
        {[
          { left: "-2%", w: 110, h: 390, dur: "1.18s", del: "0s",    rot: "-6deg", br: "54% 46% 30% 28%", fx: "50% 88%" },
          { left: "3%",  w: 100, h: 415, dur: "1.32s", del: "0.09s", rot:  "3deg", br: "46% 54% 22% 36%", fx: "44% 86%" },
          { left: "8%",  w: 95,  h: 388, dur: "1.24s", del: "0.18s", rot: "-4deg", br: "60% 40% 34% 24%", fx: "56% 90%" },
          { left: "13%", w: 90,  h: 360, dur: "1.38s", del: "0.06s", rot:  "7deg", br: "42% 58% 26% 38%", fx: "48% 87%" },
          { left: "18%", w: 85,  h: 330, dur: "1.14s", del: "0.14s", rot: "-2deg", br: "52% 48% 40% 20%", fx: "53% 85%" },
          { left: "79%", w: 85,  h: 330, dur: "1.20s", del: "0.11s", rot:  "2deg", br: "48% 52% 20% 40%", fx: "47% 85%" },
          { left: "84%", w: 90,  h: 360, dur: "1.34s", del: "0.05s", rot: "-7deg", br: "58% 42% 38% 26%", fx: "52% 87%" },
          { left: "89%", w: 95,  h: 388, dur: "1.26s", del: "0.19s", rot:  "4deg", br: "40% 60% 24% 34%", fx: "44% 90%" },
          { left: "94%", w: 100, h: 415, dur: "1.16s", del: "0.08s", rot: "-3deg", br: "54% 46% 36% 22%", fx: "56% 86%" },
          { left: "99%", w: 110, h: 390, dur: "1.40s", del: "0.15s", rot:  "6deg", br: "44% 56% 28% 32%", fx: "50% 88%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: `radial-gradient(ellipse at ${fx}, rgba(200,15,0,0.90) 0%, rgba(230,45,0,0.60) 42%, transparent 82%)`,
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-tongue ${dur} ${del} ease-in-out infinite` }} />
        ))}

        {/* needle spikes — narrow, very tall */}
        {[
          { left: "1%",  w: 28, h: 450, dur: "1.52s", del: "0.07s", rot: "-11deg", br: "40% 60% 12% 18%", fx: "44% 82%" },
          { left: "6%",  w: 32, h: 480, dur: "1.38s", del: "0.22s", rot:   "8deg", br: "55% 45% 18% 12%", fx: "56% 78%" },
          { left: "11%", w: 25, h: 462, dur: "1.60s", del: "0.14s", rot:  "-5deg", br: "48% 52% 10% 22%", fx: "42% 80%" },
          { left: "18%", w: 30, h: 425, dur: "1.44s", del: "0.30s", rot:  "12deg", br: "36% 64% 20% 14%", fx: "60% 84%" },
          { left: "24%", w: 26, h: 395, dur: "1.56s", del: "0.05s", rot:  "-8deg", br: "52% 48% 14% 20%", fx: "46% 79%" },
          { left: "31%", w: 29, h: 365, dur: "1.42s", del: "0.19s", rot:   "6deg", br: "44% 56% 22% 10%", fx: "54% 82%" },
          { left: "38%", w: 24, h: 338, dur: "1.62s", del: "0.11s", rot: "-10deg", br: "58% 42% 16% 24%", fx: "40% 80%" },
          { left: "44%", w: 31, h: 312, dur: "1.36s", del: "0.26s", rot:   "4deg", br: "46% 54% 18% 16%", fx: "52% 83%" },
          { left: "50%", w: 27, h: 300, dur: "1.50s", del: "0.08s", rot:  "-3deg", br: "50% 50% 12% 20%", fx: "48% 81%" },
          { left: "56%", w: 31, h: 312, dur: "1.40s", del: "0.23s", rot:   "9deg", br: "42% 58% 20% 12%", fx: "55% 83%" },
          { left: "62%", w: 24, h: 338, dur: "1.58s", del: "0.16s", rot:  "-6deg", br: "56% 44% 14% 22%", fx: "44% 80%" },
          { left: "69%", w: 29, h: 365, dur: "1.46s", del: "0.04s", rot:  "10deg", br: "38% 62% 22% 18%", fx: "58% 82%" },
          { left: "76%", w: 26, h: 395, dur: "1.54s", del: "0.28s", rot:  "-7deg", br: "52% 48% 16% 14%", fx: "46% 79%" },
          { left: "82%", w: 30, h: 425, dur: "1.32s", del: "0.12s", rot:  "11deg", br: "44% 56% 12% 24%", fx: "53% 84%" },
          { left: "88%", w: 25, h: 462, dur: "1.64s", del: "0.20s", rot:  "-9deg", br: "60% 40% 20% 16%", fx: "40% 80%" },
          { left: "93%", w: 32, h: 480, dur: "1.38s", del: "0.06s", rot:   "7deg", br: "46% 54% 10% 22%", fx: "57% 78%" },
          { left: "98%", w: 28, h: 450, dur: "1.56s", del: "0.17s", rot: "-12deg", br: "54% 46% 18% 14%", fx: "43% 82%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: `radial-gradient(ellipse at ${fx}, rgba(220,30,0,0.75) 0%, rgba(180,10,0,0.45) 50%, transparent 85%)`,
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-tongue ${dur} ${del} ease-in-out infinite`, filter: "blur(2px)" }} />
        ))}

        {/* blue accent flames, U-curve */}
        {[
          { left: "3%",  w: 50, h: 310, dur: "1.48s", del: "0.11s", rot:  "-7deg", br: "50% 50% 20% 28%", fx: "48% 85%" },
          { left: "14%", w: 44, h: 280, dur: "1.62s", del: "0.27s", rot:   "9deg", br: "42% 58% 26% 18%", fx: "55% 82%" },
          { left: "26%", w: 48, h: 250, dur: "1.36s", del: "0.04s", rot:  "-5deg", br: "58% 42% 18% 30%", fx: "44% 87%" },
          { left: "36%", w: 40, h: 225, dur: "1.54s", del: "0.20s", rot:  "11deg", br: "46% 54% 30% 16%", fx: "52% 83%" },
          { left: "48%", w: 46, h: 205, dur: "1.44s", del: "0.08s", rot:  "-4deg", br: "54% 46% 22% 24%", fx: "47% 86%" },
          { left: "58%", w: 40, h: 225, dur: "1.58s", del: "0.24s", rot:   "6deg", br: "44% 56% 28% 20%", fx: "53% 83%" },
          { left: "68%", w: 48, h: 250, dur: "1.38s", del: "0.13s", rot: "-10deg", br: "56% 44% 16% 30%", fx: "43% 87%" },
          { left: "79%", w: 44, h: 280, dur: "1.66s", del: "0.06s", rot:   "8deg", br: "48% 52% 24% 22%", fx: "57% 82%" },
          { left: "90%", w: 50, h: 310, dur: "1.42s", del: "0.18s", rot:  "-6deg", br: "52% 48% 20% 26%", fx: "46% 85%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: `radial-gradient(ellipse at ${fx}, rgba(80,180,255,0.70) 0%, rgba(40,120,255,0.45) 42%, rgba(20,60,200,0.20) 68%, transparent 88%)`,
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-tongue ${dur} ${del} ease-in-out infinite`,
            filter: "blur(3px)", mixBlendMode: "screen" }} />
        ))}

        {/* center-right fill — extra flames for sparse mid zone */}
        {[
          { left: "46%", w: 80,  h: 200, dur: "1.28s", del: "0.07s", rot:  "-3deg", br: "52% 48% 28% 34%", fx: "50% 88%" },
          { left: "51%", w: 90,  h: 220, dur: "1.44s", del: "0.21s", rot:   "5deg", br: "44% 56% 32% 22%", fx: "46% 86%" },
          { left: "57%", w: 85,  h: 210, dur: "1.36s", del: "0.12s", rot:  "-6deg", br: "58% 42% 24% 38%", fx: "54% 89%" },
          { left: "63%", w: 92,  h: 225, dur: "1.52s", del: "0.28s", rot:   "4deg", br: "46% 54% 36% 20%", fx: "48% 87%" },
          { left: "68%", w: 78,  h: 205, dur: "1.40s", del: "0.09s", rot:  "-8deg", br: "54% 46% 20% 32%", fx: "52% 85%" },
        ].map(({ left, w, h, dur, del, rot, br, fx }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: `radial-gradient(ellipse at ${fx}, rgba(190,15,0,0.88) 0%, rgba(220,40,0,0.58) 44%, transparent 82%)`,
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-tongue ${dur} ${del} ease-in-out infinite` }} />
        ))}

        {/* wide base — short, broad, anchors fire to ground */}
        {[
          { left: "-3%", w: 200, h: 95,  dur: "1.70s", del: "0s",    rot:  "2deg", br: "55% 45% 48% 52%" },
          { left: "8%",  w: 220, h: 105, dur: "1.55s", del: "0.18s", rot: "-3deg", br: "48% 52% 44% 56%" },
          { left: "19%", w: 210, h: 90,  dur: "1.80s", del: "0.09s", rot:  "4deg", br: "60% 40% 52% 48%" },
          { left: "30%", w: 215, h: 100, dur: "1.62s", del: "0.24s", rot: "-2deg", br: "44% 56% 50% 50%" },
          { left: "41%", w: 225, h: 88,  dur: "1.74s", del: "0.06s", rot:  "3deg", br: "52% 48% 46% 54%" },
          { left: "52%", w: 225, h: 88,  dur: "1.68s", del: "0.15s", rot: "-4deg", br: "46% 54% 54% 46%" },
          { left: "63%", w: 215, h: 100, dur: "1.58s", del: "0.21s", rot:  "2deg", br: "56% 44% 48% 52%" },
          { left: "74%", w: 210, h: 90,  dur: "1.76s", del: "0.10s", rot: "-3deg", br: "42% 58% 52% 48%" },
          { left: "85%", w: 220, h: 105, dur: "1.52s", del: "0.27s", rot:  "5deg", br: "50% 50% 44% 56%" },
          { left: "96%", w: 200, h: 95,  dur: "1.72s", del: "0.03s", rot: "-2deg", br: "58% 42% 50% 50%" },
        ].map(({ left, w, h, dur, del, rot, br }, i) => (
          <div key={i} style={{ position: "absolute", bottom: 0, left, width: w, height: h,
            background: "radial-gradient(ellipse at 50% 95%, rgba(160,8,0,0.80) 0%, rgba(200,20,0,0.45) 55%, transparent 85%)",
            borderRadius: br, rotate: rot, transformOrigin: "bottom center",
            animation: `fire-core ${dur} ${del} ease-in-out infinite`, filter: "blur(7px)" }} />
        ))}
      </div>
    </>
  );
}
