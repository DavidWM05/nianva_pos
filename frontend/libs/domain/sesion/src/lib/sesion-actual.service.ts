import { Injectable, computed, signal } from '@angular/core';

import { Sesion } from './sesion.types';

/**
 * La sesion de GET /sesion (API-09) en senales, sin dependencias: el menu y el formato
 * regional la leen sin arrastrar HttpClient. AuthStateService es quien la carga.
 *
 * Sin sesion cargada todo es visible: el menu solo oculta, la autoridad sigue siendo el
 * backend (`permiso:`, `modulo:` y `feature:` en cada ruta).
 */
@Injectable({ providedIn: 'root' })
export class SesionActualService {
  private readonly sesionSignal = signal<Sesion | null>(null);
  private readonly permisos = computed(() => new Set(this.sesionSignal()?.permisos ?? []));
  private readonly modulos = computed(() => new Set(this.sesionSignal()?.modulos_activos ?? []));

  readonly sesion = this.sesionSignal.asReadonly();
  readonly licencia = computed(() => this.sesion()?.licencia ?? null);
  readonly modoOperativo = computed(() => this.licencia()?.modo_operativo ?? null);
  readonly soloLectura = computed(() => this.modoOperativo() === 'solo_lectura');

  limite(recurso: keyof NonNullable<Sesion['limites']>) {
    return this.sesion()?.limites?.[recurso] ?? null;
  }

  establecer(sesion: Sesion): void {
    this.sesionSignal.set(sesion);
  }

  limpiar(): void {
    this.sesionSignal.set(null);
  }

  concedida(feature: string): boolean {
    const plan = this.sesionSignal()?.plan;
    return plan === undefined || plan?.features.includes(feature) === true;
  }

  /** Una entrada visible cumple el permiso, la concesión y el estado del módulo que declara. */
  visible(permiso?: string, modulo?: string, feature?: string, admiteCentral = false): boolean {
    return this.motivoNoDisponible(permiso, modulo, feature, admiteCentral) === null;
  }

  motivoNoDisponible(permiso?: string, modulo?: string, feature?: string, admiteCentral = false): 'permiso' | 'feature' | 'modulo' | null {
    const sesion = this.sesion();
    if (sesion === null) return null;
    if (permiso !== undefined && !this.permisos().has(permiso)) return 'permiso';
    const centralAdmitida = admiteCentral && sesion.usuario.es_superadmin && sesion.usuario.tenant_id === null;
    if (feature !== undefined && !centralAdmitida && !this.concedida(feature)) return 'feature';
    if (modulo !== undefined && !this.modulos().has(modulo)) return 'modulo';

    return null;
  }
}
