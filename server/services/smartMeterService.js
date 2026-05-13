/**
 * Mock Smart Meter energy usage fetcher.
 * Generates plausible kWh usage for a date.
 */

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Fetch (mock) total household energy usage in kWh for a date.
 * @param {{ userId: string, region: string }} params
 * @param {Date} date
 * @returns {Promise<{ kwh: number, metadata: any }>}
 */
export async function fetchMockEnergyForDate(params, date) {
  const month = date.getMonth(); // 0=Jan
  const isSummer = month >= 2 && month <= 6; // Mar-Jul-ish (AC loads)
  const weekday = date.getDay();
  const isWeekend = weekday === 0 || weekday === 6;

  const base = isSummer ? rand(6, 14) : rand(4, 10);
  const weekendBump = isWeekend ? rand(0.5, 2.5) : 0;
  const noise = rand(-1.2, 1.2);

  const kwh = Math.max(1.2, Math.round((base + weekendBump + noise) * 10) / 10);

  return {
    kwh,
    metadata: {
      provider: 'smart_meter_mock',
      userId: params.userId,
      region: params.region,
      isSummer,
      isWeekend,
    },
  };
}

