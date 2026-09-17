import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map, type LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLE } from '../../lib/mapStyle';
import { HEYA_COORDINATES } from '../../lib/distance';
import { todayStatus } from '../../lib/hours';
import type { POI } from '../../lib/data';
import ferries from '../../data/ferries.json';

interface Props {
  pois: POI[];
  initialPlace?: string;
  onPlaceOpened?: (slug: string) => void;
}

export default function MapView({
  pois,
  initialPlace,
  onPlaceOpened,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [showWalkRings, setShowWalkRings] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  // Selected POI for the floating info card (replaces the old MapLibre popup,
  // which got blocked by the legend on mobile). Set by clicking a POI on the
  // map, by the deep-link ?place=<slug>, or by a ferry-station click.
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [selectedFerry, setSelectedFerry] = useState<any | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<{ label: string; color: string } | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE as any,
      center: [28.9847, 41.0196] as LngLatLike,
      zoom: 12.7,
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

      // POI markers as a single GeoJSON source — render as blue circles.
      const features = pois.map((p) => ({
        type: 'Feature' as const,
        properties: {
          slug: p.data.slug,
          name: p.data.name,
          category: p.data.category,
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
          // Single blue color for all POIs — consistent, easy to scan.
          'circle-color': '#1e6b8a',
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            10, 5,
            13, 7,
            16, 10,
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });

      // (POI text labels are intentionally skipped — MapLibre symbol layers
      // need a glyphs endpoint for text fonts, and we don't ship one. The
      // popup that opens on click shows the name; that's enough.)

      // Ferry stations — anchor/ship icons so guests can see where ferries leave from.
      // Renders as small navy circles; clicking opens a popup with the destinations.
      const ferryFeatures = ferries.stations.map((s) => ({
        type: 'Feature' as const,
        properties: {
          id: s.id,
          name: s.name,
          side: s.side,
          note: s.note,
          destSummary: s.destinations.map((d) => d.name).join(' · '),
          destCount: s.destinations.length,
        },
        geometry: { type: 'Point' as const, coordinates: [s.coordinates.lng, s.coordinates.lat] },
      }));
      map.addSource('ferry-stations', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: ferryFeatures as any },
      });
      map.addLayer({
        id: 'ferry-circle',
        type: 'circle',
        source: 'ferry-stations',
        paint: {
          'circle-color': '#163946',
          'circle-radius': 5,
          'circle-stroke-color': '#c5a059',
          'circle-stroke-width': 2,
        },
      });

      // Click ferry → open the floating info card (same UI as POI dots).
      map.on('click', 'ferry-circle', (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const props = feature.properties as any;
        const station = ferries.stations.find((s) => s.id === props.id);
        if (!station) return;
        setSelectedFerry(station);
        setSelectedPoi(null);
        setSelectedStatus(null);
        if (onPlaceOpened) onPlaceOpened(`ferry-${props.id}`);
      });
      map.on('mouseenter', 'ferry-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'ferry-circle', () => {
        map.getCanvas().style.cursor = '';
      });

      // Transit lines removed — user requested no public transportation overlay.

      // Heya pin — single gold SVG teardrop. Anchor: 'bottom' puts the pin's
      // tip at the exact geo-coordinate so the marker stays put on the map.
      // No floating label, no pulse — those visual elements used `position:
      // absolute` with computed offsets that caused them to drift visually
      // during pinch-zoom on touch devices, making the pin look unstable.
      // The legend in the corner already tells the user what the gold H is.
      const heyaEl = document.createElement('div');
      heyaEl.className = 'heya-marker';
      heyaEl.innerHTML = `
        <svg viewBox="0 0 32 40" width="32" height="40" aria-label="Heya Hotel">
          <path d="M16 2 C 8 2 2 8 2 16 C 2 26 16 38 16 38 C 16 38 30 26 30 16 C 30 8 24 2 16 2 Z"
                fill="#c5a059" stroke="#163946" stroke-width="2"/>
          <text x="16" y="21" text-anchor="middle" fill="#163946"
                font-size="13" font-weight="700" font-family="serif">H</text>
        </svg>`;
      new maplibregl.Marker({ element: heyaEl, anchor: 'bottom', offset: [0, 2] })
        .setLngLat([HEYA_COORDINATES.lng, HEYA_COORDINATES.lat])
        .addTo(map);

      // Click POI dot → open the floating info card (not a MapLibre popup,
      // which got blocked by the mobile legend and was generally cramped).
      map.on('click', 'poi-circle', (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const props = feature.properties as any;
        const poi = pois.find((p) => p.data.slug === props.slug);
        if (!poi) return;

        const status = todayStatus(poi.data.hours as any);
        const statusColor =
          status.status === 'open'
            ? '#2f7a52'
            : status.status === 'closing-soon'
              ? '#b6731b'
              : '#a13838';
        setSelectedPoi(poi);
        setSelectedStatus({ label: status.label, color: statusColor });
        setSelectedFerry(null);
        if (onPlaceOpened) onPlaceOpened(props.slug);
      });

      map.on('mouseenter', 'poi-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'poi-circle', () => {
        map.getCanvas().style.cursor = '';
      });

      setMapReady(true);

      // POI labels removed — user wants just blue dots. Names are still
      // available on click via the popup (see click handler above).
      const updateLabels = () => {
        // no-op, kept as a stub so we can re-enable labels later if needed
      };

      // Deep-link: ?place=<slug> — fly to the POI and open the info card.
      if (initialPlace) {
        const target = pois.find((p) => p.data.slug === initialPlace);
        if (target) {
          map.flyTo({
            center: [target.data.coordinates.lng, target.data.coordinates.lat],
            zoom: 14.5,
            duration: 1800,
          });
          const status = todayStatus(target.data.hours as any);
          const statusColor =
            status.status === 'open'
              ? '#2f7a52'
              : status.status === 'closing-soon'
                ? '#b6731b'
                : '#a13838';
          // Open the card a moment after the flyTo finishes, so the user
          // sees the dot they were looking for before the card appears.
          setTimeout(() => {
            setSelectedPoi(target);
            setSelectedStatus({ label: status.label, color: statusColor });
          }, 1900);
        }
      }
      } catch (err) {
        console.error('[MapView] error during load handler:', err);
      }
    });

    // Click on map background (not a POI or ferry) closes any open info card.
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ['poi-circle', 'ferry-circle'],
      });
      if (features.length === 0) {
        setSelectedPoi(null);
        setSelectedFerry(null);
        setSelectedStatus(null);
      }
    });

    mapRef.current = map;

    return () => {
      if (popupRef.current) popupRef.current.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Transit toggle removed — transit lines no longer rendered.

  // Toggle walk-rings
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showWalkRings ? 'visible' : 'none';
    ['walk-ring-3km', 'walk-ring-5km', 'walk-ring-outline'].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
    });
  }, [showWalkRings, mapReady]);

  return (
    <div className="map-layout">
      <div className="map-shell">
        <div ref={containerRef} className="map-canvas" aria-label="Istanbul interactive map" />
        <div className="map-controls map-controls--floating" role="region" aria-label="Map legend (desktop)">
          <div className="control-card">
            <h3 className="control-title">Legend</h3>
            <div className="legend-simple">
              <div className="legend-row">
                <span className="legend-simple-dot legend-simple-dot--poi" />
                <span>Point of interest</span>
              </div>
              <div className="legend-row">
                <span className="legend-simple-dot legend-simple-dot--heya" />
                <span>Heya Hotel</span>
              </div>
              <div className="legend-row">
                <span className="legend-simple-dot legend-simple-dot--ferry" />
                <span>Ferry terminal</span>
              </div>
            </div>
            <div className="toggles-row" style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--line)' }}>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showWalkRings}
                  onChange={(e) => setShowWalkRings(e.target.checked)}
                />
                <span>Walk rings</span>
              </label>
            </div>
            <a className="legend-ferry-link" href="/ferries/">All ferries & schedules →</a>
          </div>
        </div>
      </div>
      {/* Mobile-only legend block, sits below the map in the document flow. */}
      <div className="map-controls map-controls--below" role="region" aria-label="Map legend (mobile)">
        <div className="control-card">
          <div className="legend-simple legend-simple--inline">
            <div className="legend-row">
              <span className="legend-simple-dot legend-simple-dot--poi" />
              <span>Point of interest</span>
            </div>
            <div className="legend-row">
              <span className="legend-simple-dot legend-simple-dot--heya" />
              <span>Heya Hotel</span>
            </div>
            <div className="legend-row">
              <span className="legend-simple-dot legend-simple-dot--ferry" />
              <span>Ferry</span>
            </div>
            <a className="legend-ferry-link" href="/ferries/">Ferries & schedules →</a>
            <label className="switch switch--inline">
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

      {/* Floating info card — replaces the old MapLibre popups. Bottom-sheet
          style on mobile (slides up from the bottom), right-side panel on
          desktop. Renders nothing when nothing is selected. */}
      {(selectedPoi || selectedFerry) && (
        <div
          className="poi-info-card"
          role="dialog"
          aria-label={selectedPoi ? selectedPoi.data.name : selectedFerry?.name}
        >
          <div className="poi-info-card-handle" aria-hidden="true" />
          <button
            type="button"
            className="poi-info-card-close"
            aria-label="Close"
            onClick={() => {
              setSelectedPoi(null);
              setSelectedFerry(null);
              setSelectedStatus(null);
            }}
          >
            ×
          </button>

          {selectedPoi && (
            <div className="poi-info-card-body">
              <h3 className="poi-info-card-title">{selectedPoi.data.name}</h3>
              {selectedStatus && (
                <span
                  className="poi-info-card-status"
                  style={{ color: selectedStatus.color }}
                >
                  <span
                    className="poi-info-card-dot"
                    style={{ background: selectedStatus.color }}
                  />
                  {selectedStatus.label}
                </span>
              )}
              <p className="poi-info-card-desc">
                {selectedPoi.data.shortDescription}
              </p>
              <a
                className="poi-info-card-cta"
                href={`/places/${encodeURIComponent(selectedPoi.data.slug)}`}
              >
                Read more →
              </a>
            </div>
          )}

          {selectedFerry && (
            <div className="poi-info-card-body">
              <h3 className="poi-info-card-title">{selectedFerry.name}</h3>
              <span className="poi-info-card-status">
                {selectedFerry.side} side
              </span>
              <p className="poi-info-card-desc">{selectedFerry.note}</p>
              <h4 className="poi-info-card-heading">Where it goes</h4>
              <ul className="poi-info-card-dests">
                {selectedFerry.destinations.map((d: any) => (
                  <li key={d.name} className="poi-info-card-dest">
                    <div className="poi-info-card-dest-name">{d.name}</div>
                    <div className="poi-info-card-dest-meta">
                      {d.operators.join(' · ')} · {d.duration}
                    </div>
                  </li>
                ))}
              </ul>
              <a
                className="poi-info-card-cta"
                href={`/ferries/#${encodeURIComponent(selectedFerry.id)}`}
              >
                See full schedule →
              </a>
            </div>
          )}
        </div>
      )}
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
