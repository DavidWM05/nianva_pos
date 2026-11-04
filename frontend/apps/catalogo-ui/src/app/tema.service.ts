import { Injectable, signal } from '@angular/core';

type PreferenciaTema = 'claro' | 'oscuro';

const CLAVE = 'nv-tema';
const CLASE_OSCURO = 'nv-tema-oscuro';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = document;
  readonly oscuro = signal(false);

  inicializar(): void {
    const consulta = new URLSearchParams(window.location.search).get('tema');
    const preferencia = consulta === 'oscuro' || consulta === 'claro' ? consulta : this.leer();

    this.aplicar(preferencia ?? 'claro');
  }

  alternar(): void {
    this.establecer(this.oscuro() ? 'claro' : 'oscuro');
  }

  establecer(preferencia: PreferenciaTema): void {
    try {
      localStorage.setItem(CLAVE, preferencia);
    } catch {
      // El tema queda solo en esta sesion.
    }

    this.aplicar(preferencia);
  }

  private leer(): PreferenciaTema | null {
    try {
      const valor = localStorage.getItem(CLAVE);

      return valor === 'claro' || valor === 'oscuro' ? valor : null;
    } catch {
      return null;
    }
  }

  private aplicar(preferencia: PreferenciaTema): void {
    const oscuro = preferencia === 'oscuro';

    this.documento.documentElement.classList.toggle(CLASE_OSCURO, oscuro);
    this.oscuro.set(oscuro);
  }
}
