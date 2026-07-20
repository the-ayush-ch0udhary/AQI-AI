export const AQI_CATEGORIES = [
  { name: 'Good',         min: 0,   max: 50,  cls: 'aqi-good',         soft: 'aqi-good-soft',         hex: '#10B981' },
  { name: 'Satisfactory', min: 51,  max: 100, cls: 'aqi-satisfactory', soft: 'aqi-satisfactory-soft', hex: '#FBBF24' },
  { name: 'Moderate',     min: 101, max: 200, cls: 'aqi-moderate',     soft: 'aqi-moderate-soft',     hex: '#F97316' },
  { name: 'Poor',         min: 201, max: 300, cls: 'aqi-poor',         soft: 'aqi-poor-soft',         hex: '#EF4444' },
  { name: 'Very Poor',    min: 301, max: 400, cls: 'aqi-very-poor',    soft: 'aqi-very-poor-soft',    hex: '#A855F7' },
  { name: 'Severe',       min: 401, max: 500, cls: 'aqi-severe',       soft: 'aqi-severe-soft',       hex: '#881337' },
];

export function categoryFor(aqi) {
  return AQI_CATEGORIES.find((c) => aqi >= c.min && aqi <= c.max) || AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

export const POLLUTANT_LABELS = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2:  'NO₂',
  so2:  'SO₂',
  co:   'CO',
  o3:   'O₃',
  nh3:  'NH₃',
};

export const POLLUTANT_UNITS = {
  pm25: 'µg/m³', pm10: 'µg/m³', no2: 'µg/m³', so2: 'µg/m³',
  co: 'mg/m³', o3: 'µg/m³', nh3: 'µg/m³',
};
