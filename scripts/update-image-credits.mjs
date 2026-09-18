#!/usr/bin/env node
// One-shot script to update imageCredits in MDX files for batch 1
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/workspace/heyaguide/src/content/places';

const updates = [
  {
    file: 'istanbul-modern.mdx',
    credit: {
      file: 'istanbul-modern-hero.jpg',
      author: 'PhilrocK',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Fassade_des_Istanbul_Modern_Museums.jpg',
    },
  },
  {
    file: 'yildiz-palace.mdx',
    credit: {
      file: 'yildiz-palace-hero.jpg',
      author: 'Dosseman',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Istanbul_Yildiz_Palace_and_Park_May_2014_8173.jpg',
    },
  },
  {
    file: 'suleymaniye-mosque.mdx',
    credit: {
      file: 'suleymaniye-mosque-hero.jpg',
      author: 'Moonik',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 3.0',
      url: 'https://commons.wikimedia.org/wiki/File:Exterior_of_the_Süleymaniye_Mosque_in_Istanbul,_Turkey_001.jpg',
    },
  },
  {
    file: 'st-antoine-church.mdx',
    credit: {
      file: 'st-antoine-church-hero.jpg',
      author: 'Andrey Shmigel (Wikimedia Commons)',
      source: 'Wikimedia Commons',
      license: 'FAL (Free Art License)',
      url: 'https://commons.wikimedia.org/wiki/File:Istanbul_asv2021-11_img71_StAnthony_of_Padua_Church.jpg',
    },
  },
  {
    file: 'rahmi-koc-museum.mdx',
    credit: {
      file: 'rahmi-koc-museum-hero.jpg',
      author: 'Dosseman',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Istanbul_Rahmi_M._Koç_Museum_Cobbler_at_work_2015_6089.jpg',
    },
  },
  {
    file: 'pera-museum.mdx',
    credit: {
      file: 'pera-museum-hero.jpg',
      author: 'Dosseman',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Istanbul_Pera_museum_Anatolian_weights_and_measures_0433.jpg',
    },
  },
  {
    file: 'rustem-pasha-mosque.mdx',
    credit: {
      file: 'rustem-pasha-mosque-hero.jpg',
      author: 'Dosseman',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:044_Istanbul_Rustem_Pasha_mosque-june_2004.jpg',
    },
  },
  {
    file: 'besiktas-market.mdx',
    credit: {
      file: 'besiktas-market-hero.jpg',
      author: 'Salim Alper',
      source: 'Wikimedia Commons (Flickr)',
      license: 'CC BY 2.0',
      url: 'https://commons.wikimedia.org/wiki/File:Fish_Market_Be%C5%9Fikta%C5%9F_ISTANBUL_(15651621734).jpg',
    },
  },
  {
    file: 'spice-bazaar.mdx',
    credit: {
      file: 'spice-bazaar-hero.jpg',
      author: 'Miomir Magdevski',
      source: 'Wikimedia Commons',
      license: 'CC BY-SA 4.0',
      url: 'https://commons.wikimedia.org/wiki/File:Spices_on_Spice_Bazaar_in_Istanbul_02.jpg',
    },
  },
  {
    file: 'valens-aqueduct.mdx',
    credit: {
      file: 'valens-aqueduct-hero.jpg',
      author: 'Public Domain',
      source: 'Wikimedia Commons',
      license: 'Public Domain',
      url: 'https://commons.wikimedia.org/wiki/File:Aqueduct_of_Valens_in_Istanbul.jpg',
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

let updated = 0;
for (const u of updates) {
  const path_ = path.join(ROOT, u.file);
  let content = fs.readFileSync(path_, 'utf8');

  // Match the imageCredits block - find the last imageCredits entry
  // Pattern: - file: ...\n    author: ...\n    source: ...\n    license: ...\n    url: ... (optional note)
  // We want to replace the last such block with the new one
  const regex = /  - file: [^\n]+\n    author: [^\n]+\n    source: [^\n]+\n    license: [^\n]+\n    url: [^\n]+(\n    note: [^\n]+)?\n---/s;
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
