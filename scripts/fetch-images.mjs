#!/usr/bin/env node
/**
 * Image fetch script for HeyaGuide.
 *
 * Reads MDX frontmatter in src/content/places/ and downloads any missing
 * images from Wikimedia Commons URLs listed in the `imageCredits` section.
 *
 * Usage: npm run fetch-images
 *   or: node scripts/fetch-images.mjs [--slug=<slug>]
 */
import { readdir, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLACES_DIR = join(ROOT, 'src', 'content', 'places');
const PUBLIC_DIR = join(ROOT, 'public', 'places');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const argSlug = process.argv.find((a) => a.startsWith('--slug='))?.split('=')[1];

async function parseFrontmatter(mdx) {
  // Very small YAML frontmatter parser — only what we need (flat list, imageCredits).
  const match = mdx.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1];

  // Extract slug, name, images, imageCredits (with author, file, source, url, license)
  const get = (key) => {
    const re = new RegExp(`^${key}:\\s*(.*)$`, 'm');
    const m = fm.match(re);
    if (!m) return null;
    return m[1].trim().replace(/^['"]|['"]$/g, '');
  };

  // Multi-line imageCredits: parse the array of { file, author, url, license, source }
  const credits = [];
  const creditRegex = /-\s*file:\s*([^\n]+)\s*\n\s*author:\s*([^\n]+)\s*\n\s*source:\s*([^\n]+)\s*\n\s*license:\s*([^\n]+)\s*\n\s*url:\s*([^\n]+)/g;
  let m;
  while ((m = creditRegex.exec(fm))) {
    credits.push({
      file: m[1].trim(),
      author: m[2].trim(),
      source: m[3].trim(),
      license: m[4].trim(),
      url: m[5].trim(),
    });
  }

  return {
    slug: get('slug'),
    name: get('name'),
    images: {
      hero: get(/images:/m.test(fm) ? 'hero' : '__none__'),
    },
    credits,
  };
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function* walkMdx(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      yield join(dir, entry.name);
    }
  }
}

async function processPlace(file) {
  const { readFile } = await import('fs/promises');
  const mdx = await readFile(file, 'utf8');
  const fm = parseFrontmatter(mdx);
  if (!fm || !fm.slug) return { skipped: true };

  if (argSlug && fm.slug !== argSlug) return { skipped: true };

  const placeDir = join(PUBLIC_DIR, fm.slug);
  await mkdir(placeDir, { recursive: true });

  const results = { slug: fm.slug, downloaded: 0, skipped: 0, failed: 0 };
  for (const c of fm.credits) {
    const out = join(placeDir, c.file);
    if (await fileExists(out)) {
      results.skipped++;
      continue;
    }
    // Build Wikimedia direct URL from the file page URL
    // Pattern: https://commons.wikimedia.org/wiki/File:Some_File.jpg
    const m = c.url.match(/wiki\/File:(.+?)(?:#.*)?$/);
    if (!m) {
      console.warn(`  [${fm.slug}] can't parse URL: ${c.url}`);
      results.failed++;
      continue;
    }
    const fileName = decodeURIComponent(m[1]);
    const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName).replace(/%2F/g, '/')}?width=1600`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        redirect: 'follow',
      });
      if (!res.ok) {
        console.warn(`  [${fm.slug}] HTTP ${res.status} for ${c.file}`);
        results.failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const { writeFile } = await import('fs/promises');
      await writeFile(out, buf);
      console.log(`  ✓ [${fm.slug}] ${c.file} (${(buf.length / 1024).toFixed(0)} KB)`);
      results.downloaded++;
    } catch (err) {
      console.warn(`  [${fm.slug}] failed: ${err.message}`);
      results.failed++;
    }
    // Polite delay to avoid Wikimedia rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }
  return results;
}

console.log('HeyaGuide image fetcher');
console.log('---');
const all = [];
for await (const file of walkMdx(PLACES_DIR)) {
  const r = await processPlace(file);
  all.push(r);
}
const total = all.reduce(
  (acc, r) => ({
    downloaded: acc.downloaded + (r.downloaded ?? 0),
    skipped: acc.skipped + (r.skipped ?? 0),
    failed: acc.failed + (r.failed ?? 0),
  }),
  { downloaded: 0, skipped: 0, failed: 0 },
);
console.log('---');
console.log(`Done. Downloaded: ${total.downloaded}, skipped (exists): ${total.skipped}, failed: ${total.failed}`);
