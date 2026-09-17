/**
 * MapLibre style JSON for HeyaGuide.
 *
 * Uses OSM raster tiles (no API key). For higher traffic in the future, swap
 * to MapTiler/Stadia with a key.
 *
 * Note: The standard tile.openstreetmap.org endpoint blocks anonymous
 * browser fetches (CORS + rate limits), so we use the German mirror
 * (tile.openstreetmap.de) which is more permissive. MapLibre displays tiles
 * via `<img>` (which works without CORS), so this works in practice.
 *
 * OSM tile usage policy: https://operations.osmfoundation.org/policies/tiles/
 */
export const MAP_STYLE = {
  version: 8 as const,
  sources: {
    basemap: {
      type: 'raster' as const,
      tiles: [
        'https://a.tile.openstreetmap.de/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.de/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.de/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'basemap',
      type: 'raster' as const,
      source: 'basemap',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};
