import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, glow, mono } from "./theme";

/** Deep charcoal backdrop with a slowly drifting HUD grid, vignette and scanlines. */
export const HudBackground: React.FC<{ hue?: string }> = ({ hue = C.cyan }) => {
  const f = useCurrentFrame();
  const drift = (f * 0.6) % 80;
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${C.line} 1px, transparent 1px), linear-gradient(90deg, ${C.line} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          backgroundPosition: `${drift}px ${drift}px`,
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${hue}14, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75))" }} />
    </AbsoluteFill>
  );
};

/** Corner brackets + tiny status readouts framing the whole screen. */
export const HudFrame: React.FC<{ label: string; index: string }> = ({ label, index }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const corner = (pos: React.CSSProperties, rot: number) => (
    <div
      style={{
        position: "absolute",
        width: 46,
        height: 46,
        borderTop: `2px solid ${C.cyan}`,
        borderLeft: `2px solid ${C.cyan}`,
        transform: `rotate(${rot}deg)`,
        opacity: 0.7,
        ...pos,
      }}
    />
  );
  const blink = Math.floor(f / 15) % 2 === 0;
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
      {corner({ top: 40, left: 40 }, 0)}
      {corner({ top: 40, right: 40 }, 90)}
      {corner({ bottom: 40, right: 40 }, 180)}
      {corner({ bottom: 40, left: 40 }, 270)}
      <div style={{ position: "absolute", top: 52, left: 110, fontFamily: mono, fontSize: 18, color: C.cyan, letterSpacing: 4, opacity: 0.85 }}>
        <span style={{ color: blink ? C.cyan : "transparent" }}>●</span> {label}
      </div>
      <div style={{ position: "absolute", top: 52, right: 110, fontFamily: mono, fontSize: 18, color: C.dim, letterSpacing: 4 }}>
        {index} // LOCAL
      </div>
    </AbsoluteFill>
  );
};

/** Audio-reactive-looking waveform built from summed sines (deterministic per frame). */
export const Waveform: React.FC<{
  bars?: number;
  width: number;
  height: number;
  energy?: number;
  color?: string;
}> = ({ bars = 64, width, height, energy = 1, color = C.cyan }) => {
  const f = useCurrentFrame();
  const gap = 6;
  const bw = (width - gap * (bars - 1)) / bars;
  return (
    <div style={{ display: "flex", alignItems: "center", gap, width, height }}>
      {new Array(bars).fill(0).map((_, i) => {
        const x = i / (bars - 1);
        const env = Math.sin(Math.PI * x) ** 1.4;
        const v =
          0.55 * Math.abs(Math.sin(f * 0.21 + i * 0.47)) +
          0.3 * Math.abs(Math.sin(f * 0.13 - i * 0.29 + 1.3)) +
          0.15 * Math.abs(Math.sin(f * 0.37 + i * 1.1));
        const h = Math.max(4, height * env * v * energy);
        const mix = i / bars;
        return (
          <div
            key={i}
            style={{
              width: bw,
              height: h,
              borderRadius: bw,
              background: `linear-gradient(180deg, ${C.ice}, ${color} ${40 + mix * 20}%, ${C.blue})`,
              boxShadow: glow(color, 10),
            }}
          />
        );
      })}
    </div>
  );
};

/** Concentric rotating "reactor" rings. */
export const Reactor: React.FC<{ size: number; intensity?: number }> = ({ size, intensity = 1 }) => {
  const f = useCurrentFrame();
  const ring = (s: number, rot: number, dash: string, w: number, op: number) => (
    <svg
      width={size * s}
      height={size * s}
      viewBox="0 0 100 100"
      style={{ position: "absolute", left: (size - size * s) / 2, top: (size - size * s) / 2, transform: `rotate(${rot}deg)`, opacity: op * intensity }}
    >
      <circle cx="50" cy="50" r={48} fill="none" stroke={C.cyan} strokeWidth={w} strokeDasharray={dash} />
    </svg>
  );
  return (
    <div style={{ position: "relative", width: size, height: size, filter: `drop-shadow(0 0 12px ${C.cyan}88)` }}>
      {ring(1, f * 0.6, "2 3", 0.5, 0.5)}
      {ring(0.84, -f * 1.1, "40 10 6 10", 0.9, 0.85)}
      {ring(0.68, f * 1.8, "12 6", 0.6, 0.6)}
      {ring(0.52, -f * 0.8, "70 30", 1.4, 0.9)}
    </div>
  );
};

/** Pill-shaped HUD tag. */
export const Tag: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = C.cyan, style }) => (
  <div
    style={{
      fontFamily: mono,
      fontSize: 22,
      letterSpacing: 3,
      color,
      border: `1.5px solid ${color}88`,
      background: `${color}12`,
      padding: "10px 20px",
      borderRadius: 6,
      boxShadow: `inset 0 0 18px ${color}22`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Returns substring of text "typed" from startFrame at cps chars/sec (30fps). */
export const typed = (frame: number, start: number, text: string, charsPerFrame = 1.4) => {
  const n = Math.max(0, Math.floor((frame - start) * charsPerFrame));
  return text.slice(0, n);
};

export const Cursor: React.FC<{ color?: string }> = ({ color = C.cyan }) => {
  const f = useCurrentFrame();
  return <span style={{ display: "inline-block", width: "0.55em", height: "1em", background: color, opacity: Math.floor(f / 8) % 2 ? 0 : 1, verticalAlign: "-0.15em", marginLeft: 3 }} />;
};

/** macOS-agnostic terminal chrome with a cyan HUD border. */
export const Terminal: React.FC<{ title: string; width: number; height: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  title,
  width,
  height,
  children,
  style,
}) => (
  <div
    style={{
      width,
      height,
      background: "linear-gradient(180deg, rgba(12,20,28,0.96), rgba(6,10,14,0.96))",
      border: `1.5px solid ${C.cyan}55`,
      borderRadius: 16,
      boxShadow: `0 40px 120px rgba(0,0,0,0.7), 0 0 60px ${C.cyan}22, inset 0 0 40px ${C.cyan}0d`,
      overflow: "hidden",
      ...style,
    }}
  >
    <div style={{ height: 52, display: "flex", alignItems: "center", gap: 10, padding: "0 22px", borderBottom: `1px solid ${C.cyan}22`, background: "rgba(0,229,255,0.04)" }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c, opacity: 0.85 }} />
      ))}
      <div style={{ flex: 1, textAlign: "center", fontFamily: mono, fontSize: 18, color: C.dim, marginRight: 60 }}>{title}</div>
    </div>
    <div style={{ padding: "26px 32px", fontFamily: mono, fontSize: 25, lineHeight: 1.55, color: C.text }}>{children}</div>
  </div>
);
