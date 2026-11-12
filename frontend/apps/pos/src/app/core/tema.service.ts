import { Injectable, signal } from '@angular/core';

export type TemaPreferido = 'claro' | 'oscuro' | 'sistema';

const CLAVE = 'nv-tema';
const CLASE_OSCURO = 'nv-tema-oscuro';
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

// Claro por defecto, no 'sistema': hasta que las pantallas migren a los tokens
// semanticos (plan de la Fase 2, punto 12) el tema oscuro se veria a medias, y aun
// no hay interruptor para salir de el. Al migrarlas, pasa a 'sistema'.
// 50i: el interruptor ya existe (menu de usuario del shell); el valor por defecto sigue en
// 'claro' mientras queden pantallas con PrimeNG y cambia en el 50n.
const TEMA_POR_DEFECTO: TemaPreferido = 'claro';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = document;
  /** La preferencia elegida, para que el interruptor del menu de usuario marque la opcion. */
  readonly preferenciaActual = signal<TemaPreferido>(TEMA_POR_DEFECTO);
  private escuchandoSistema = false;

  inicializar(): void {
    this.preferenciaActual.set(this.preferencia());
    this.aplicar(this.preferenciaActual());
    this.escucharSistema();
  }

  establecer(preferencia: TemaPreferido): void {
    try {
      localStorage.setItem(CLAVE, preferencia);
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): se aplica solo en esta sesion.
    }

    this.preferenciaActual.set(preferencia);
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

  /**
   * Con la preferencia 'sistema', el tema sigue al sistema operativo sin recargar. Se escucha una
   * sola vez y se decide al recibir el cambio: asi tambien vale si el usuario pasa a 'sistema'
   * despues de arrancar.
   */
  private escucharSistema(): void {
    if (this.escuchandoSistema || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const consulta = window.matchMedia(CONSULTA_OSCURO);
    // Un stub sin addEventListener (specs viejos, navegadores antiguos): sin seguimiento en vivo.
    if (typeof consulta?.addEventListener !== 'function') {
      return;
    }

    this.escuchandoSistema = true;
    consulta.addEventListener('change', () => {
      if (this.preferenciaActual() === 'sistema') {
        this.aplicar('sistema');
      }
    });
  }

  private prefiereOscuro(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia(CONSULTA_OSCURO).matches;
  }
}
