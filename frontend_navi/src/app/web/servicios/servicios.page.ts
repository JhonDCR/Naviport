import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-servicios',
  templateUrl: './servicios.page.html',
  styleUrl: './servicios.page.scss',
  imports: [IonButton, IonContent, IonIcon, RouterLink],
})
export class ServiciosPage {}
