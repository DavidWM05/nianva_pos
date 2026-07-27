import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Select } from 'primeng/select';

import { BuscadorDeHijos, BuscadorEntidad, EntidadBuscable } from './entidad-selector.types';

/**
 * Buscador generico de una entidad (autocomplete server-side via
 * `buscador`, recibido por @Input) con, opcionalmente, un segundo
 * select en cascada para los "hijos" de la entidad elegida (via
 * `buscadorHijos`, tambien por @Input -- solo se activa si el
 * consumidor lo pasa). No sabe que tipo de entidad esta buscando
 * (producto, cliente, categoria...) ni de que modulo viene la
 * implementacion -- eso lo decide el componente que lo usa, resolviendo
 * el token de DI correcto (ver entidad-selector.types.ts).
 */
@Component({
  selector: 'nucleo-entidad-selector',
  standalone: true,
  imports: [FormsModule, AutoComplete, Select],
  templateUrl: './entidad-selector.component.html',
  styleUrl: './entidad-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntidadSelectorComponent implements OnChanges {
  @Input({ required: true }) buscador!: BuscadorEntidad;
  /** Presente => se muestra el select en cascada de "hijos" de la entidad elegida. */
  @Input() buscadorHijos?: BuscadorDeHijos;

  @Input() label = 'Buscar';
  @Input() labelHijos = 'Elemento';
  @Input() placeholder = 'Buscar por nombre...';

  @Input() valorInicial: number | null = null;
  @Input() valorInicialHijo: number | null = null;
  /** Modo visualizar (ver el reporte del punto 1 de Nucleo): deshabilita ambos selectores. */
  @Input() disabled = false;

  @Output() seleccionado = new EventEmitter<number | null>();
  @Output() hijoSeleccionado = new EventEmitter<number | null>();

  protected readonly sugerencias = signal<EntidadBuscable[]>([]);
  protected entidadElegida: EntidadBuscable | null = null;
  protected readonly hijos = signal<EntidadBuscable[]>([]);
  protected hijoElegidoId: number | null = null;

  ngOnChanges(): void {
    if (this.valorInicial && !this.entidadElegida) {
      this.buscador.obtener(this.valorInicial).subscribe((entidad) => {
        this.entidadElegida = entidad;
        this.cargarHijos(entidad.id, this.valorInicialHijo);
      });
    }
  }

  buscar(evento: AutoCompleteCompleteEvent): void {
    this.buscador.buscar(evento.query).subscribe((resultados) => this.sugerencias.set(resultados));
  }

  onSeleccionar(entidad: EntidadBuscable): void {
    this.entidadElegida = entidad;
    this.hijoElegidoId = null;
    this.hijos.set([]);
    this.seleccionado.emit(entidad.id);
    this.hijoSeleccionado.emit(null);
    this.cargarHijos(entidad.id, null);
  }

  onSeleccionarHijo(hijoId: number): void {
    this.hijoElegidoId = hijoId;
    this.hijoSeleccionado.emit(hijoId);
  }

  private cargarHijos(padreId: number, hijoInicialId: number | null): void {
    if (!this.buscadorHijos) return;

    this.buscadorHijos.hijosDe(padreId).subscribe((hijos) => {
      this.hijos.set(hijos);
      this.hijoElegidoId = hijoInicialId;
    });
  }
}
