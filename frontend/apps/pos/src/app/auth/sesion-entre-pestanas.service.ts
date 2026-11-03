import { Injectable, Injector, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStateService } from './auth-state.service';

const CANAL = 'nianva-sesion';
const CLAVE_STORAGE = 'nianva-sesion';
const RUTAS_PUBLICAS = ['/login', '/forgot-password', '/reset-password', '/two-factor/verify'];

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
      this.canal.onmessage = () => this.cerrarLocalmente();
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

  cerrarSesion(): void {
    this.notificar();
    this.cerrarLocalmente();
  }

  private notificar(): void {
    const marca = String(Date.now());

    if (this.canal !== null) {
      this.canal.postMessage(marca);
      return;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLAVE_STORAGE, marca);
    }
  }

  private cerrarLocalmente(): void {
    this.injector.get(AuthStateService).clear();

    if (this.cerrando || this.esRutaPublica()) {
      return;
    }

    this.cerrando = true;
    void this.router.navigate(['/login']).finally(() => {
      this.cerrando = false;
    });
  }

  private alRecibirStorage = (evento: StorageEvent): void => {
    if (evento.key === CLAVE_STORAGE) {
      this.cerrarLocalmente();
    }
  };

  private esRutaPublica(): boolean {
    const ruta = this.router.url.split('?')[0];

    return RUTAS_PUBLICAS.includes(ruta);
  }
}
