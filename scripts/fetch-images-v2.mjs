#!/usr/bin/env node
/**
 * HeyaGuide image fetcher — v2 (fresh, simpler parser).
 * Reads src/content/places/*.mdx, downloads missing hero images from
 * Wikimedia Commons. Skips files already present.
 */
import { readFile, readdir, mkdir, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLACES_DIR = join(ROOT, 'src', 'content', 'places');
const PUBLIC_DIR = join(ROOT, 'public', 'places');

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

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
  // Simple field matcher: ^key: value$ on its own line
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function extractImageCredits(fm) {
  const out = [];
  // Match: - file: ... (line) author: ... source: ... license: ... url: ...
  const lines = fm.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*-\s*file:\s*(.+)\s*$/);
    if (!m) continue;
    const block = [lines[i]];
    for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
      if (lines[j].match(/^\s*-\s+/) || lines[j].match(/^[a-z]/i)) break;
      block.push(lines[j]);
    }
    const blockText = block.join('\n');
    const file = m[1].trim();
    const urlMatch = blockText.match(/url:\s*['"]?([^'"]+)['"]?/);
    const authorMatch = blockText.match(/author:\s*['"]?([^'"]+?)['"]?\s*$/m);
    const sourceMatch = blockText.match(/source:\s*['"]?([^'"]+?)['"]?\s*$/m);
    const licenseMatch = blockText.match(/license:\s*['"]?([^'"]+?)['"]?\s*$/m);
    if (file && urlMatch) {
      out.push({
        file,
        url: urlMatch[1].trim(),
        author: authorMatch ? authorMatch[1].trim() : '',
        source: sourceMatch ? sourceMatch[1].trim() : '',
        license: licenseMatch ? licenseMatch[1].trim() : '',
      });
    }
  }
  return out;
}

const files = (await readdir(PLACES_DIR)).filter((f) => f.endsWith('.mdx'));

let downloaded = 0;
let skipped = 0;
let failed = 0;

for (const f of files) {
  const path = join(PLACES_DIR, f);
  const mdx = await readFile(path, 'utf8');
  const fm = extractFrontmatter(mdx);
  if (!fm) {
    console.log(`SKIP ${f}: no frontmatter`);
    continue;
  }
  const slug = getField(fm, 'slug');
  if (!slug) {
    console.log(`SKIP ${f}: no slug`);
    continue;
  }
  const credits = extractImageCredits(fm);
  if (credits.length === 0) {
    console.log(`SKIP ${f}: no imageCredits`);
    continue;
  }

  const placeDir = join(PUBLIC_DIR, slug);
  await mkdir(placeDir, { recursive: true });

  for (const c of credits) {
    const out = join(placeDir, c.file);
    if (await fileExists(out)) {
      skipped++;
      continue;
    }

    // Convert Wikimedia file page URL to Special:FilePath URL
    const urlMatch = c.url.match(/wiki\/File:(.+?)(?:#.*)?$/);
    if (!urlMatch) {
      console.warn(`  ✗ [${slug}] can't parse URL: ${c.url}`);
      failed++;
      continue;
    }
    const fileName = decodeURIComponent(urlMatch[1]);
    const dlUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName).replace(/%2F/g, '/')}?width=1600`;

    try {
      const res = await fetch(dlUrl, {
        headers: { 'User-Agent': UA },
        redirect: 'follow',
      });
      if (!res.ok) {
        console.warn(`  ✗ [${slug}] HTTP ${res.status} for ${c.file}`);
        failed++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(out, buf);
      console.log(`  ✓ [${slug}] ${c.file} (${(buf.length / 1024).toFixed(0)} KB)`);
      downloaded++;
    } catch (err) {
      console.warn(`  ✗ [${slug}] failed: ${err.message}`);
      failed++;
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 2000));
  }
}

console.log('---');
console.log(`Done. Downloaded: ${downloaded}, skipped (exists): ${skipped}, failed: ${failed}`);
