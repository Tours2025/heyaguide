/**
 * MapLibre style JSON.
 * Uses OpenStreetMap raster tiles as the base layer — no API key required.
 * Vector POI/transit overlays added programmatically.
 */
export const MAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'osm-base',
      type: 'raster' as const,
      source: 'osm',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};
