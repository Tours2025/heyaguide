import type { CollectionEntry } from 'astro:content';

export type POI = CollectionEntry<'places'>;

export const CATEGORY_LABELS: Record<string, string> = {
  museums: 'Museums',
  'mosques-churches': 'Mosques & Religious Sites',
  'palaces-historical': 'Palaces & Historical',
  markets: 'Markets & Bazaars',
  'viewpoints-towers': 'Viewpoints & Towers',
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  museums: 'Treasures of empires — Ottoman, Byzantine, modern.',
  'mosques-churches': 'Active places of worship, centuries of architecture.',
  'palaces-historical': 'Palaces, cisterns, walls — Istanbul\'s layered past.',
  markets: 'Bazaars, spice markets, neighborhood mazes.',
  'viewpoints-towers': 'Best panoramas of the Bosphorus and the Golden Horn.',
};

export const CATEGORY_ORDER: Array<keyof typeof CATEGORY_LABELS> = [
  'museums',
  'mosques-churches',
  'palaces-historical',
  'markets',
  'viewpoints-towers',
];

/**
 * Maps category → CSS custom property for marker/badge color.
 */
export function categoryColor(category: string): string {
  switch (category) {
    case 'museums':
      return 'var(--color-cat-museums)';
    case 'mosques-churches':
      return 'var(--color-cat-mosques-churches)';
    case 'palaces-historical':
      return 'var(--color-cat-palaces-historical)';
    case 'markets':
      return 'var(--color-cat-markets)';
    case 'viewpoints-towers':
      return 'var(--color-cat-viewpoints-towers)';
    default:
      return 'var(--color-brand)';
  }
}

export function groupByCategory(pois: POI[]) {
  const grouped: Record<string, POI[]> = {};
  for (const cat of CATEGORY_ORDER) {
    grouped[cat] = [];
  }
  for (const poi of pois) {
    const cat = poi.data.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(poi);
  }
  // sort each group by priority desc
  for (const cat of CATEGORY_ORDER) {
    grouped[cat].sort((a, b) => b.data.priority - a.data.priority);
  }
  return grouped;
}
