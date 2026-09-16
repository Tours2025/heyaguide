# HeyaGuide

A fast, beautiful, no-sign-in web guide for guests of **Heya Hotel Istanbul** — 43 landmarks with hours, admission, distance, transit, and an interactive map.

## Status (v1)

- ✅ 43 POI pages, each with original prose, hours, admission, transit, distance from Heya, photo credits
- ✅ Home page with hero, 5 category cards, featured POIs strip
- ✅ Full-screen interactive MapLibre map (walk-distance rings, transit overlay, custom markers, deep-linking)
- ✅ About page with full attribution
- ✅ Mobile-responsive (390px to 1440px+ tested)
- ✅ Type-safe content collection (Zod-validated at build)
- ✅ Cloudflare Pages deploy config
- ✅ Pushed to GitHub (commit `1b71f91`)
- ⚠️ 9 of 43 hero images downloaded (rate-limited by Wikimedia)
- ⏳ 34 images queued — see "Image recovery" below

## Stack

- **Astro 5** — static output, multi-page
- **MapLibre GL JS** — interactive map (no Mapbox, no Google SDK)
- **React 18** — only as Astro island for the map
- **GSAP 3** — scroll-triggered animations
- **MDX + Zod** — type-safe content
- **Cloudflare Pages** — hosting (free)

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

## Image recovery (34 images blocked by rate limit)

When you want to fetch the remaining hero images from Wikimedia Commons:

```bash
node scripts/fetch-images-v2.mjs
```

This reads each MDX's `imageCredits`, downloads missing files to `public/places/<slug>/`, and is idempotent (won't re-download).

If you hit HTTP 429 from Wikimedia (their IP rate limit), wait ~30-60 minutes and re-run. The script will skip files that already exist.

## Content — adding a new POI

1. Create `src/content/places/<slug>.mdx` with the frontmatter from `src/content.config.ts`
2. Add hero image (and gallery) to `public/places/<slug>/`
3. (Optional) Run `npm run fetch-images -- --slug=<slug>` if `imageCredits` URLs are populated
4. Run `npm run validate` to verify all required fields and Istanbul bounding box
5. Build — invalid entries fail the build loudly

## Deploy

Cloudflare Pages auto-deploys on push to `main`. Connect the GitHub repo in the Cloudflare dashboard:

- Build command: `npm run build`
- Build output: `dist`
- Node version: 22

Then point your domain (e.g. `guide.hotelheya.com`) at the Cloudflare Pages deployment.

## Project layout

```
heyaguide/
├── astro.config.mjs
├── public/
│   ├── places/<slug>/hero.jpg + gallery
│   ├── transit/   # GeoJSON: T1, M2, F1, ferry terminals
│   └── icons/     # Custom SVG markers (museum, mosque, bus, train, …)
├── src/
│   ├── content/places/*.mdx
│   ├── content.config.ts
│   ├── components/
│   │   ├── layout/    # BaseLayout, Header, Footer, MobileMenu
│   │   ├── map/       # MapView (React island)
│   │   └── poi/       # PoiCard, HoursTable, Gallery, GettingThere, …
│   ├── lib/           # mapStyle.ts, distance.ts, hours.ts, data.ts
│   ├── pages/         # index, places/[slug], map, about, 404
│   └── styles/        # tokens.css, global.css
├── scripts/
│   ├── fetch-images-v2.mjs   # bulk image download
│   └── validate-content.mjs  # schema + bbox + image existence
├── docs/                    # spec + plan
├── wrangler.toml            # Cloudflare Pages config
└── README.md
```

## Roadmap

| Phase | Status |
|---|---|
| 0. Setup, design system, scaffold | ✅ done |
| 1. Content pipeline (Zod schema, image fetch) | ✅ done |
| 2. Pages + map | ✅ done |
| 3. Polish (GSAP, Lighthouse, a11y) | ⏳ next |
| 4. Concierge Picks (cafés, restaurants) | ⏳ future |
| 5. i18n (TR, RU, AR) | ⏳ future |

## License & credits

Photos come from Wikimedia Commons under CC BY-SA 4.0 / CC BY. Full attribution list on `/about`.

## Notes on rate-limited images

The image-fetch script was rate-limited by Wikimedia during initial seeding (HTTP 429). The script is correct — re-run it once the rate limit clears (typically 30 min - 4 hours). Already-downloaded images are skipped on subsequent runs.
