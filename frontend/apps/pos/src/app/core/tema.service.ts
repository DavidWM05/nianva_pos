import { Injectable } from '@angular/core';

export type TemaPreferido = 'claro' | 'oscuro' | 'sistema';

const CLAVE = 'nv-tema';
const CLASE_OSCURO = 'nv-tema-oscuro';

// Claro por defecto, no 'sistema': hasta que las pantallas migren a los tokens
// semanticos (plan de la Fase 2, punto 12) el tema oscuro se veria a medias, y aun
// no hay interruptor para salir de el. Al migrarlas, pasa a 'sistema'.
const TEMA_POR_DEFECTO: TemaPreferido = 'claro';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = document;

  inicializar(): void {
    this.aplicar(this.preferencia());
  }

  establecer(preferencia: TemaPreferido): void {
    try {
      localStorage.setItem(CLAVE, preferencia);
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): se aplica solo en esta sesion.
    }

    this.aplicar(preferencia);
  }

  preferencia(): TemaPreferido {
    return this.leer() ?? TEMA_POR_DEFECTO;
  }

  private leer(): TemaPreferido | null {
    let valor: string | null;

    try {
      valor = localStorage.getItem(CLAVE);
    } catch {
      return null;
    }

    return valor === 'claro' || valor === 'oscuro' || valor === 'sistema' ? valor : null;
  }

  private aplicar(preferencia: TemaPreferido): void {
    const oscuro = preferencia === 'oscuro' || (preferencia === 'sistema' && this.prefiereOscuro());
    this.documento.documentElement.classList.toggle(CLASE_OSCURO, oscuro);
  }

  private prefiereOscuro(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
