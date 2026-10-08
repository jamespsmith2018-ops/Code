import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatMass, markerRadius } from './data';
import type { Meteorite, UkMeteor } from './types';
import { OTHER_COLOR, trackWeight } from './ukmon';

const FALL_COLORS = { Fell: '#f97316', Found: '#38bdf8' } as const;

export interface MeteorMap {
  renderLandings(items: readonly Meteorite[], onSelect: (m: Meteorite) => void): void;
  renderTracks(
    items: readonly UkMeteor[],
    colors: Map<string, string>,
    onSelect: (m: UkMeteor) => void,
  ): void;
  focusWorld(): void;
  focusUk(): void;
}

export function createMap(el: HTMLElement): MeteorMap {
  // Canvas rendering keeps tens of thousands of markers responsive.
  const map = L.map(el, { preferCanvas: true, worldCopyJump: true }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const layer = L.layerGroup().addTo(map);

  return {
    renderLandings(items, onSelect) {
      layer.clearLayers();
      for (const m of items) {
        L.circleMarker([m.lat, m.lon], {
          radius: markerRadius(m.mass),
          color: FALL_COLORS[m.fall],
          weight: 1,
          fillOpacity: 0.6,
        })
          .bindTooltip(`${m.name} · ${formatMass(m.mass)}`)
          .on('click', () => onSelect(m))
          .addTo(layer);
      }
    },

    renderTracks(items, colors, onSelect) {
      layer.clearLayers();
      for (const m of items) {
        const color = colors.get(m.shower) ?? OTHER_COLOR;
        const tip = `${m.shower === 'spo' ? 'Sporadic' : m.shower} · ${m.t.slice(0, 16).replace('T', ' ')} UTC · mag ${m.mag ?? '?'}`;
        // The track runs from where the meteor appeared to where it burnt out;
        // the dot marks the end.
        L.polyline(
          [
            [m.lat1, m.lon1],
            [m.lat2, m.lon2],
          ],
          { color, weight: trackWeight(m.mag), opacity: 0.85 },
        )
          .bindTooltip(tip)
          .on('click', () => onSelect(m))
          .addTo(layer);
        L.circleMarker([m.lat2, m.lon2], { radius: 2, color, weight: 0, fillOpacity: 0.9 })
          .on('click', () => onSelect(m))
          .addTo(layer);
      }
    },

    focusWorld() {
      map.setView([20, 0], 2);
    },

    focusUk() {
      map.fitBounds([
        [49.5, -11],
        [59.5, 3],
      ]);
    },
  };
}
