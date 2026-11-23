import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { AudioLines, Cpu, Brain, Volume2, SkipForward, Globe, CloudRain, ShieldX, Star, Lock } from "lucide-react";
import { C, display, glow, mono, textGlow } from "./theme";
import { Cursor, HudBackground, HudFrame, Reactor, Tag, Terminal, typed, Waveform } from "./components";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const useSpring = (delay: number, config = { damping: 14, stiffness: 120 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config });
};

/* ───────────────────────── 1. HOOK ───────────────────────── */
export const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const wave = interpolate(f, [0, 18, 60, 80], [0.05, 1, 1, 0.55], clamp);
  const title = useSpring(52, { damping: 13, stiffness: 110 });
  const sub = useSpring(72);
  const tag = useSpring(26);
  const zoom = interpolate(f, [0, 180], [1.06, 1], { easing: Easing.out(Easing.cubic) });
  const waveY = interpolate(title, [0, 1], [0, 250]);
  const conf = Math.min(0.97, interpolate(f, [26, 46], [0.42, 0.97], clamp)).toFixed(2);

  return (
    <AbsoluteFill>
      <HudBackground />
      <HudFrame label="LISTENING" index="01" />
      <AbsoluteFill style={{ transform: `scale(${zoom})`, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", opacity: interpolate(f, [0, 30], [0, 0.9], clamp) }}>
          <Reactor size={760} intensity={interpolate(title, [0, 1], [1, 0.45])} />
        </div>

        <div style={{ position: "absolute", top: 160, fontFamily: mono, fontSize: 34, color: C.ice, letterSpacing: 6, textShadow: textGlow(C.cyan) }}>
          {typed(f, 4, '"Hey Jarvis"', 0.7)}
          {f < 46 && <Cursor />}
        </div>

        <div style={{ transform: `translateY(${waveY}px) scale(${interpolate(title, [0, 1], [1, 0.62])})` }}>
          <Waveform width={1300} height={300} energy={wave} bars={72} />
        </div>

        <div
          style={{
            position: "absolute",
            top: 250,
            opacity: tag * interpolate(f, [50, 62], [1, 0], clamp),
            transform: `scale(${interpolate(tag, [0, 1], [0.8, 1])})`,
          }}
        >
          <Tag color={C.green}>WAKE WORD DETECTED · {conf}</Tag>
        </div>

        <div style={{ position: "absolute", textAlign: "center", top: 330 }}>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 150,
              color: C.text,
              letterSpacing: -3,
              opacity: title,
              transform: `translateY(${interpolate(title, [0, 1], [60, 0])}px)`,
              textShadow: textGlow(C.cyan, 40),
            }}
          >
            Meet <span style={{ color: C.cyan }}>Jarvis</span>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 40,
              color: C.ice,
              letterSpacing: interpolate(sub, [0, 1], [30, 10]),
              opacity: sub,
              marginTop: 6,
            }}
          >
            MY PERSONAL AI ASSISTANT
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 2. LOCAL PIPELINE ───────────────────────── */
const nodes = [
  { icon: AudioLines, name: "Wake word", tech: "openWakeWord", where: "CPU" },
  { icon: Cpu, name: "Speech → Text", tech: "Whisper small.en", where: "GPU · warm", hero: true },
  { icon: Brain, name: "Brain", tech: "Ollama LLM", where: "qwen2.5 · localhost" },
  { icon: Volume2, name: "Voice", tech: "Piper TTS", where: "offline" },
];

export const PipelineScene: React.FC = () => {
  const f = useCurrentFrame();
  const head = useSpring(0);
  const line = interpolate(f, [20, 70], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const pulse = ((f - 40) % 50) / 50;
  const badge = useSpring(100);
  const W = 1560;

  return (
    <AbsoluteFill>
      <HudBackground />
      <HudFrame label="PIPELINE" index="02" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 20 }}>
        <div style={{ fontFamily: mono, fontSize: 24, letterSpacing: 8, color: C.cyan, opacity: head }}>ZERO CLOUD. ZERO WAITING.</div>
        <div
          style={{
            fontFamily: display,
            fontWeight: 700,
            fontSize: 96,
            color: C.text,
            letterSpacing: -2,
            opacity: head,
            transform: `translateY(${interpolate(head, [0, 1], [40, 0])}px)`,
          }}
        >
          Runs <span style={{ color: C.cyan, textShadow: textGlow(C.cyan, 30) }}>100% local.</span>
        </div>

        <div style={{ position: "relative", width: W, marginTop: 90, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ position: "absolute", left: 120, right: 120, top: "50%", height: 3, background: `${C.cyan}22` }} />
          <div
            style={{
              position: "absolute",
              left: 120,
              width: (W - 240) * line,
              top: "50%",
              height: 3,
              background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`,
              boxShadow: glow(C.cyan, 12),
            }}
          />
          {f > 40 && (
            <div
              style={{
                position: "absolute",
                left: 120 + (W - 240) * pulse - 14,
                top: "50%",
                marginTop: -13,
                width: 28,
                height: 28,
                borderRadius: 14,
                background: C.ice,
                boxShadow: glow(C.cyan, 26),
              }}
            />
          )}
          {nodes.map((n, i) => {
            const s = useSpring(14 + i * 9);
            const Icon = n.icon;
            const hero = !!n.hero;
            const heroGlow = hero ? interpolate(Math.sin(f * 0.15), [-1, 1], [0.6, 1]) : 0;
            return (
              <div
                key={n.name}
                style={{
                  width: hero ? 360 : 300,
                  padding: "34px 24px",
                  borderRadius: 20,
                  background: "#08111a",
                  border: `${hero ? 2.5 : 1.5}px solid ${hero ? C.cyan : C.cyan + "55"}`,
                  boxShadow: hero ? glow(C.cyan, 30 * heroGlow) : `0 0 30px ${C.cyan}11`,
                  textAlign: "center",
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px) scale(${hero ? 1.06 : 1})`,
                  zIndex: 2,
                }}
              >
                <Icon size={hero ? 76 : 60} color={C.cyan} strokeWidth={1.6} style={{ filter: `drop-shadow(0 0 10px ${C.cyan})` }} />
                <div style={{ fontFamily: display, fontWeight: 700, fontSize: hero ? 40 : 34, color: C.text, marginTop: 16 }}>{n.name}</div>
                <div style={{ fontFamily: mono, fontSize: hero ? 26 : 22, color: C.ice, marginTop: 8 }}>{n.tech}</div>
                <div style={{ fontFamily: mono, fontSize: 18, color: hero ? C.green : C.dim, marginTop: 10, letterSpacing: 3 }}>{n.where.toUpperCase()}</div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 80,
            opacity: badge,
            transform: `scale(${interpolate(badge, [0, 1], [0.85, 1])})`,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: mono,
            fontSize: 30,
            color: C.text,
          }}
        >
          <Lock size={32} color={C.green} />
          Your audio never leaves your machine.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 3. DAEMON ───────────────────────── */
const statusLines: { t: string; c?: string; at: number }[] = [
  { t: "● jarvis-daemon.service - Jarvis speech-to-text daemon", c: C.green, at: 28 },
  { t: "     Active: active (running)", c: C.green, at: 34 },
  { t: "     Socket: $XDG_RUNTIME_DIR/jarvis.sock", at: 40 },
  { t: "      Model: whisper small.en · cuda · float16", c: C.cyan, at: 46 },
  { t: "", at: 52 },
  { t: "● jarvis-wake.service - \"Hey Jarvis\" wake word listener", c: C.green, at: 56 },
  { t: "     Active: active (running)", c: C.green, at: 62 },
];

export const DaemonScene: React.FC = () => {
  const f = useCurrentFrame();
  const left = useSpring(0);
  const term = useSpring(6, { damping: 18, stiffness: 90 });
  const cmd = "systemctl --user status jarvis-*";
  const rotY = interpolate(term, [0, 1], [-28, -12]);

  return (
    <AbsoluteFill>
      <HudBackground hue={C.blue} />
      <HudFrame label="DAEMON" index="03" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 60 }}>
        <div style={{ width: 640, opacity: left, transform: `translateX(${interpolate(left, [0, 1], [-60, 0])}px)` }}>
          <div style={{ fontFamily: mono, fontSize: 24, color: C.cyan, letterSpacing: 8 }}>BACKGROUND DAEMON</div>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 92, lineHeight: 1.02, color: C.text, letterSpacing: -2, marginTop: 18 }}>
            Always warm.
            <br />
            <span style={{ color: C.cyan, textShadow: textGlow(C.cyan, 30) }}>Always ready.</span>
          </div>
          <div style={{ fontFamily: display, fontSize: 36, color: C.dim, marginTop: 30, lineHeight: 1.35 }}>
            Whisper stays loaded on the GPU. <span style={{ color: C.ice }}>No cold starts.</span> Just talk.
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 40, opacity: interpolate(f, [60, 75], [0, 1], clamp) }}>
            <Tag>systemd --user</Tag>
            <Tag>Unix socket</Tag>
          </div>
        </div>
        <div style={{ perspective: 1800, flex: 1 }}>
          <Terminal
            title="~ — zsh"
            width={1020}
            height={520}
            style={{ transform: `rotateY(${rotY}deg) rotateX(4deg)`, opacity: term, transformOrigin: "left center" }}
          >
            <div>
              <span style={{ color: C.cyan }}>❯ </span>
              {typed(f, 10, cmd, 2)}
              {f < 26 && <Cursor />}
            </div>
            {statusLines.map((l, i) =>
              f >= l.at ? (
                <div key={i} style={{ color: l.c ?? C.dim, whiteSpace: "pre", opacity: interpolate(f, [l.at, l.at + 5], [0, 1], clamp), fontSize: 23 }}>
                  {l.t || " "}
                </div>
              ) : null
            )}
          </Terminal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 4. LIVE CAPABILITIES ───────────────────────── */
type Exchange = { say: string; cmd: string; reply: string; icon: typeof Globe; label: string; ok: boolean; at: number };
const exchanges: Exchange[] = [
  { say: "set volume to 40 percent", cmd: "pactl set-sink-volume @DEFAULT_SINK@ 40%", reply: "Volume set to 40%.", icon: Volume2, label: "VOLUME 40%", ok: true, at: 14 },
  { say: "play the next song", cmd: "playerctl next", reply: "Next track.", icon: SkipForward, label: "NEXT TRACK", ok: true, at: 70 },
  { say: "open firefox", cmd: "firefox", reply: "Opening Firefox.", icon: Globe, label: "LAUNCH APP", ok: true, at: 120 },
  { say: "will it rain tomorrow?", cmd: "weather → wttr.in", reply: "Light rain after 3pm.", icon: CloudRain, label: "WEATHER", ok: true, at: 170 },
  { say: "delete all my files", cmd: "rm -rf ~", reply: "Sorry, I'm not allowed to run that.", icon: ShieldX, label: "BLOCKED", ok: false, at: 222 },
];

const ExchangeBlock: React.FC<{ e: Exchange }> = ({ e }) => {
  const f = useCurrentFrame();
  const local = f - e.at;
  const sayDone = e.at + Math.ceil(e.say.length / 1.6);
  const showCmd = f >= sayDone + 4;
  const showReply = f >= sayDone + 12;
  const col = e.ok ? C.green : C.red;
  return (
    <div style={{ marginBottom: 14, opacity: interpolate(local, [0, 4], [0, 1], clamp) }}>
      <div>
        <span style={{ color: C.cyan }}>🎙 </span>
        <span style={{ color: C.ice }}>"{typed(f, e.at, e.say, 1.6)}</span>
        {f >= sayDone ? <span style={{ color: C.ice }}>"</span> : <Cursor />}
      </div>
      {showCmd && (
        <div style={{ color: e.ok ? C.dim : C.red, paddingLeft: 40 }}>
          <span style={{ color: col }}>{e.ok ? "→ $ " : "✗ $ "}</span>
          <span style={{ textDecoration: e.ok ? "none" : "line-through" }}>{e.cmd}</span>
          {!e.ok && <span style={{ color: C.red, marginLeft: 16, fontSize: 20, letterSpacing: 2 }}>[NOT ON ALLOWLIST]</span>}
        </div>
      )}
      {showReply && (
        <div style={{ paddingLeft: 40, color: col }}>
          {e.ok ? "✓ " : "⛔ "}
          <span style={{ color: C.text }}>{e.reply}</span>
        </div>
      )}
    </div>
  );
};

export const LiveScene: React.FC = () => {
  const f = useCurrentFrame();
  const head = useSpring(0);
  const term = useSpring(4, { damping: 18, stiffness: 90 });
  const active = [...exchanges].reverse().find((e) => f >= e.at) ?? exchanges[0];
  const activeIdx = exchanges.indexOf(active);
  const cardS = useSpring(active.at + 10, { damping: 12, stiffness: 140 });
  const Icon = active.icon;
  const col = active.ok ? C.cyan : C.red;
  // Scroll the terminal up as new exchanges arrive
  const scroll = interpolate(f, [214, 228], [0, 131], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const vol = interpolate(f, [30, 50], [72, 40], clamp);

  return (
    <AbsoluteFill>
      <HudBackground hue={active.ok ? C.cyan : C.red} />
      <HudFrame label="LIVE // jarvis-ctl assist" index="04" />
      <AbsoluteFill style={{ padding: "130px 110px 0", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, opacity: head, transform: `translateY(${interpolate(head, [0, 1], [30, 0])}px)` }}>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 80, color: C.text, letterSpacing: -2 }}>
            Say it. <span style={{ color: C.cyan, textShadow: textGlow(C.cyan, 30) }}>It's done.</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 50, marginTop: 40, alignItems: "flex-start" }}>
          <div style={{ perspective: 2000 }}>
            <Terminal
              title="jarvis-ctl — assist"
              width={1140}
              height={660}
              style={{ transform: `rotateY(${interpolate(term, [0, 1], [18, 7])}deg) rotateX(3deg)`, opacity: term, transformOrigin: "right center" }}
            >
              <div style={{ height: 560, overflow: "hidden" }}><div style={{ transform: `translateY(${-scroll}px)` }}>
                {exchanges.map((e) => (f >= e.at ? <ExchangeBlock key={e.say} e={e} /> : null))}
              </div></div>
            </Terminal>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                height: 400,
                borderRadius: 22,
                background: C.panel,
                border: `2px solid ${col}`,
                boxShadow: glow(col, 26),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${interpolate(cardS, [0, 1], [0.88, 1])})`,
                opacity: interpolate(cardS, [0, 1], [0.4, 1]),
              }}
            >
              <Icon size={150} color={col} strokeWidth={1.4} style={{ filter: `drop-shadow(0 0 18px ${col})` }} />
              <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 38, color: col, letterSpacing: 6, marginTop: 28, textShadow: textGlow(col) }}>
                {active.label}
              </div>
            </div>
            <div style={{ borderRadius: 16, background: C.panel, border: `1.5px solid ${C.cyan}44`, padding: "22px 26px", fontFamily: mono, fontSize: 20, color: C.dim }}>
              <div style={{ display: "flex", justifyContent: "space-between", letterSpacing: 3 }}>
                <span>OUTPUT VOL</span>
                <span style={{ color: C.cyan }}>{Math.round(vol)}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 5, background: `${C.cyan}18`, marginTop: 12 }}>
                <div style={{ width: `${vol}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`, boxShadow: glow(C.cyan, 8) }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                {exchanges.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: i <= activeIdx ? (e.ok ? C.cyan : C.red) : `${C.cyan}22`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ───────────────────────── 5. OUTRO ───────────────────────── */
export const OutroScene: React.FC = () => {
  const f = useCurrentFrame();
  const title = useSpring(4, { damping: 12, stiffness: 100 });
  const tag = useSpring(22);
  const gh = useSpring(40);
  const cmd = useSpring(56);
  const sweep = interpolate(f, [10, 50], [-30, 130], clamp);

  return (
    <AbsoluteFill>
      <HudBackground />
      <HudFrame label="ONLINE" index="05" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", opacity: 0.32 * title, transform: `scale(${interpolate(title, [0, 1], [0.6, 1])})` }}>
          <Reactor size={900} />
        </div>
        <div style={{ position: "absolute", bottom: 90, opacity: 0.35 }}>
          <Waveform width={1500} height={90} bars={90} energy={0.6} />
        </div>

        <div style={{ textAlign: "center", zIndex: 2, marginTop: -40 }}>
          <div
            style={{
              fontFamily: display,
              fontWeight: 700,
              fontSize: 230,
              letterSpacing: 24,
              lineHeight: 1,
              color: "transparent",
              backgroundImage: `linear-gradient(100deg, ${C.cyan} 0%, ${C.ice} ${sweep - 12}%, #ffffff ${sweep}%, ${C.ice} ${sweep + 12}%, ${C.blue} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              filter: `drop-shadow(0 0 30px ${C.cyan}77)`,
              opacity: title,
              transform: `scale(${interpolate(title, [0, 1], [1.25, 1])})`,
              marginRight: -24,
            }}
          >
            JARVIS
          </div>
          <div style={{ fontFamily: mono, fontSize: 36, color: C.ice, letterSpacing: 10, marginTop: 20, opacity: tag }}>
            PRIVATE · LOCAL · OPEN SOURCE
          </div>

          <div
            style={{
              marginTop: 56,
              display: "inline-flex",
              alignItems: "center",
              gap: 20,
              padding: "22px 40px",
              borderRadius: 999,
              border: `2px solid ${C.cyan}`,
              background: `${C.cyan}14`,
              boxShadow: glow(C.cyan, 22),
              opacity: gh,
              transform: `translateY(${interpolate(gh, [0, 1], [30, 0])}px)`,
            }}
          >
            <svg width={44} height={44} viewBox="0 0 24 24" fill={C.text}><path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
            <span style={{ fontFamily: mono, fontSize: 38, color: C.text }}>github.com/Saroj-Pedada/jarvis-linux</span>
            <Star size={38} color="#ffd65a" fill="#ffd65a" />
          </div>

          <div style={{ marginTop: 34, fontFamily: mono, fontSize: 30, color: C.dim, opacity: cmd }}>
            <span style={{ color: C.cyan }}>❯ </span>
            {typed(f, 60, "./install.sh --deps", 1.2)}
            <Cursor />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
