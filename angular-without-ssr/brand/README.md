# Memlo Brand Assets

Static brand assets generated from `memlo-brand-book.html`. Open that file in a browser for the full brand system overview (logo, palette, typography, tweakable palette).

## Social media (ready to upload)

| File | Size | Where |
|------|------|-------|
| `ig-post-manifesto.{svg,png}` | 1080 × 1080 | Instagram post — manifesto |
| `ig-post-quote.{svg,png}` | 1080 × 1080 | Instagram post — quote (ink bg) |
| `ig-post-tip.{svg,png}` | 1080 × 1080 | Instagram post — tip (indigo bg) |
| `ig-story.{svg,png}` | 1080 × 1920 | Instagram/Facebook story |
| `ig-avatar.{svg,png}` | 640 × 640 | Instagram profile avatar (circular) |
| `fb-cover.{svg,png}` | 820 × 312 | Facebook fanpage cover |
| `fb-post.{svg,png}` | 1200 × 630 | Facebook link post |
| `fb-avatar.{svg,png}` | 640 × 640 | Facebook profile picture |

PNGs rendered from SVGs via headless Chrome at native resolution. Regenerate with:

```bash
for f in brand/*.svg; do
  size=$(grep -oE 'width="[0-9]+"' "$f" | head -1 | grep -oE '[0-9]+')
  height=$(grep -oE 'height="[0-9]+"' "$f" | head -1 | grep -oE '[0-9]+')
  google-chrome --headless --disable-gpu --default-background-color=00000000 \
    --window-size=${size},${height} --screenshot="${f%.svg}.png" "file://$(realpath "$f")"
done
```

## App icons & Open Graph (wired into `src/`)

- `src/assets/logo-memlo.svg` — navbar wordmark
- `src/assets/logo-memlo-icon.svg` — monogram only
- `src/assets/favicon.svg` — SVG favicon
- `src/assets/app-icon.svg` — 512 × 512 source for app icons
- `src/assets/apple-touch-icon.png` — 180 × 180 for iOS
- `src/assets/og-image.svg` — 1200 × 630 Open Graph / Twitter card
- `public/favicon.ico` — multi-size (16/32/48) legacy favicon

## Brand tokens

| Token | Hex | Use |
|-------|-----|-----|
| `--accent` | `#3B4CCA` | Primary Indigo |
| `--accent-2` | `#2F3DB3` | Hover |
| `--paper` | `#EDEFFF` | Primary light / tint |
| `--ink` | `#0F172A` | Heading |
| `--ink-2` | `#1E293B` | Body text |
| `--muted` | `#475569` | Secondary text |
| `--surface` | `#F8FAFC` | Background |

Fonts: **Instrument Serif** (display), **Inter** (UI/body), **JetBrains Mono** (meta).
