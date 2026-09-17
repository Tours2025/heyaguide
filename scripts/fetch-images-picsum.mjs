#!/usr/bin/env node
/**
 * HeyaGuide — Picsum fallback image fetcher.
 *
 * Used when Wikimedia is rate-limited. Uses Picsum's deterministic seed
 * URLs to get one consistent photo per POI slug. Not Istanbul-specific —
 * these are PLACEHOLDER photos. Real Istanbul images should replace them
 * once Wikimedia rate limit clears or via manual swap.
 *
 * Usage: node scripts/fetch-images-picsum.mjs [--slug=<slug>]
 */
import { readFile, readdir, mkdir, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLACES_DIR = join(ROOT, 'src', 'content', 'places');
const PUBLIC_DIR = join(ROOT, 'public', 'places');

const argSlug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function extractFrontmatter(mdx) {
  const m = mdx.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

function getField(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

const files = (await readdir(PLACES_DIR)).filter((f) => f.endsWith('.mdx'));

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const f of files) {
  const path = join(PLACES_DIR, f);
  const mdx = await readFile(path, 'utf8');
  const fm = extractFrontmatter(mdx);
  if (!fm) continue;
  const slug = getField(fm, 'slug');
  if (!slug) continue;
  if (argSlug && slug !== argSlug) continue;

  const placeDir = join(PUBLIC_DIR, slug);
  await mkdir(placeDir, { recursive: true });

  const heroFile = `${slug}-hero.jpg`;
  const out = join(placeDir, heroFile);

  if (await fileExists(out)) {
    skipped++;
    continue;
  }

  // Picsum: deterministic seed URL. Same slug = same photo every time.
  const url = `https://picsum.photos/seed/${slug}/2000/1200`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.warn(`  ✗ [${slug}] HTTP ${res.status}`);
      failed++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(out, buf);
    console.log(`  ✓ [${slug}] ${heroFile} (${(buf.length / 1024).toFixed(0)} KB)`);
    downloaded++;
  } catch (err) {
    console.warn(`  ✗ [${slug}] ${err.message}`);
    failed++;
  }
  await new Promise((r) => setTimeout(r, 500));
}

console.log('---');
console.log(`Done. Downloaded: ${downloaded}, skipped: ${skipped}, failed: ${failed}`);
