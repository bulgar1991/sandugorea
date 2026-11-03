import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { Map as LeafletMap } from 'leaflet';

/** Sargans, Switzerland. */
const STUDIO = { lat: 47.0487, lng: 9.4436 };

/**
 * Studio location on an OpenStreetMap (Leaflet) with the SG monogram as the pin.
 * Leaflet is loaded only when this component renders, so it never weighs on other pages.
 */
@Component({
  selector: 'app-studio-map',
  template: `<div #map class="studio-map__canvas" role="region" [attr.aria-label]="label()"></div>`,
  styleUrl: './studio-map.component.scss',
  // Leaflet builds the pin and controls itself, outside Angular's style scoping.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'studio-map' },
})
export class StudioMapComponent {
  /** Accessible name of the map region. */
  readonly label = input('');

  private readonly canvas = viewChild.required<ElementRef<HTMLElement>>('map');
  private map?: LeafletMap;

  constructor() {
    afterNextRender(async () => {
      // Leaflet is CommonJS: its API sits on the default export once bundled.
      const L = (await import('leaflet')).default;
      const touch = matchMedia('(pointer: coarse)').matches;
      this.map = L.map(this.canvas().nativeElement, {
        center: [STUDIO.lat, STUDIO.lng],
        zoom: 13,
        // Let the page scroll past the map; on phones one finger scrolls, zoom with the buttons.
        scrollWheelZoom: false,
        dragging: !touch,
        attributionControl: true,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.map);
      this.map.attributionControl.setPrefix(false);

      const pin = L.divIcon({
        className: 'studio-map__marker',
        html: '<span class="studio-map__pulse"></span><span class="studio-map__pin"><img src="/favicon.svg" alt="" class="studio-map__logo" /></span>',
        iconSize: [52, 64],
        iconAnchor: [26, 64],
      });
      L.marker([STUDIO.lat, STUDIO.lng], { icon: pin, keyboard: false, alt: 'Sandu Gorea' }).addTo(
        this.map,
      );
    });
    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }
}
