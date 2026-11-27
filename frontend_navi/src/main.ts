import { bootstrapApplication } from '@angular/platform-browser';
import { NoPreloading, PreloadAllModules, RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { AppComponent } from './app/app.component';
import { isNative, routes } from './app/app.routes';
import { webNavigationAnimation } from './app/web/web-navigation-animation';

async function start(): Promise<void> {
  if (isNative) (await import('./app/shared/icons')).registerNaviIcons();

  await bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideIonicAngular(isNative ? {} : { navAnimation: webNavigationAnimation }),
      provideRouter(routes, withComponentInputBinding(), withPreloading(isNative ? PreloadAllModules : NoPreloading)),
    ],
  });
}

void start();
