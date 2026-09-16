# HeyaGuide — Istanbul Tour Guide for Heya Hotel Guests

**Date:** 2026-09-16
**Status:** Approved for build
**Owner:** Tours2025

---

## 1. Vision & User Flows

**Tagline:** *Your Heya concierge in your pocket.*

A fast, beautiful, no-sign-in, no-app web guide for guests of Heya Hotel Istanbul. Replaces the printed handout and the "ask the front desk" trip with a QR-code-to-pocket experience that respects hotel WiFi and slow 4G.

**Three primary user flows:**

1. **"What's near me right now?"** — Guest opens `/map`. Sees "You are here" pin at Heya, walk-distance rings drawn, all POIs visible. Tap a pin → quick card (name, category, hours-today). Tap "Read more" → POI page.
2. **"I want to see [famous thing]"** — Guest lands on `/`. Sees 5 category cards. Browses → opens POI page.
3. **"How do I get there?"** — POI detail page has a "Getting there" panel: nearest metro/tram/ferry stop, walking time from Heya, taxi fare estimate. Tap → opens Google Maps directions with destination preset.

**Pages inventory (v1):**
- `/` — Home: hero (Heya + Taksim skyline), category grid, "Today in Istanbul" (1-2 POIs featured)
- `/places/[slug]` — POI detail page
- `/map` — Full-screen interactive map with all POIs + transit overlay
- `/about` — about the guide + image attributions
- `/404` — nice fallback

---

## 2. Architecture & Stack

### Repo
`github.com/Tours2025/heyaguide`

### Project layout
```
heyaguide/
├── astro.config.mjs
├── public/
│   ├── places/<slug>/hero.jpg
│   ├── places/<slug>/1..n.jpg
│   ├── transit/                      # GeoJSON: metro, tram, funicular, ferry
│   └── icons/                        # custom SVG markers
├── src/
│   ├── content/places/*.mdx          # POI entries
│   ├── content.config.ts             # Zod schema
│   ├── components/
│   │   ├── layout/                   # BaseLayout, Header, Footer, MobileMenu
│   │   ├── map/                      # MapView (React island)
│   │   ├── poi/                      # PoiCard, HoursTable, DistanceBadge, Gallery
│   │   └── ui/                       # Button, Badge, Icon, Tag
│   ├── styles/                       # tokens.css, global.css
│   ├── lib/                          # mapStyle.ts, distance.ts, hours.ts, data.ts
│   └── pages/                        # index.astro, places/[slug].astro, map.astro, about.astro
├── scripts/                          # fetch-images.mjs, validate-content.mjs
├── docs/                             # spec + plan + design tokens
├── README.md
└── package.json
```

### Tech stack
- **Framework:** Astro (static output)
- **React integration:** `@astrojs/react` for the map island only
- **Content:** MDX via `@astrojs/mdx`, validated by Zod
- **Map:** `maplibre-gl`, vector tiles from MapTiler free tier
- **Animations:** `gsap` + `gsap/ScrollTrigger`
- **Image processing:** `sharp` (build-time)
- **Deploy:** Cloudflare Pages via Wrangler
- **Sitemap:** `@astrojs/sitemap`

---

## 3. Content Model

Each POI is an MDX file in `src/content/places/` with this frontmatter (Zod-validated):

```yaml
slug: hagia-sophia
name: Hagia Sophia
category: mosques-churches
shortDescription: "A 6th-century cathedral turned mosque turned museum..."
longDescription: |
  ~200-300 words, MDX body, story-driven prose.

coordinates:
  lat: 41.0086
  lng: 28.9802

address: "Sultanahmet, Fatih, Istanbul"

hours:
  monday:    { open: "09:00", close: "19:00", closed: false, lastEntry: "18:30" }
  tuesday:   { open: "09:00", close: "19:00", closed: false, lastEntry: "18:30" }
  wednesday: { open: "09:00", close: "19:00", closed: false, lastEntry: "18:30" }
  thursday:  { open: "09:00", close: "19:00", closed: false, lastEntry: "18:30" }
  friday:    { open: "13:00", close: "19:00", closed: false, lastEntry: "18:30", note: "Opens 13:00 for prayer" }
  saturday:  { open: "09:00", close: "19:00", closed: false, lastEntry: "18:30" }
  sunday:    { open: "09:00", close: "19:00", closed: false, lastEntry: "18:30" }

admission:
  foreigner: 25
  currency: EUR
  notes: "Free for under 8s. Museum Pass Istanbul accepted."

walkFromHeya: "8.0 km"
transitFromHeya: "Tram T1 to Sultanahmet, ~35 min"

tags: [unesco, byzantine, dome, must-see]

featured: true
priority: 95

images:
  hero: hagia-sophia-hero.jpg
  gallery: [hagia-sophia-1.jpg, hagia-sophia-2.jpg]

imageCredits:
  - file: hagia-sophia-hero.jpg
    author: "Author Name"
    source: "Wikimedia Commons"
    license: "CC BY-SA 4.0"
    url: "https://commons.wikimedia.org/..."
```

Schema validated at build time.

---

## 4. Map System

**Tech:** MapLibre GL JS in a React island, mounted only on `/map` and as embedded mini-map on POI pages.

**Tile source:** MapTiler free tier (100k tile requests/month free, no credit card). Custom style JSON authored in `src/lib/mapStyle.ts`.

**Layers (bottom to top):**
1. Base map tiles
2. Walking distance rings from Heya (3km, 5km — translucent fills)
3. Transit lines (GeoJSON: T1 tram, M2 metro, F1 funicular, Marmaray, ferry routes)
4. Transit stops
5. POI markers — clustered at low zoom, color-coded by category
6. "You are here" pin (Heya) — custom SVG, subtle pulse

**Heya coordinates:** 41.0379, 28.9847 (Kocatepe Mah., Dolapdere Taksim Cd. No:45, Beyoğlu).

---

## 5. Animations

- Home hero — fade-in + parallax on scroll (ScrollTrigger)
- POI cards on home — staggered reveal
- POI detail page — image gallery ScrollTrigger pin + scrub
- Mobile menu — slide-in
- All animations respect `prefers-reduced-motion`

---

## 6. Performance Budget

- LCP < 2.5s on slow 4G
- JS on Home < 50KB gzipped (map is route-level split)
- Lighthouse mobile ≥ 95 across the board

---

## 7. Roadmap

| Phase | Deliverable | ETA |
|---|---|---|
| 0. Setup | Repo, Astro scaffold, Cloudflare Pages, design tokens, base layout, attribution | Day 1-2 |
| 1. Content seed | Real images for 50 POIs, MDX files with hours/admission/coordinates | Day 3-5 |
| 2. Pages + map | Home, POI detail, Map page (MapLibre + transit), about/404 | Day 6-10 |
| 3. Polish | GSAP animations, Lighthouse + a11y audit, real-device testing | Day 11-12 |
| 4. Phase 2 | Concierge Picks, i18n, CMS, favorites, QR generator | Future |

---

## 8. Success Criteria (v1)

- Live at custom domain, served via Cloudflare CDN.
- Lighthouse mobile ≥ 95.
- 50 POI pages each with: hero, hours, distance, getting-there, gallery.
- Map with all 50 POIs, transit overlay, filters.
- Concierge can edit hours by changing one MDX file → live in <90s.
