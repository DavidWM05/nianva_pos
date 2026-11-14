import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { REGISTRO_NAVEGACION, TituloDesdeRegistro } from '@nianva/ui-layout';
import { AuditLogSource } from '@nianva/ui-shared';
import { appRoutes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { csrfRetryInterceptor } from './auth/csrf-retry.interceptor';
import { AuthStateService } from './auth/auth-state.service';
import { credentialsInterceptor } from './auth/credentials.interceptor';
import { xsrfInterceptor } from './auth/xsrf.interceptor';
import { AuditoriaService } from './core/auditoria.service';
import { erroresInterceptor } from './core/errores.interceptor';
import { TemaService } from './core/tema.service';
import { SesionEntrePestanasService } from './auth/sesion-entre-pestanas.service';
import { CargaSesionService } from './auth/carga-sesion.service';
import { provideFormatoRegionalDeSesion } from './auth/formato-regional-de-sesion';
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
import { REGISTRO_NAVEGACION_POS } from './modules/modules.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Moneda, zona horaria y locale del tenant, de GET /sesion (API-09).
    provideFormatoRegionalDeSesion(),
    // ui-page-header y el menu toman los nombres de aqui (UI-08).
    { provide: REGISTRO_NAVEGACION, useValue: REGISTRO_NAVEGACION_POS },
    provideRouter(appRoutes),
    // El titulo de la pestaña de una pantalla del menu sale del registro, no de su ruta.
    { provide: TitleStrategy, useClass: TituloDesdeRegistro },
    provideAnimationsAsync(),
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
      withInterceptors([credentialsInterceptor, xsrfInterceptor, csrfRetryInterceptor, authInterceptor, erroresInterceptor]),
    ),
    // Resuelve quien es el usuario actual (si hay cookie de sesion valida)
    // ANTES de que el router evalue authGuard en la primera navegacion --
    // sin esto, un refresh de pagina con sesion activa mandaria al usuario
    // a /login por una fraccion de segundo antes de confirmar que si tiene
    // sesion.
    provideAppInitializer(() => inject(AuthStateService).initialize()),
    provideAppInitializer(() => inject(TemaService).inicializar()),
    provideAppInitializer(() => inject(SesionEntrePestanasService).inicializar()),
    // Tras el login o el 2FA (que solo traen el usuario) carga GET /sesion.
    provideAppInitializer(() => inject(CargaSesionService).iniciar()),
  ],
};
