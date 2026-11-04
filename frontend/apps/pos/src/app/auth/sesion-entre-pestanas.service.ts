import { Injectable, Injector, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStateService } from './auth-state.service';

const CANAL = 'nianva-sesion';
const CLAVE_STORAGE = 'nianva-sesion';
const AVISO_INACTIVIDAD = 'inactividad';
const RUTAS_PUBLICAS = ['/login', '/forgot-password', '/reset-password', '/two-factor/verify'];

type MotivoCierre = typeof AVISO_INACTIVIDAD;

@Injectable({ providedIn: 'root' })
export class SesionEntrePestanasService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private canal: BroadcastChannel | null = null;
  private iniciado = false;
  private cerrando = false;

  inicializar(): void {
    if (this.iniciado) {
      return;
    }

    this.iniciado = true;

    if (typeof BroadcastChannel !== 'undefined') {
      this.canal = new BroadcastChannel(CANAL);
      this.canal.onmessage = (evento) => this.cerrarLocalmente(this.motivoDe(evento.data));
      return;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.alRecibirStorage);
    }
  }

  ngOnDestroy(): void {
    this.canal?.close?.();
    this.canal = null;

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.alRecibirStorage);
    }
  }

  cerrarSesion(motivo?: MotivoCierre): void {
    this.notificar(motivo);
    this.cerrarLocalmente(motivo);
  }

  private notificar(motivo?: MotivoCierre): void {
    const marca = motivo === AVISO_INACTIVIDAD ? `${AVISO_INACTIVIDAD}:${Date.now()}` : String(Date.now());

    if (this.canal !== null) {
      this.canal.postMessage(marca);
      return;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLAVE_STORAGE, marca);
    }
  }

  private cerrarLocalmente(motivo?: MotivoCierre): void {
    this.injector.get(AuthStateService).clear();

    if (this.cerrando) {
      return;
    }

    if (this.esRutaPublica()) {
      if (motivo === AVISO_INACTIVIDAD && this.router.url.split('?')[0] === '/login') {
        void this.router.navigate(['/login'], {
          queryParams: { aviso: AVISO_INACTIVIDAD },
          replaceUrl: true,
        });
      }

      return;
    }

    this.cerrando = true;

    const navegacion = motivo === AVISO_INACTIVIDAD
      ? this.router.navigate(['/login'], { queryParams: { aviso: AVISO_INACTIVIDAD } })
      : this.router.navigate(['/login']);

    void navegacion.finally(() => {
      this.cerrando = false;
    });
  }

  private motivoDe(mensaje: unknown): MotivoCierre | undefined {
    return typeof mensaje === 'string' && mensaje.startsWith(`${AVISO_INACTIVIDAD}:`)
      ? AVISO_INACTIVIDAD
      : undefined;
  }

  private alRecibirStorage = (evento: StorageEvent): void => {
    if (evento.key === CLAVE_STORAGE) {
      this.cerrarLocalmente(this.motivoDe(evento.newValue));
    }
  };

  private esRutaPublica(): boolean {
    const ruta = this.router.url.split('?')[0];

    return RUTAS_PUBLICAS.includes(ruta);
  }
}
