/**
 * Distance and walking-time helpers.
 * Heya Hotel anchor: Kocatepe Mah., Dolapdere Taksim Cd. No:45, Beyoğlu.
 */

export const HEYA_COORDINATES = { lat: 41.0391296, lng: 28.9832318 } as const;

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance in kilometers (haversine formula).
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Walking-time estimate from Heya Hotel.
 * Average adult walking speed: 4.8 km/h on flat, slower with hills/heat.
 * Istanbul terrain has some hills (Beyoğlu). Use 4.2 km/h to be conservative.
 */
export function walkTimeFromHeya(
  poiCoord: { lat: number; lng: number },
): { km: number; minutes: number; label: string } {
  const km = haversineKm(HEYA_COORDINATES, poiCoord);
  const minutes = Math.round((km / 4.2) * 60);
  let label: string;
  if (km < 1) {
    label = `${Math.round(km * 1000)} m from Heya`;
  } else {
    label = `${km.toFixed(1)} km · ~${minutes} min walk`;
  }
  return { km, minutes, label };
}
