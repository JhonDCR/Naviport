import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';

interface IntroSlide {
  prefix: string;
  highlight: string;
  description: string;
}

const INTRO_SLIDES: IntroSlide[] = [
  {
    prefix: 'Importaciones Fáciles, ',
    highlight: 'Negocios Inteligentes',
    description:
      'Rastrea tus contenedores desde Shanghai y Miami hasta Guayaquil en tiempo real y sin complicaciones aduaneras.',
  },
  {
    prefix: 'Inspección Óptica ',
    highlight: 'con IA en Muelle',
    description:
      'Escaneo instantáneo de códigos ISO, validación de precintos e historial completo desde la palma de tu mano.',
  },
  {
    prefix: 'Control Total de ',
    highlight: 'Flota y Analítica',
    description:
      'KPIs de puntualidad, alertas críticas en vivo y administración integral de buques, puertos y viajes.',
  },
];

@Component({
  selector: 'app-introduccion',
  templateUrl: './introduccion.page.html',
  styleUrls: ['./introduccion.page.scss'],
  imports: [IonContent, IonButton, IonIcon],
})
export class IntroduccionPage {
  private readonly router = inject(Router);

  readonly slides = INTRO_SLIDES;
  readonly activeSlideIndex = signal(0);
  readonly currentSlide = computed(() => this.slides[this.activeSlideIndex()]);

  selectSlide(index: number): void {
    this.activeSlideIndex.set(index);
  }

  startApp(): void {
    void this.router.navigateByUrl('/login');
  }
}
