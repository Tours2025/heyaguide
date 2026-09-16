# HeyaGuide Implementation Plan

**Goal:** Ship a fast, beautiful web tour guide for Heya Hotel Istanbul guests — 50+ POI pages, interactive map, transit overlay — built with Astro + MapLibre, deployed on Cloudflare Pages.

**Architecture:** Static-first Astro site (multi-page), MDX content collection for POIs validated by Zod, MapLibre GL JS in a React island for the interactive map, GSAP for animations, real images downloaded at content-prep time from Wikimedia Commons + Unsplash.

**Tech Stack:** Astro 4, React 18 (island only), TypeScript, MDX, Zod, MapLibre GL, GSAP + ScrollTrigger, sharp, Cloudflare Pages.

---

## Global Constraints

- **Languages:** English only for v1; i18n routing built-in but no translations shipped.
- **Map:** MapLibre GL JS + MapTiler free vector tiles.
- **Content:** Static MDX in `src/content/places/`. Schema-validated at build.
- **Images:** Real photos downloaded at prep time to `public/places/<slug>/`, served as AVIF + WebP + JPEG via `astro:assets`. Attribution rendered on `/about`.
- **Animations:** GSAP 3.x, must respect `prefers-reduced-motion` via `gsap.matchMedia()`.
- **Performance:** Lighthouse mobile ≥ 95 across all categories. LCP < 2.5s on slow 4G. JS shipped on Home < 50KB gzipped.
- **Hosting:** Cloudflare Pages, auto-deploy on push to `main`.
- **No vendor lock-in:** No Mapbox, no Google Maps JS SDK, no Tailwind.
- **Heya coordinates (anchor):** 41.0379, 28.9847 (Kocatepe Mah., Dolapdere Taksim Cd. No:45, Beyoğlu).

---

## Phase 0 — Project Scaffold & Design System

### Task 0.1 — Initialize Astro project
- Create Astro 4 project with TS strict
- Install `@astrojs/react`, `@astrojs/mdx`, `@astrojs/sitemap`, `maplibre-gl`, `gsap`, `zod`, `sharp`
- Configure `output: 'static'`, `site` placeholder

### Task 0.2 — Design tokens & global styles
- `src/styles/tokens.css` — color, type, spacing, radius, shadow scales
- `src/styles/global.css` — reset + base + `prefers-reduced-motion`

### Task 0.3 — Base layout & navigation
- `src/layouts/BaseLayout.astro`, `Header`, `Footer`, `MobileMenu`
- Responsive nav (Home / Map / About)

### Task 0.4 — Cloudflare Pages config
- `wrangler.toml`, `public/_headers`, `public/_redirects`
- Cache-control on images, no-cache on `/`

---

## Phase 1 — Content Pipeline

### Task 1.1 — Content collection schema
- `src/content.config.ts` — Zod schema for POI frontmatter
- Export `CollectionEntry<'places'>` type alias
- Validate on build

### Task 1.2 — Image fetch pipeline
- `scripts/fetch-images.mjs` — fetches from Wikimedia Commons + Unsplash
- Saves to `public/places/<slug>/`
- Outputs `imageCredits.json`

### Task 1.3 — Sample POI: Hagia Sophia (full pipeline)
- `src/content/places/hagia-sophia.mdx`
- Hero + gallery downloaded
- Run fetch-images for this entry

### Task 1.4 — Distance-from-Heya
- `src/lib/distance.ts` — `haversineKm(a, b)`, `walkTimeFromHeya(coords)`

### Task 1.5 — Hours-today logic
- `src/lib/hours.ts` — `todayHours(poi, now)`, `formatHoursTable(poi)`
- Vitest unit tests

---

## Phase 2 — Pages & Map

### Task 2.1 — Home page
- `src/pages/index.astro`, `CategoryCard.astro`, `PoiCard.astro`, `FeaturedStrip.astro`
- Hero + 5 category cards + featured strip
- GSAP hero parallax, card stagger

### Task 2.2 — POI detail page
- `src/pages/places/[slug].astro`, `HoursTable`, `DistanceBadge`, `Gallery`, `GettingThere`
- Hero + hours table + distance + getting-there + gallery + description

### Task 2.3 — Map page
- `src/pages/map.astro`, `MapView.tsx` (React island), `PoiPopup`, `CategoryFilter`, `lib/mapStyle.ts`
- MapLibre GL, lazy-loaded
- Custom style JSON
- Markers, clustering, walk rings, transit overlay, Heya pin
- URL deep-linking: `?place=hagia-sophia`

### Task 2.4 — Transit GeoJSON
- `public/transit/t1-tram.geojson`, `m2-metro.geojson`, `f1-funicular.geojson`, `ferry-terminals.geojson`

### Task 2.5 — Marker icon set
- `public/icons/category-*.svg`, `transit-*.svg`, `heya-pin.svg`

### Task 2.6 — About / 404 pages
- `src/pages/about.astro`, `404.astro`
- Attribution table + friendly fallback

---

## Phase 3 — Polish & Performance

### Task 3.1 — GSAP animation pass
- Hero parallax, card stagger, image gallery ScrollTrigger, mobile menu, reduced-motion handling

### Task 3.2 — Performance audit
- Lighthouse run, image format verification, bundle analysis, hero preload

### Task 3.3 — Accessibility audit
- axe-core scan, keyboard nav, color contrast, screen reader test, skip-link

### Task 3.4 — Real-device testing
- Mobile Safari/Chrome on cellular throttling

---

## Phase 4 — Scale to 50 POIs

### Task 4.1 — Parallel research subagents
- 5 subagents, one per category, each handles 8-12 POIs
- Each subagent: research hours/admission/coordinates, fetch images, write MDX

### Task 4.2 — Integration & QA
- Validate all 50 MDX, verify all images + attributions, re-run Lighthouse

---

## Execution Strategy (this session)

| Worker | Task | Outputs |
|---|---|---|
| **Mavis (main)** | Phase 0 scaffold + sample POI + 2-3 pages | Working demo |
| **Research subagent 1** | Museums (8 POIs) | 8 MDX + images |
| **Research subagent 2** | Mosques & Churches (12 POIs) | 12 MDX + images |
| **Research subagent 3** | Palaces & Historical (8 POIs) | 8 MDX + images |
| **Research subagent 4** | Markets (8 POIs) | 8 MDX + images |
| **Research subagent 5** | Viewpoints & Towers (8 POIs) | 8 MDX + images |

---

## Success Criteria

- All 4 phases complete in this session
- Live preview at local dev server
- Production build passes
- Sample POI renders with hero + hours + gallery + getting-there
- Map page interactive with all markers + transit overlay
- All 50 POI MDX files committed with images
- Lighthouse ≥ 90 on home + sample POI + map
- Cloudflare Pages deploy config ready
