import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { cargarBaseApi } from './app/core/runtime-config';

cargarBaseApi()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
