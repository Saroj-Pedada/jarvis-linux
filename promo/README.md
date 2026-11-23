# Jarvis promo video

30-second 1920×1080 promo built with [Remotion](https://www.remotion.dev).

```bash
cd promo
npm install
# background music (not committed): any mp3 placed at public/music.mp3
cp /path/to/track.mp3 public/music.mp3
npx remotion studio                                   # preview
npx remotion render Promo-Landscape out/jarvis-promo-landscape.mp4 --crf 16
```

- Scene lengths and transitions: `src/Composition.tsx`
- Scene content (text, terminal mockups): `src/scenes.tsx`
- Shared HUD components: `src/components.tsx`, colors/fonts: `src/theme.ts`
