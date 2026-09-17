import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map, type LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE } from '../../lib/mapStyle';
import { HEYA_COORDINATES } from '../../lib/distance';
import { todayStatus } from '../../lib/hours';
import type { POI } from '../../lib/data';

interface Props {
  pois: POI[];
  initialCategory?: string;
  initialPlace?: string;
  onPlaceOpened?: (slug: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  museums: '#8c4a8e',
  'mosques-churches': '#2c7a5a',
  'palaces-historical': '#b86a1e',
  markets: '#c83a4d',
  'viewpoints-towers': '#1e6b8a',
};

const CATEGORY_LABELS: Record<string, string> = {
  museums: 'Museums',
  'mosques-churches': 'Mosques & Religious Sites',
  'palaces-historical': 'Palaces & Historical',
  markets: 'Markets & Bazaars',
  'viewpoints-towers': 'Viewpoints & Towers',
};

export default function MapView({
  pois,
  initialCategory,
  initialPlace,
  onPlaceOpened,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(
      initialCategory
        ? [initialCategory]
        : ['museums', 'mosques-churches', 'palaces-historical', 'markets', 'viewpoints-towers'],
    ),
  );
  const [showTransit, setShowTransit] = useState(true);
  const [showWalkRings, setShowWalkRings] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE as any,
      center: [28.9847, 41.0196] as LngLatLike,
      zoom: 11.5,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: { compact: true },
      hash: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

    map.on('load', () => {
      try {
      // Walk-distance rings from Heya (3 km and 5 km translucent fills)
      const ringSource = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            properties: { radius: 5000, label: '5 km walk' },
            geometry: circlePolygon(HEYA_COORDINATES.lng, HEYA_COORDINATES.lat, 5000),
          },
          {
            type: 'Feature' as const,
            properties: { radius: 3000, label: '3 km walk' },
            geometry: circlePolygon(HEYA_COORDINATES.lng, HEYA_COORDINATES.lat, 3000),
          },
        ],
      };

      map.addSource('walk-rings', { type: 'geojson', data: ringSource as any });
      map.addLayer({
        id: 'walk-ring-5km',
        type: 'fill',
        source: 'walk-rings',
        filter: ['==', ['get', 'radius'], 5000],
        paint: {
          'fill-color': '#1e4d5c',
          'fill-opacity': 0.06,
        },
      });
      map.addLayer({
        id: 'walk-ring-3km',
        type: 'fill',
        source: 'walk-rings',
        filter: ['==', ['get', 'radius'], 3000],
        paint: {
          'fill-color': '#1e4d5c',
          'fill-opacity': 0.10,
        },
      });
      map.addLayer({
        id: 'walk-ring-outline',
        type: 'line',
        source: 'walk-rings',
        paint: {
          'line-color': '#1e4d5c',
          'line-opacity': 0.4,
          'line-dasharray': [2, 2],
          'line-width': 1,
        },
      });

      // POI markers as a single GeoJSON source — render as circles colored by category
      const features = pois.map((p) => ({
        type: 'Feature' as const,
        properties: {
          slug: p.data.slug,
          name: p.data.name,
          category: p.data.category,
          categoryColor: CATEGORY_COLORS[p.data.category],
          short: p.data.shortDescription,
        },
        geometry: { type: 'Point' as const, coordinates: [p.data.coordinates.lng, p.data.coordinates.lat] },
      }));

      map.addSource('pois', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features as any,
        },
      });

      map.addLayer({
        id: 'poi-circle-shadow',
        type: 'circle',
        source: 'pois',
        paint: {
          'circle-color': '#000',
          'circle-opacity': 0.18,
          'circle-radius': 9,
          'circle-blur': 1.5,
          'circle-translate': [0, 1.5],
        },
      });
      map.addLayer({
        id: 'poi-circle',
        type: 'circle',
        source: 'pois',
        paint: {
          'circle-color': ['get', 'categoryColor'],
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, 4,
            13, 6,
            16, 9,
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });

      // (POI text labels are intentionally skipped — MapLibre symbol layers
      // need a glyphs endpoint for text fonts, and we don't ship one. The
      // popup that opens on click shows the name; that's enough.)

      // Transit GeoJSON
      const transitFiles = ['t1-tram', 'm2-metro', 'f1-funicular'];
      for (const name of transitFiles) {
        map.addSource(`transit-${name}`, {
          data: `/transit/${name}.geojson`,
          type: 'geojson',
        });
        map.addLayer({
          id: `transit-line-${name}`,
          type: 'line',
          source: `transit-${name}`,
          paint: {
            'line-color': name.includes('tram')
              ? '#c83a4d'
              : name.includes('metro')
                ? '#2c7a5a'
                : '#8c4a8e',
            'line-width': 3,
            'line-opacity': 0.85,
          },
        });
      }

      // Ferry terminals as small markers
      map.addSource('ferry', { data: '/transit/ferry-terminals.geojson', type: 'geojson' });
      map.addLayer({
        id: 'ferry-circle',
        type: 'circle',
        source: 'ferry',
        paint: {
          'circle-color': '#1e6b8a',
          'circle-radius': 5,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });

      // Heya pin (DOM marker — easier to style with custom HTML)
      const heyaEl = document.createElement('div');
      heyaEl.className = 'heya-marker';
      heyaEl.innerHTML = `
        <div class="heya-pulse"></div>
        <div class="heya-pin">
          <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">
            <path d="M16 2 C 8 2 2 8 2 16 C 2 26 16 38 16 38 C 16 38 30 26 30 16 C 30 8 24 2 16 2 Z" fill="#c5a059" stroke="#163946" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="#163946" font-size="11" font-weight="700" font-family="serif">H</text>
          </svg>
          <div class="heya-label">Heya Hotel · You are here</div>
        </div>`;
      new maplibregl.Marker({ element: heyaEl, anchor: 'bottom' })
        .setLngLat([HEYA_COORDINATES.lng, HEYA_COORDINATES.lat])
        .addTo(map);

      // Click marker → popup
      map.on('click', 'poi-circle', (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const coords = (feature.geometry as any).coordinates.slice() as [number, number];
        const props = feature.properties as any;

        const status = todayStatus(
          (pois.find((p) => p.data.slug === props.slug)?.data.hours) as any,
        );

        const statusColor =
          status.status === 'open'
            ? '#2f7a52'
            : status.status === 'closing-soon'
              ? '#b6731b'
              : '#a13838';

        const html = `
          <article class="map-popup">
            <span class="popup-cat" style="background:${props.categoryColor}">
              ${CATEGORY_LABELS[props.category] ?? props.category}
            </span>
            <h3 class="popup-title">${escapeHtml(props.name)}</h3>
            <span class="popup-status" style="color:${statusColor}">
              <span class="dot" style="background:${statusColor}"></span>
              ${escapeHtml(status.label)}
            </span>
            <p class="popup-desc">${escapeHtml(props.short)}</p>
            <a class="popup-cta" href="/places/${encodeURIComponent(props.slug)}">Read more →</a>
          </article>
        `;

        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new maplibregl.Popup({
          offset: 18,
          closeButton: true,
          maxWidth: '300px',
          className: 'maplibreg-custom-popup',
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);

        if (onPlaceOpened) onPlaceOpened(props.slug);
      });

      map.on('mouseenter', 'poi-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'poi-circle', () => {
        map.getCanvas().style.cursor = '';
      });

      setMapReady(true);

      // Deep-link: ?place=<slug>
      if (initialPlace) {
        const target = pois.find((p) => p.data.slug === initialPlace);
        if (target) {
          map.flyTo({
            center: [target.data.coordinates.lng, target.data.coordinates.lat],
            zoom: 14.5,
            duration: 1800,
          });
        }
      }
      } catch (err) {
        console.error('[MapView] error during load handler:', err);
      }
    });

    mapRef.current = map;

    return () => {
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle category visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const allCats = Object.keys(CATEGORY_COLORS);
    for (const cat of allCats) {
      const visible = activeCategories.has(cat);
      const filter = ['==', ['get', 'category'], cat];
      map.setFilter('poi-circle-shadow', [
        'all',
        ...(visible ? [filter] : [['==', ['get', 'category'], '__none__']]),
      ]);
      map.setFilter('poi-circle', [
        'all',
        ...(visible ? [filter] : [['==', ['get', 'category'], '__none__']]),
      ]);
      map.setFilter('poi-label', [
        'all',
        ...(visible ? [filter] : [['==', ['get', 'category'], '__none__']]),
      ]);
    }
  }, [activeCategories, mapReady]);

  // Toggle transit visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showTransit ? 'visible' : 'none';
    ['t1-tram', 'm2-metro', 'f1-funicular'].forEach((n) => {
      if (map.getLayer(`transit-line-${n}`))
        map.setLayoutProperty(`transit-line-${n}`, 'visibility', visibility);
    });
    if (map.getLayer('ferry-circle'))
      map.setLayoutProperty('ferry-circle', 'visibility', visibility);
  }, [showTransit, mapReady]);

  // Toggle walk-rings
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showWalkRings ? 'visible' : 'none';
    ['walk-ring-3km', 'walk-ring-5km', 'walk-ring-outline'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
    });
  }, [showWalkRings, mapReady]);

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" aria-label="Istanbul interactive map" />
      <div className="map-controls" role="region" aria-label="Map filters">
        <div className="control-card">
          <h3 className="control-title">Categories</h3>
          <div className="cat-toggles">
            {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
              <button
                key={cat}
                type="button"
                className={`cat-toggle ${activeCategories.has(cat) ? 'on' : 'off'}`}
                onClick={() => toggleCategory(cat)}
                aria-pressed={activeCategories.has(cat)}
                style={{ '--accent': color } as React.CSSProperties}
              >
                <span className="dot" />
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="toggles-row">
            <label className="switch">
              <input
                type="checkbox"
                checked={showTransit}
                onChange={(e) => setShowTransit(e.target.checked)}
              />
              <span>Transit overlay</span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                checked={showWalkRings}
                onChange={(e) => setShowWalkRings(e.target.checked)}
              />
              <span>Walk rings</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Build a GeoJSON polygon approximating a circle of given radius (meters) at lng/lat. */
function circlePolygon(lng: number, lat: number, radiusMeters: number, points = 64) {
  const coords: [number, number][] = [];
  const earthRadius = 6378137;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  for (let i = 0; i < points; i++) {
    const bearing = (i * 360) / points;
    const brng = (bearing * Math.PI) / 180;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(radiusMeters / earthRadius) +
        Math.cos(lat1) * Math.sin(radiusMeters / earthRadius) * Math.cos(brng),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(radiusMeters / earthRadius) * Math.cos(lat1),
        Math.cos(radiusMeters / earthRadius) - Math.sin(lat1) * Math.sin(lat2),
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  coords.push(coords[0]);
  return { type: 'Polygon' as const, coordinates: [coords] };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
