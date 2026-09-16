#!/usr/bin/env node
/**
 * Content validation script.
 * Walks src/content/places/*.mdx and verifies:
 *  - all required frontmatter fields present
 *  - all referenced image files exist in public/places/<slug>/
 *  - coordinates are within Istanbul bounding box
 */
import { readdir, readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PLACES_DIR = join(ROOT, 'src', 'content', 'places');
const PUBLIC_DIR = join(ROOT, 'public', 'places');

// Istanbul bounding box: roughly 40.8–41.1 lat, 28.5–29.5 lng
const ISTANBUL_BBOX = { minLat: 40.85, maxLat: 41.20, minLng: 28.55, maxLng: 29.45 };

const REQUIRED_FIELDS = [
  'slug',
  'name',
  'category',
  'shortDescription',
  'address',
  'coordinates',
  'hours',
  'admission',
  'walkFromHeya',
  'transitFromHeya',
  'images',
  'imageCredits',
];

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

function parseFrontmatter(mdx) {
  const m = mdx.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

function getField(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.+?)$`, 'm');
  const m = fm.match(re);
  return m ? m[1].trim() : null;
}

async function validate(file) {
  const errors = [];
  const mdx = await readFile(file, 'utf8');
  const fm = parseFrontmatter(mdx);
  if (!fm) {
    return [file, ['no frontmatter']];
  }

  for (const field of REQUIRED_FIELDS) {
    if (!new RegExp(`^${field}:`, 'm').test(fm)) {
      errors.push(`missing required field: ${field}`);
    }
  }

  const slug = getField(fm, 'slug');
  if (!slug) errors.push('missing slug');
  else {
    const placeDir = join(PUBLIC_DIR, slug);
    if (!(await fileExists(placeDir))) {
      errors.push(`image directory missing: public/places/${slug}/`);
    } else {
      // Check hero image exists
      const heroMatch = fm.match(/^images:\s*\n\s*hero:\s*(\S+)/m);
      if (heroMatch) {
        const heroFile = join(placeDir, heroMatch[1]);
        if (!(await fileExists(heroFile))) {
          errors.push(`hero image missing: ${heroMatch[1]}`);
        }
      }
    }
  }

  // Coordinates check
  const latMatch = fm.match(/lat:\s*([\d.-]+)/);
  const lngMatch = fm.match(/lng:\s*([\d.-]+)/);
  if (latMatch && lngMatch) {
    const lat = parseFloat(latMatch[1]);
    const lng = parseFloat(lngMatch[1]);
    if (lat < ISTANBUL_BBOX.minLat || lat > ISTANBUL_BBOX.maxLat)
      errors.push(`lat ${lat} outside Istanbul bounding box`);
    if (lng < ISTANBUL_BBOX.minLng || lng > ISTANBUL_BBOX.maxLng)
      errors.push(`lng ${lng} outside Istanbul bounding box`);
  }

  return [file, errors];
}

const files = await readdir(PLACES_DIR);
let totalErrors = 0;
for (const f of files.filter((f) => f.endsWith('.mdx'))) {
  const [path, errs] = await validate(join(PLACES_DIR, f));
  if (errs.length) {
    totalErrors += errs.length;
    console.error(`\n✗ ${path.replace(ROOT + '/', '')}`);
    for (const e of errs) console.error(`    ${e}`);
  } else {
    console.log(`✓ ${f}`);
  }
}
console.log(`\nValidation complete. ${totalErrors} error(s) across ${files.length} file(s).`);
if (totalErrors > 0) process.exit(1);
