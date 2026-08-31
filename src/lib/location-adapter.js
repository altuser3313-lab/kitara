export function toGeoJson(pharmacyRows = []) {
  return {
    type: 'FeatureCollection',
    features: pharmacyRows
      .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: { id: p.id, name: p.name, open: p.open }
      }))
  };
}
