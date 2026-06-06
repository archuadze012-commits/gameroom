"use client";

import { useEffect, useRef, type RefObject } from "react";

// One active lightning bolt fed from the storm system in GlobalBackground.
// offset: horizontal position in shader space (-aspect..aspect, 0 = center)
// hue:    HSV hue in degrees (our cyan ≈ 190, red ≈ 350)
// intensity: 0..1 brightness driven by the bolt's draw/strobe lifecycle
export type LightningBoltState = { offset: number; hue: number; intensity: number };

const MAX_BOLTS = 4;

// Plasma-bolt visual adapted from:
// https://21st.dev/community/components/ravikatiyar/rain-and-lightening-hero-section
// (fbm-displaced vertical glow). Extended to render multiple simultaneous bolts
// so our double/triple strikes keep working. Behaviour (timing/strikes/flash)
// stays in GlobalBackground — this module only draws.
const VERT_SRC = `
  attribute vec2 aPosition;
  void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAG_SRC = `
  precision mediump float;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uSize;
  uniform int uCount;
  uniform float uXOffsets[${MAX_BOLTS}];
  uniform float uHues[${MAX_BOLTS}];
  uniform float uBoltIntensities[${MAX_BOLTS}];

  #define OCTAVE_COUNT 10

  vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
  }
  float hash11(float p) {
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  mat2 rotate2d(float theta) {
    float c = cos(theta); float s = sin(theta);
    return mat2(c, -s, s, c);
  }
  float noise(vec2 p) {
    vec2 ip = floor(p); vec2 fp = fract(p);
    float a = hash12(ip);
    float b = hash12(ip + vec2(1.0, 0.0));
    float c = hash12(ip + vec2(0.0, 1.0));
    float d = hash12(ip + vec2(1.0, 1.0));
    vec2 t = smoothstep(0.0, 1.0, fp);
    return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
  }
  float fbm(vec2 p) {
    float value = 0.0; float amplitude = 0.5;
    for (int i = 0; i < OCTAVE_COUNT; ++i) {
      value += amplitude * noise(p);
      p *= rotate2d(0.45); p *= 2.0; amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv0 = gl_FragCoord.xy / iResolution.xy;
    uv0 = 2.0 * uv0 - 1.0;
    uv0.x *= iResolution.x / iResolution.y;

    vec3 col = vec3(0.0);
    for (int i = 0; i < ${MAX_BOLTS}; i++) {
      if (i >= uCount) break;
      vec2 uv = uv0;
      uv.x += uXOffsets[i];
      uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed + float(i) * 17.0) - 1.0;
      float dist = abs(uv.x);
      vec3 baseColor = hsv2rgb(vec3(uHues[i] / 360.0, 0.7, 0.85));
      col += baseColor * (mix(0.0, 0.07, hash11(iTime * uSpeed + float(i))) / dist)
             * uIntensity * uBoltIntensities[i];
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function LightningWebGL({
  boltsRef,
  active,
}: {
  boltsRef: RefObject<LightningBoltState[]>;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const vert = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uSpeed = gl.getUniformLocation(program, "uSpeed");
    const uIntensity = gl.getUniformLocation(program, "uIntensity");
    const uSize = gl.getUniformLocation(program, "uSize");
    const uCount = gl.getUniformLocation(program, "uCount");
    const uXOffsets = gl.getUniformLocation(program, "uXOffsets[0]");
    const uHues = gl.getUniformLocation(program, "uHues[0]");
    const uBoltIntensities = gl.getUniformLocation(program, "uBoltIntensities[0]");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener("resize", resize);
    resize();

    const offsets = new Float32Array(MAX_BOLTS);
    const hues = new Float32Array(MAX_BOLTS);
    const intensities = new Float32Array(MAX_BOLTS);
    const start = Date.now();
    let raf = 0;

    const render = () => {
      const ua = window.navigator.userAgent;
      const isWebview = /(gameroom|; wv\)|Electron|CEF|WebView|FBAN|FBAV|Instagram|Line\/|MicroMessenger)/i.test(ua) || 'ReactNativeWebView' in window || window.matchMedia('(display-mode: standalone)').matches || (/iPhone|iPad|iPod/i.test(ua) && !/Safari/i.test(ua));
      const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
      const prefersReduced = isMobileOrTablet && !isWebview;
      if (prefersReduced) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        raf = requestAnimationFrame(render);
        return;
      }

      const time = (Date.now() - start) * 0.001;
      const bolts = boltsRef.current ?? [];
      const count = Math.min(bolts.length, MAX_BOLTS);

      offsets.fill(0);
      hues.fill(230);
      intensities.fill(0);
      for (let i = 0; i < count; i++) {
        offsets[i] = bolts[i].offset;
        hues[i] = bolts[i].hue;
        intensities[i] = bolts[i].intensity;
      }

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uSpeed, 0.9);
      gl.uniform1f(uIntensity, 1.45);
      gl.uniform1f(uSize, 1.6);
      gl.uniform1i(uCount, count);
      gl.uniform1fv(uXOffsets, offsets);
      gl.uniform1fv(uHues, hues);
      gl.uniform1fv(uBoltIntensities, intensities);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      // Skip the expensive fragment shader raymarching if there are no active bolts!
      if (count > 0) {
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buffer);
    };
  }, [active, boltsRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[3] h-full w-full"
      style={{ mixBlendMode: "screen", opacity: active ? 1 : 0 }}
    />
  );
}
