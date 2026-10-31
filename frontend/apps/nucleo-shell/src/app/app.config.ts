import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';
import { nucleoPreset } from '@nucleo/design-tokens';
import { AuditLogSource } from '@nucleo/ui-shared';
import { appRoutes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { AuthStateService } from './auth/auth-state.service';
import { credentialsInterceptor } from './auth/credentials.interceptor';
import { xsrfInterceptor } from './auth/xsrf.interceptor';
import { AuditoriaService } from './core/auditoria.service';
import {
  BUSCADOR_CATEGORIA,
  BUSCADOR_CLIENTE,
  BUSCADOR_INSUMO,
  BUSCADOR_PRODUCTO,
  BUSCADOR_RECETA,
  BUSCADOR_UNIDAD_MEDIDA,
  BUSCADOR_USUARIO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
  BUSCADOR_VENTA,
} from './core/buscadores-entidad.tokens';
import { UsuarioBuscadorService } from './modules/administracion/usuario-buscador.service';
import { ClienteBuscadorService } from './modules/crm/cliente-buscador.service';
import { CategoriaBuscadorService } from './modules/inventario/categoria-buscador.service';
import { ProductoBuscadorService } from './modules/inventario/producto-buscador.service';
import { VariantesDeProductoBuscadorService } from './modules/inventario/variantes-de-producto-buscador.service';
import { InsumoBuscadorService } from './modules/produccion/insumo-buscador.service';
import { RecetaBuscadorService } from './modules/produccion/receta-buscador.service';
import { UnidadMedidaBuscadorService } from './modules/unidades-medida/unidad-medida-buscador.service';
import { VentaBuscadorService } from './modules/ventas-plazos/venta-buscador.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideAnimationsAsync(),
    ConfirmationService,
    MessageService,
    // AuditLogViewerComponent (ui-shared) pide AuditLogSource por DI sin
    // saber que hay detras -- aqui se lo conectamos a la implementacion
    // real contra el backend.
    { provide: AuditLogSource, useExisting: AuditoriaService },
    // Igual que AuditLogSource: EntidadSelectorComponent (ui-shared) pide
    // un BuscadorEntidad/BuscadorDeHijos por @Input sin saber que hay
    // detras -- aqui se conecta cada token con la implementacion real de
    // Inventario. Un modulo futuro "buscable" (ej. Cliente para CRM/TPV)
    // se conecta agregando su propio token + provider aqui, sin que
    // Precios/TPV necesiten importar el servicio concreto.
    { provide: BUSCADOR_PRODUCTO, useExisting: ProductoBuscadorService },
    { provide: BUSCADOR_VARIANTE_DE_PRODUCTO, useExisting: VariantesDeProductoBuscadorService },
    { provide: BUSCADOR_CATEGORIA, useExisting: CategoriaBuscadorService },
    { provide: BUSCADOR_CLIENTE, useExisting: ClienteBuscadorService },
    { provide: BUSCADOR_USUARIO, useExisting: UsuarioBuscadorService },
    { provide: BUSCADOR_UNIDAD_MEDIDA, useExisting: UnidadMedidaBuscadorService },
    { provide: BUSCADOR_INSUMO, useExisting: InsumoBuscadorService },
    { provide: BUSCADOR_RECETA, useExisting: RecetaBuscadorService },
    { provide: BUSCADOR_VENTA, useExisting: VentaBuscadorService },
    provideHttpClient(
      withFetch(),
      // El header X-XSRF-TOKEN se pone a mano en xsrfInterceptor -- el
      // withXsrfConfiguration nativo de Angular NO sirve aqui porque salta
      // a proposito las URLs absolutas (ver el comentario en
      // xsrf.interceptor.ts), y todas nuestras llamadas usan urlApi
      // absoluta porque el backend vive en otro origen/puerto.
      withInterceptors([credentialsInterceptor, xsrfInterceptor, authInterceptor]),
    ),
    // Resuelve quien es el usuario actual (si hay cookie de sesion valida)
    // ANTES de que el router evalue authGuard en la primera navegacion --
    // sin esto, un refresh de pagina con sesion activa mandaria al usuario
    // a /login por una fraccion de segundo antes de confirmar que si tiene
    // sesion.
    provideAppInitializer(() => inject(AuthStateService).initialize()),
    // Paleta, tipografia y radios vienen de libs/design-tokens (nucleoPreset),
    // nunca del tema Aura default de PrimeNG -- ver libs/design-tokens/README.md.
    providePrimeNG({
      theme: {
        preset: nucleoPreset,
        options: {
          darkModeSelector: false,
        },
      },
    }),
  ],
};
