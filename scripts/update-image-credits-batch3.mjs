#!/usr/bin/env node
// One-shot script to update imageCredits in MDX files for batch 3
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/workspace/heyaguide/src/content/places';

const updates = [
  {
    file: 'sahaflar-bazaar.mdx',
    credit: {
      file: 'sahaflar-bazaar-hero.jpg',
      author: 'Azizbek Janabaev (Janabaevazizbek)',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Sahaflar_%C3%87ar%C5%9F%C4%B1s%C4%B1_20250507.jpg',
    },
  },
  {
    file: 'serefiye-cistern.mdx',
    credit: {
      file: 'serefiye-cistern-hero.jpg',
      author: 'Izabela Miszczak',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Theodosius_cistern_08.jpg',
    },
  },
  {
    file: 'theodosian-walls.mdx',
    credit: {
      file: 'theodosian-walls-hero.jpg',
      author: 'Carole Raddato',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Theodosian_Walls_of_Constantinople,_Istanbul_(24053561188).jpg',
    },
  },
  {
    file: 'turkish-islamic-arts-museum.mdx',
    credit: {
      file: 'turkish-islamic-arts-museum-hero.jpg',
      author: 'Chapultepec',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Turkish_and_Islamic_Arts_Museum_01.jpg',
    },
  },
  {
    file: 'zeyrek-mosque.mdx',
    credit: {
      file: 'zeyrek-mosque-hero.jpg',
      author: 'Sharon Nathan',
      source: 'Wikimedia Commons',
      license: 'CC BY 2.0',
      url: 'https://commons.wikimedia.org/wiki/File:Molla_Zeyrek_Camii.jpg',
    },
  },
  {
    file: 'yeni-cami.mdx',
    credit: {
      file: 'yeni-cami-hero.jpg',
      author: 'H005',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 3.0',
      url: 'https://commons.wikimedia.org/wiki/File:Yeni_Camii_Istanbul_Dome.jpg',
    },
  },
  {
    file: 'flower-market.mdx',
    credit: {
      file: 'flower-market-hero.jpg',
      author: 'l0da_ralta',
      source: 'Wikimedia Commons (Flickr)',
      license: 'CC BY 2.0',
      url: 'https://commons.wikimedia.org/wiki/File:Flowers_outdoor_market,_Istanbul,_Turkey_(9603551495).jpg',
    },
  },
  {
    file: 'suleymaniye-terrace.mdx',
    credit: {
      file: 'suleymaniye-terrace-hero.jpg',
      author: 'Maurice Flesier',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:S%C3%BCleymaniye_Mosque_from_the_Golden_Horn_Metro_Bridge.jpg',
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
