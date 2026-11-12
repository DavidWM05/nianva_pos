import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, forwardRef, input, model, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { CantidadPipe } from '@nianva/ui-format';

import { CampoBase } from '../campo/campo-base';

export type IdOpcionChecklist = string | number;

export interface OpcionChecklist {
  id: IdOpcionChecklist;
  etiqueta: string;
  descripcion?: string | null;
}

export interface GrupoChecklist {
  id: string;
  etiqueta: string;
  opciones: readonly OpcionChecklist[];
}

/** Un grupo tal como se pinta: sus opciones visibles con el filtro actual. */
interface GrupoVisible {
  id: string;
  etiqueta: string;
  total: number;
  marcadas: number;
  visibles: readonly OpcionChecklist[];
  todasVisiblesMarcadas: boolean;
  algunasVisiblesMarcadas: boolean;
}

function normalizado(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

// Hace unicos los ids del filtro cuando hay mas de un checklist en la pagina.
let siguienteChecklist = 0;

/**
 * Lista de casillas agrupada: un fieldset por grupo, con "Seleccionar todos"
 * y su contador, un contador total y un filtro por texto. Valor: los ids
 * marcados (`readonly id[]`), con el `disabled` del FormControl.
 *
 * El filtro solo OCULTA: lo marcado que queda oculto se sigue guardando.
 * Con filtro, la casilla del grupo dice "Seleccionar visibles" y actua
 * (y se marca) solo segun las opciones visibles del grupo; los
 * contadores cuentan el grupo completo. Deshabilitado, no hay filtro ni
 * "Seleccionar todos".
 */
@Component({
  selector: 'ui-checklist-agrupado',
  standalone: true,
  imports: [CantidadPipe, MatCheckbox],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ChecklistAgrupadoComponent), multi: true }],
  templateUrl: './checklist-agrupado.component.html',
  styleUrl: './checklist-agrupado.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistAgrupadoComponent extends CampoBase {
  readonly grupos = input<readonly GrupoChecklist[]>([]);
  /** Titulo del conjunto (legend del fieldset exterior); sin el, no se pinta. */
  readonly etiqueta = input<string | null>(null);
  readonly etiquetaFiltro = input('Filtrar');
  readonly placeholderFiltro = input('Buscar...');
  /** Texto del filtro; con `[(filtro)]` la pantalla puede fijarlo o leerlo. */
  readonly filtro = model('');

  protected readonly idFiltro = `ui-checklist-filtro-${++siguienteChecklist}`;
  protected readonly seleccion = signal<readonly IdOpcionChecklist[]>([]);

  private readonly marcadas = computed(() => new Set(this.seleccion()));

  protected readonly filtrando = computed(() => this.filtro().trim() !== '');
  /** Con filtro, la casilla del grupo solo toca (y solo refleja) lo visible, y lo dice. */
  protected readonly etiquetaSeleccionGrupo = computed(() =>
    this.filtrando() ? 'Seleccionar visibles' : 'Seleccionar todos',
  );

  protected readonly totalOpciones = computed(() =>
    this.grupos().reduce((suma, grupo) => suma + grupo.opciones.length, 0),
  );
  protected readonly totalMarcadas = computed(() => {
    const marcadas = this.marcadas();

    return this.grupos().reduce(
      (suma, grupo) => suma + grupo.opciones.filter((opcion) => marcadas.has(opcion.id)).length,
      0,
    );
  });

  protected readonly gruposVisibles = computed<GrupoVisible[]>(() => {
    const texto = normalizado(this.filtro().trim());
    const marcadas = this.marcadas();

    return this.grupos()
      .map((grupo) => {
        const coincideGrupo = texto === '' || normalizado(grupo.etiqueta).includes(texto);
        const visibles = coincideGrupo
          ? grupo.opciones
          : grupo.opciones.filter(
              (opcion) =>
                normalizado(opcion.etiqueta).includes(texto) || normalizado(opcion.descripcion ?? '').includes(texto),
            );
        const marcadasVisibles = visibles.filter((opcion) => marcadas.has(opcion.id)).length;

        return {
          id: grupo.id,
          etiqueta: grupo.etiqueta,
          total: grupo.opciones.length,
          marcadas: grupo.opciones.filter((opcion) => marcadas.has(opcion.id)).length,
          visibles,
          todasVisiblesMarcadas: visibles.length > 0 && marcadasVisibles === visibles.length,
          algunasVisiblesMarcadas: marcadasVisibles > 0 && marcadasVisibles < visibles.length,
        };
      })
      .filter((grupo) => grupo.visibles.length > 0);
  });

  writeValue(valor: unknown): void {
    this.seleccion.set(Array.isArray(valor) ? [...(valor as IdOpcionChecklist[])] : []);
  }

  protected estaMarcada(id: IdOpcionChecklist): boolean {
    return this.marcadas().has(id);
  }

  protected alFiltrar(texto: string): void {
    this.filtro.set(texto);
  }

  protected alMarcar(id: IdOpcionChecklist, marcada: boolean): void {
    this.cambiar([id], marcada);
  }

  protected alMarcarTodas(grupo: GrupoVisible, marcada: boolean): void {
    this.cambiar(
      grupo.visibles.map((opcion) => opcion.id),
      marcada,
    );
  }

  private cambiar(ids: readonly IdOpcionChecklist[], marcada: boolean): void {
    const siguiente = new Set(this.seleccion());
    for (const id of ids) {
      if (marcada) {
        siguiente.add(id);
      } else {
        siguiente.delete(id);
      }
    }
    const valor = [...siguiente];
    this.seleccion.set(valor);
    this.notificar(valor);
    this.tocar();
  }
}
