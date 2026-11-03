import { Injectable, InjectionToken, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { REGISTRO_NAVEGACION } from './registro-navegacion';

/** Lo que acompaña al nombre de la pantalla en la pestaña: `Núcleo · Clientes`. */
export const MARCA_TITULO = new InjectionToken<string>('MARCA_TITULO', { factory: () => 'Núcleo' });

/**
 * Titulo del navegador (UI-08): una pantalla del registro de navegacion
 * toma su nombre de ahi; las demas (detalle, alta) usan el `title` de su
 * ruta. Asi el menu, el encabezado y la pestaña dicen lo mismo.
 */
@Injectable()
export class TituloDesdeRegistro extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly registro = inject(REGISTRO_NAVEGACION);
  private readonly marca = inject(MARCA_TITULO);

  override updateTitle(estado: RouterStateSnapshot): void {
    const ruta = rutaCompleta(estado.root);
    const entrada = this.registro.find((item) => item.ruta === ruta);
    const propio = this.buildTitle(estado);

    if (entrada) {
      this.title.setTitle(`${this.marca} · ${entrada.nombre}`);
    } else if (propio) {
      this.title.setTitle(propio);
    } else {
      this.title.setTitle(this.marca);
    }
  }
}

/** La ruta configurada de la hoja activa, sin barra inicial: `inventario/productos`. */
export function rutaCompleta(raiz: ActivatedRouteSnapshot): string {
  const partes: string[] = [];
  let actual: ActivatedRouteSnapshot | null = raiz;

  while (actual) {
    const path = actual.routeConfig?.path;

    if (path) {
      partes.push(path);
    }

    actual = actual.firstChild;
  }

  return partes.join('/');
}
