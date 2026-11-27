import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WebFrameComponent } from './web-frame.component';

const provider = 'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/';
const equipment = [
  { id: '20-standard', family: 'Seco', title: 'Estándar de 20 pies', space: '5 900 × 2 352 × 2 395', door: '2 340 × 2 292', capacity: '33,2 m³', use: 'Bultos compactos, cajas y palés.' },
  { id: '40-standard', family: 'Seco', title: 'Estándar de 40 pies', space: '12 032 × 2 352 × 2 395', door: '2 340 × 2 292', capacity: '67,7 m³', use: 'Mercancía seca que necesita más superficie.' },
  { id: '40-standard-high-cube', family: 'Seco', title: 'High Cube de 40 pies', space: '12 032 × 2 350 × 2 700', door: '2 340 × 2 597', capacity: '76,3 m³', use: 'Cajas altas o piezas de gran volumen.' },
  { id: '40-reefer-high-cube', family: 'Refrigerado', title: 'Reefer de 40 pies', space: '11 599 × 2 290 × 2 425', door: '2 290 × 2 557', capacity: '67,7 m³', use: 'Carga que requiere control de temperatura.' },
  { id: '20-open-top', family: 'Especial', title: 'Open Top de 20 pies', space: '5 895 × 2 350 × 2 340', door: '2 338 × 2 280', capacity: '32,5 m³', use: 'Piezas que se cargan por el techo con grúa.' },
  { id: '20-flatrack', family: 'Especial', title: 'Flat Rack de 20 pies', space: 'Plataforma de 5 638 × 2 438 mm', door: 'Acceso abierto', capacity: 'No comparable', use: 'Maquinaria o piezas sobredimensionadas.' },
] as const;

@Component({
  selector: 'app-contenedores',
  templateUrl: './contenedores.page.html',
  imports: [RouterLink, WebFrameComponent],
})
export class ContenedoresPage {
  readonly provider = provider;
  readonly equipment = equipment;
  readonly families = ['Todos', 'Seco', 'Refrigerado', 'Especial'];
  readonly family = signal('Todos');
  readonly left = signal<string>(equipment[0].id);
  readonly right = signal<string>(equipment[2].id);
  readonly visible = computed(() => equipment.filter((item) =>
    this.family() === 'Todos' || this.family() === item.family,
  ));
  readonly comparison = computed(() => [
    equipment.find(({ id }) => id === this.left()) ?? equipment[0],
    equipment.find(({ id }) => id === this.right()) ?? equipment[2],
  ]);
}
