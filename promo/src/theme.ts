import { loadFont as loadSpace } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const display = loadSpace("normal", { weights: ["500", "700"], subsets: ["latin"] }).fontFamily;
export const mono = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const C = {
  bg: "#05070a",
  bg2: "#0b1016",
  panel: "rgba(10, 18, 26, 0.82)",
  line: "rgba(0, 229, 255, 0.18)",
  cyan: "#00e5ff",
  blue: "#2f7bff",
  ice: "#b8f6ff",
  text: "#e8f6fb",
  dim: "#6b8a99",
  green: "#3dffa8",
  red: "#ff4d6d",
};

export const glow = (color: string, r = 24) =>
  `0 0 ${r * 0.4}px ${color}, 0 0 ${r}px ${color}66, 0 0 ${r * 2.2}px ${color}22`;

export const textGlow = (color: string, r = 18) =>
  `0 0 ${r * 0.4}px ${color}aa, 0 0 ${r}px ${color}55`;
