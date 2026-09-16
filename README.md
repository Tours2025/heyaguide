# HeyaGuide

A fast, beautiful, no-sign-in web guide for guests of **Heya Hotel Istanbul** — 50+ landmarks with hours, admission, distance, and an interactive map.

## Stack

- **Astro 5** (static output) — multi-page static site, fastest possible TTFB
- **MapLibre GL JS** — interactive map (no Mapbox, no Google Maps SDK)
- **React 18** — used only as Astro island for the map
- **GSAP 3** — scroll-triggered animations (hero parallax, card stagger)
- **MDX + Zod** — type-safe content collection, validated at build time
- **Sharp** — image processing at build time
- **Cloudflare Pages** — hosting, free tier

## Local dev

```bash
npm install
npm run dev
```

Opens at http://localhost:4321.

## Build

```bash
npm run build
npm run preview
```

Static output in `dist/`.

## Content

All places live as MDX files in `src/content/places/`. Schema is defined in `src/content.config.ts` and validated at build time.

To add a new place:

1. Drop an MDX file in `src/content/places/<slug>.mdx` with the required frontmatter.
2. Add the hero image (and optional gallery images) to `public/places/<slug>/`.
3. The build will validate the entry and fail loudly if anything's wrong.

To fetch images for entries with `imageCredits`:

```bash
npm run fetch-images
```

This reads each entry's `imageCredits` and downloads missing files from Wikimedia Commons.

To validate content locally:

```bash
npm run validate
```

## Deployment

Cloudflare Pages auto-deploys on push to `main`. Connect the GitHub repo in the Cloudflare dashboard, set:

- Build command: `npm run build`
- Build output: `dist`
- Node version: 22

Then point the custom domain (`guide.hotelheya.com` or whatever you choose) through Cloudflare DNS.

## Project layout

```
src/
├── content/places/     # 50+ MDX entries (frontmatter + body)
├── content.config.ts   # Zod schema
├── components/
│   ├── layout/         # Header, Footer, BaseLayout
│   ├── map/            # MapView (React island)
│   └── poi/            # PoiCard, HoursTable, etc.
├── lib/
│   ├── data.ts         # Category labels, grouping, color mapping
│   ├── distance.ts     # haversine + walk-time from Heya
│   ├── hours.ts        # "Open now" status + hours table
│   └── mapStyle.ts     # MapLibre style JSON
├── pages/              # index, map, about, 404, places/[slug]
└── styles/             # tokens.css, global.css

public/
├── places/<slug>/      # hero.jpg + gallery images
├── transit/            # GeoJSON: T1, M2, F1, ferries
└── icons/              # Custom SVG markers
```

## License & credits

Photos come from Wikimedia Commons under CC BY-SA 4.0 / CC BY. Full attribution list on `/about`.

## Roadmap

- v1 (current): 5-50 POIs, English only, single hotel
- v2: Concierge Picks (cafés/restaurants), CMS workflow, QR code generator for room cards
- v3: i18n (TR, RU, AR)
