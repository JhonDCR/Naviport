import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { checkmarkOutline, closeOutline, cubeOutline } from 'ionicons/icons';
import { WebFrameComponent } from './web-frame.component';

const provider = 'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/';
const equipment = [
  { id: '20-standard', family: 'Seco', title: 'Estándar de 20 pies', space: '5 900 × 2 352 × 2 395', door: '2 340 × 2 292', capacity: '33,2 m³', use: 'Bultos compactos, cajas y palés.' },
  { id: '40-standard', family: 'Seco', title: 'Estándar de 40 pies', space: '12 032 × 2 352 × 2 395', door: '2 340 × 2 292', capacity: '67,7 m³', use: 'Mercancía seca que necesita más superficie.' },
  { id: '40-standard-high-cube', family: 'Seco', title: 'High Cube de 40 pies', space: '12 032 × 2 350 × 2 700', door: '2 340 × 2 597', capacity: '76,3 m³', use: 'Cajas altas o piezas de gran volumen.' },
  { id: '40-reefer-high-cube', family: 'Refrigerado', title: 'Reefer de 40 pies', space: '11 599 × 2 290 × 2 425', door: '2 290 × 2 557', capacity: '67,7 m³', use: 'Carga que requiere control de temperatura.' },
  { id: '20-open-top', family: 'Especial', title: 'Open Top de 20 pies', space: '5 895 × 2 350 × 2 340', door: '2 338 × 2 280', capacity: '32,5 m³', use: 'Piezas que se cargan por el techo con grúa.' },
  { id: '20-flatrack', family: 'Especial', title: 'Flat Rack de 20 pies', space: '5 638 × 2 438 mm', door: 'Acceso abierto', capacity: 'No comparable', use: 'Maquinaria o piezas sobredimensionadas.' },
] as const;

const filters = [
  { id: 'Todos', label: 'Todos' },
  { id: 'Seco', label: 'Secos' },
  { id: 'Refrigerado', label: 'Refrigerados' },
  { id: 'Especial', label: 'Especiales' },
] as const;

type Equipment = (typeof equipment)[number];

@Component({
  selector: 'app-contenedores',
  templateUrl: './contenedores.page.html',
  styleUrl: './contenedores.page.scss',
  imports: [IonIcon, RouterLink, WebFrameComponent],
})
export class ContenedoresPage {
  readonly provider = provider;
  readonly icons = { checkmarkOutline, closeOutline, cubeOutline };
  readonly filters = filters;
  readonly total = equipment.length;
  readonly family = signal<(typeof filters)[number]['id']>('Todos');
  readonly selected = signal<readonly Equipment[]>([]);
  readonly visible = computed(() => equipment.filter((item) =>
    this.family() === 'Todos' || item.family === this.family(),
  ));

  toggle(item: Equipment): void {
    const picks = this.selected();
    if (picks.includes(item)) {
      this.selected.set(picks.filter((entry) => entry !== item));
    } else if (picks.length < 2) {
      this.selected.set([...picks, item]);
    }
  }

  showComparison(heading: HTMLElement): void {
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  }
}
