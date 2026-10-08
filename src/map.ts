import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatMass, markerRadius } from './data';
import type { Meteorite } from './types';

const COLORS = { Fell: '#f97316', Found: '#38bdf8' } as const;

export interface MeteoriteMap {
  render(items: readonly Meteorite[]): void;
}

export function createMap(el: HTMLElement, onSelect: (m: Meteorite) => void): MeteoriteMap {
  // Canvas rendering keeps tens of thousands of markers responsive.
  const map = L.map(el, { preferCanvas: true, worldCopyJump: true }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const layer = L.layerGroup().addTo(map);

  return {
    render(items) {
      layer.clearLayers();
      for (const m of items) {
        L.circleMarker([m.lat, m.lon], {
          radius: markerRadius(m.mass),
          color: COLORS[m.fall],
          weight: 1,
          fillOpacity: 0.6,
        })
          .bindTooltip(`${m.name} · ${formatMass(m.mass)}`)
          .on('click', () => onSelect(m))
          .addTo(layer);
      }
    },
  };
}
