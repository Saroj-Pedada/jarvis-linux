import React from "react";
import { Composition } from "remotion";
import { DURATION, Promo } from "./Composition";

export const RemotionRoot: React.FC = () => (
  <Composition id="Promo-Landscape" component={Promo} durationInFrames={DURATION} fps={30} width={1920} height={1080} />
);
