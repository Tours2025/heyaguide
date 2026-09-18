#!/usr/bin/env node
// One-shot script to update imageCredits in MDX files for batch 2
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/workspace/heyaguide/src/content/places';

const updates = [
  {
    file: 'great-palace-mosaic-museum.mdx',
    credit: {
      file: 'great-palace-mosaic-museum-hero.jpg',
      author: 'Byzantine mosaic artists (5th century, public domain)',
      source: 'Wikimedia Commons',
      license: 'Public Domain',
      url: 'https://commons.wikimedia.org/wiki/File:Mosaic_museum_Istanbul_2007_021.jpg',
    },
  },
  {
    file: 'istanbul-archaeology-museums.mdx',
    credit: {
      file: 'istanbul-archaeology-museums-hero.jpg',
      author: 'Antoloji',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Gate_of_Istanbul_Archaeological_Museums.jpg',
    },
  },
  {
    file: 'kadikoy-market.mdx',
    credit: {
      file: 'kadikoy-market-hero.jpg',
      author: 'William Neuheisel',
      source: 'Wikimedia Commons (Flickr)',
      license: 'CC BY 2.0',
      url: 'https://commons.wikimedia.org/wiki/File:Shopping_the_Kad%C4%B1k%C3%B6y_Market_(6418910915).jpg',
    },
  },
  {
    file: 'mahmutpasha-market.mdx',
    credit: {
      file: 'mahmutpasha-market-hero.jpg',
      author: 'Ravage t',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Mahmutpa%C5%9Fa_Yoku%C5%9Fu.jpg',
    },
  },
  {
    file: 'mihrimah-sultan-mosque.mdx',
    credit: {
      file: 'mihrimah-sultan-mosque-hero.jpg',
      author: 'Dosseman',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Istanbul_Edirne_Gate_aka_Mihrimah_Sultan_Mosque_october_2018_9274.jpg',
    },
  },
  {
    file: 'ortakoy-mosque.mdx',
    credit: {
      file: 'ortakoy-mosque-hero.jpg',
      author: 'A.Savin',
      source: 'Wikimedia Commons',
      license: 'FAL (Free Art License)',
      url: 'https://commons.wikimedia.org/wiki/File:Istanbul_asv2020-02_img62_Ortak%C3%B6y_Mosque.jpg',
    },
  },
  {
    file: 'pierre-loti-hill.mdx',
    credit: {
      file: 'pierre-loti-hill-hero.jpg',
      author: 'Laima Gūtmane (simka73)',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 3.0',
      url: 'https://commons.wikimedia.org/wiki/File:Pierre_Loti_cafe_-_panoramio.jpg',
    },
  },
  {
    file: 'rumeli-hisari.mdx',
    credit: {
      file: 'rumeli-hisari-hero.jpg',
      author: 'Dosseman',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Rumeli_Hisari_3783.jpg',
    },
  },
  {
    file: 'sakip-sabanci-museum.mdx',
    credit: {
      file: 'sakip-sabanci-museum-hero.jpg',
      author: 'Dosseman',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Istanbul_Sakip_Sabanci_Museum_Exterior_in_2014_8737.jpg',
    },
  },
  {
    file: 'sehzade-mosque.mdx',
    credit: {
      file: 'sehzade-mosque-hero.jpg',
      author: 'R Prazeres',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Sehzade_Mosque_DSCF3254.jpg',
    },
  },
];

function buildCredit(credit) {
  const lines = [
    `  - file: ${credit.file}`,
    `    author: "${credit.author}"`,
    `    source: "${credit.source}"`,
    `    license: "${credit.license}"`,
    `    url: "${credit.url}"`,
  ];
  if (credit.note) lines.push(`    note: "${credit.note}"`);
  return lines.join('\n');
}

const regex = /  - file: [^\n]+\n    author: [^\n]+\n    source: [^\n]+\n    license: [^\n]+\n    url: [^\n]+(\n    note: [^\n]+)?\n---/s;

let updated = 0;
for (const u of updates) {
  const path_ = path.join(ROOT, u.file);
  let content = fs.readFileSync(path_, 'utf8');
  const match = content.match(regex);
  if (!match) {
    console.log(`  ✗ ${u.file} — no imageCredits block found`);
    continue;
  }
  const newContent = content.replace(regex, buildCredit(u.credit) + '\n---');
  if (newContent !== content) {
    fs.writeFileSync(path_, newContent);
    console.log(`  ✓ ${u.file} — updated`);
    updated++;
  }
}
console.log(`\nDone. ${updated} files updated.`);
