import { Injectable, computed, signal } from '@angular/core';

import { Sesion } from './sesion.types';

/**
 * La sesion de GET /sesion (API-09) en senales, sin dependencias: el menu y el formato
 * regional la leen sin arrastrar HttpClient. AuthStateService es quien la carga.
 *
 * Sin sesion cargada todo es visible: el menu solo oculta, la autoridad sigue siendo el
 * backend (`permiso:` y `modulo:` en cada ruta).
 */
@Injectable({ providedIn: 'root' })
export class SesionActualService {
  private readonly sesionSignal = signal<Sesion | null>(null);
  private readonly permisos = computed(() => new Set(this.sesionSignal()?.permisos ?? []));
  private readonly modulos = computed(() => new Set(this.sesionSignal()?.modulos_activos ?? []));

  readonly sesion = this.sesionSignal.asReadonly();

  establecer(sesion: Sesion): void {
    this.sesionSignal.set(sesion);
  }

  limpiar(): void {
    this.sesionSignal.set(null);
  }

  /** Si una entrada del menu se muestra: tiene su permiso (si pide uno) y su modulo esta activo (si es de uno). */
  visible(permiso?: string, modulo?: string): boolean {
    if (this.sesionSignal() === null) {
      return true;
    }

    return (permiso === undefined || this.permisos().has(permiso))
      && (modulo === undefined || this.modulos().has(modulo));
  }
}
