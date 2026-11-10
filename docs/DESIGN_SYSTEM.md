# Guía de Diseño y Figma a Código — Naviport

Esta guía orienta a los **2 desarrolladores Frontend** y a los agentes de IA para traducir con precisión los diseños de **Figma** a componentes nativos de **Ionic 9 + Angular 22**.

---

## 1. Principio Fundamental: Ionic Nativo Primero

Al codificar vistas desde Figma:
1. **NO reinventar la rueda con `<div>` y CSS genérico** si existe un componente equivalente en Ionic.
2. Utilizar los componentes semánticos de Ionic:
   - Encabezados: `<ion-header>`, `<ion-toolbar>`, `<ion-title>`, `<ion-buttons>`, `<ion-back-button>`
   - Contenido scrolleable: `<ion-content>`
   - Listas y tarjetas: `<ion-list>`, `<ion-item>`, `<ion-card>`, `<ion-card-content>`
   - Formularios: `<ion-input>`, `<ion-select>`, `<ion-toggle>`, `<ion-checkbox>`
   - Acciones: `<ion-button>`, `<ion-fab>`, `<ion-action-sheet>`, `<ion-modal>`

---

## 2. Paleta de Colores y Tokens de Diseño

Define las variables globales en `frontend_navi/src/theme/variables.scss` a partir de los estilos de Figma:

```scss
:root {
  /* Colores Principales (Adaptar según Figma) */
  --ion-color-primary: #1e3a8a;
  --ion-color-primary-rgb: 30, 58, 138;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-shade: #172e6e;
  --ion-color-primary-tint: #354e96;

  --ion-color-secondary: #0ea5e9;
  --ion-color-secondary-contrast: #ffffff;

  /* Fondos y Superficies */
  --ion-background-color: #f8fafc;
  --ion-item-background: #ffffff;
  --ion-card-background: #ffffff;

  /* Tipografía y Espaciados */
  --font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --border-radius-base: 12px;
  --border-radius-card: 16px;
}
```

---

## 3. Manejo de Pantallas y Adaptabilidad Móvil

- **SafeArea**: Asegúrate de que las pantallas respeten la muesca (notch) y la barra de navegación del sistema operativo móvil usando `fullscreen` en `<ion-content>` o las variables nativas de Ionic:
  ```html
  <ion-header class="ion-no-border">
    <ion-toolbar color="primary">
      <ion-title>Naviport</ion-title>
    </ion-toolbar>
  </ion-header>

  <ion-content [fullscreen]="true" class="ion-padding">
    <!-- Contenido de la pantalla -->
  </ion-content>
  ```
- **Feedback Háptico**: Usar `@capacitor/haptics` en botones de confirmación o acciones críticas para mejorar la experiencia nativa de la app.
- **Iconografía**: Utilizar la librería oficial de [Ionicons](https://ionic.io/ionicons) coincidiendo con los íconos del Figma.
