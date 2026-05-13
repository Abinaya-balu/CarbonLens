/**
 * Mock Google Maps Timeline commute fetcher.
 * Generates realistic commute segments for a date.
 */

/**
 * @typedef {Object} CommuteSegment
 * @property {'car_km'|'metro_km'|'bike_km'} modeUnit
 * @property {number} distanceKm
 * @property {Object} metadata
 */

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function baseLatLngForRegion(region) {
  // Rough city centers for demo routing visuals (not exact).
  if (region === 'TN') return [13.0827, 80.2707]; // Chennai
  if (region === 'KA') return [12.9716, 77.5946]; // Bengaluru
  if (region === 'MH') return [19.0760, 72.8777]; // Mumbai
  if (region === 'DL') return [28.6139, 77.2090]; // Delhi
  return [13.0827, 80.2707];
}

function jitter([lat, lng], km) {
  // ~111km per degree lat; lon scaled by cos(lat)
  const dLat = (km / 111) * (Math.random() < 0.5 ? -1 : 1) * rand(0.4, 1.0);
  const dLng = (km / (111 * Math.cos((lat * Math.PI) / 180))) * (Math.random() < 0.5 ? -1 : 1) * rand(0.4, 1.0);
  return [lat + dLat, lng + dLng];
}

function buildPolyline(start, end, points = 12, curvature = 1) {
  const [sLat, sLng] = start;
  const [eLat, eLng] = end;
  const line = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const lat = sLat + (eLat - sLat) * t;
    const lng = sLng + (eLng - sLng) * t;
    // add gentle sinusoidal curvature
    const bend = Math.sin(t * Math.PI) * 0.004 * curvature;
    line.push([lat + bend * (Math.random() < 0.5 ? -1 : 1), lng + bend]);
  }
  return line;
}

/**
 * Fetch (mock) commute segments for a user/date.
 * @param {{ userId: string, region: string }} params
 * @param {Date} date
 * @returns {Promise<CommuteSegment[]>}
 */
export async function fetchMockCommuteForDate(params, date) {
  const weekday = date.getDay(); // 0=Sun
  const isWeekend = weekday === 0 || weekday === 6;

  const segments = [];

  // Many users don't commute on weekends.
  if (isWeekend && Math.random() < 0.55) return segments;

  const trips = isWeekend ? (Math.random() < 0.7 ? 1 : 2) : (Math.random() < 0.8 ? 2 : 3);
  for (let i = 0; i < trips; i++) {
    const modeUnit = pick(['car_km', 'metro_km', 'bike_km']);
    const base = modeUnit === 'car_km' ? rand(4, 18) : modeUnit === 'metro_km' ? rand(6, 22) : rand(2, 10);
    const distanceKm = Math.round(base * 10) / 10;

    const center = baseLatLngForRegion(params.region);
    const start = jitter(center, rand(2, 7));
    const end = jitter(center, rand(2, 7));
    const actualRoute = buildPolyline(start, end, 14, modeUnit === 'car_km' ? 1.2 : modeUnit === 'bike_km' ? 0.8 : 1.0);
    // "Nearest metro/bus" route: slightly longer, smoother
    const transitRoute = buildPolyline(start, end, 10, 0.6);
    const transitDistanceKm = Math.round(distanceKm * rand(1.05, 1.25) * 10) / 10;

    segments.push({
      modeUnit,
      distanceKm,
      metadata: {
        provider: 'google_maps_mock',
        userId: params.userId,
        region: params.region,
        tripIndex: i + 1,
        confidence: Math.round(rand(75, 98)),
        route: {
          start,
          end,
          actualRoute,
          transitRoute,
          transitDistanceKm,
          transitMode: pick(['metro', 'bus']),
        },
      },
    });
  }

  // Add occasional small errand trip
  if (Math.random() < 0.25) {
    const modeUnit = pick(['car_km', 'bike_km']);
    const distanceKm = Math.round(rand(1, 6) * 10) / 10;
    const center = baseLatLngForRegion(params.region);
    const start = jitter(center, rand(1, 4));
    const end = jitter(center, rand(1, 4));
    segments.push({
      modeUnit,
      distanceKm,
      metadata: {
        provider: 'google_maps_mock',
        userId: params.userId,
        region: params.region,
        tripIndex: segments.length + 1,
        confidence: Math.round(rand(70, 95)),
        purpose: 'errand',
        route: {
          start,
          end,
          actualRoute: buildPolyline(start, end, 10, 1.0),
          transitRoute: buildPolyline(start, end, 8, 0.6),
          transitDistanceKm: Math.round(distanceKm * rand(1.05, 1.25) * 10) / 10,
          transitMode: pick(['metro', 'bus']),
        },
      },
    });
  }

  return segments;
}

