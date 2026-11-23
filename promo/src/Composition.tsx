import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { DaemonScene, HookScene, LiveScene, OutroScene, PipelineScene } from "./scenes";
import { C } from "./theme";

export const T = 12;
export const SCENES = [180, 165, 135, 300, 168];
export const DURATION = SCENES.reduce((a, b) => a + b, 0) - T * (SCENES.length - 1);

const timing = linearTiming({ durationInFrames: T });

export const Promo: React.FC = () => {
  const { durationInFrames, fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES[0]}><HookScene /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES[1]}><PipelineScene /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES[2]}><DaemonScene /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES[3]}><LiveScene /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={SCENES[4]}><OutroScene /></TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) =>
          interpolate(f, [0, fps * 0.5, durationInFrames - fps * 2.5, durationInFrames], [0, 0.6, 0.6, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </AbsoluteFill>
  );
};
