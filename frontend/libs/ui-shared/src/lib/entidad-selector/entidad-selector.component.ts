import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, filter, map } from 'rxjs';

import { BuscadorDeHijos, BuscadorEntidad, EntidadBuscable, IdEntidad } from './entidad-selector.types';

/** Lo que dispara una busqueda: el texto escrito (con al menos un caracter). */
export interface BusquedaEntidadEvento {
  query: string;
  originalEvent?: Event;
}

/** Pausa tras la ultima tecla antes de buscar, para no pedir una busqueda por letra. */
const PAUSA_BUSQUEDA_MS = 300;

// Una pantalla puede tener varios selectores (la venta tiene cliente, lista de precio y producto):
// el contador hace unico el id que enlaza cada label con su control (UI-17).
let siguienteSelector = 0;

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
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './entidad-selector.component.html',
  styleUrl: './entidad-selector.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntidadSelectorComponent<I extends IdEntidad = IdEntidad> implements OnChanges {
  // DAT-08: I es el tipo del id de la entidad (number en catálogos, el ulid string en documentos);
  // Angular lo infiere del buscador que recibe.
  @Input({ required: true }) buscador!: BuscadorEntidad<EntidadBuscable<I>>;
  /** Presente => se muestra el select en cascada de "hijos" de la entidad elegida. */
  @Input() buscadorHijos?: BuscadorDeHijos<EntidadBuscable, I>;

  @Input() label = 'Buscar';
  @Input() labelHijos = 'Elemento';
  @Input() placeholder = 'Buscar por nombre...';

  @Input() valorInicial: I | null = null;
  @Input() valorInicialHijo: number | null = null;
  /** Modo visualizar (ver el reporte del punto 1 de Nucleo): deshabilita ambos selectores. */
  @Input() disabled = false;

  @Output() seleccionado = new EventEmitter<I | null>();
  @Output() hijoSeleccionado = new EventEmitter<number | null>();

  // Lee el <input> real dentro del mat-form-field via el host, en vez de
  // depender de un metodo publico de foco del componente de la libreria (no
  // garantizado entre versiones) -- asi el atajo de teclado F2 del POS
  // (ver VentaComponent/LineasProductoComponent) puede saltar aqui sin
  // acoplarse a la API interna de la libreria.
  @ViewChild('autoCompleteHost', { read: ElementRef }) private autoCompleteHost?: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);

  /** Lo que hay en el input: el texto que se escribe, o la entidad elegida. */
  protected readonly busqueda = new FormControl<string | EntidadBuscable<I> | null>(null);
  protected readonly sugerencias = signal<EntidadBuscable<I>[]>([]);
  protected readonly entidadElegida = signal<EntidadBuscable<I> | null>(null);
  protected readonly hijos = signal<EntidadBuscable[]>([]);
  protected hijoElegidoId: number | null = null;

  private readonly numero = ++siguienteSelector;
  protected readonly idPrincipal = `entidad-selector-principal-${this.numero}`;
  protected readonly idHijo = `entidad-selector-hijo-${this.numero}`;

  protected readonly nombreDe = (valor: string | EntidadBuscable<I> | null): string =>
    typeof valor === 'string' ? valor : (valor?.nombre ?? '');

  constructor() {
    this.busqueda.valueChanges
      .pipe(
        filter((valor): valor is string => typeof valor === 'string'),
        debounceTime(PAUSA_BUSQUEDA_MS),
        map((texto) => texto.trim()),
        filter((texto) => texto.length >= 1),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((query) => this.buscar({ query }));
  }

  ngOnChanges(): void {
    if (this.disabled && this.busqueda.enabled) {
      this.busqueda.disable({ emitEvent: false });
    } else if (!this.disabled && this.busqueda.disabled) {
      this.busqueda.enable({ emitEvent: false });
    }

    if (this.valorInicial && !this.entidadElegida()) {
      this.buscador.obtener(this.valorInicial).subscribe((entidad) => {
        this.entidadElegida.set(entidad);
        this.busqueda.setValue(entidad, { emitEvent: false });
        this.cargarHijos(entidad.id, this.valorInicialHijo);
      });
    }
  }

  buscar(evento: BusquedaEntidadEvento): void {
    this.buscador.buscar(evento.query).subscribe((resultados) => this.sugerencias.set(resultados));
  }

  onSeleccionar(entidad: EntidadBuscable<I>): void {
    this.entidadElegida.set(entidad);
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

  /** Foco programatico en el input de busqueda principal -- usado por atajos de teclado (ver F2 en VentaComponent). */
  focus(): void {
    this.autoCompleteHost?.nativeElement.querySelector<HTMLInputElement>('input')?.focus();
  }

  /**
   * Vacia el selector (texto, entidad elegida, sugerencias e hijos) sin emitir seleccion: quien lo
   * llama ya sabe que lo limpia. Lo usa el carrito del TPV al agregar una linea o al cancelarla
   * con Esc, para que la pantalla no siga mostrando una seleccion que ya descarto.
   */
  limpiar(): void {
    this.busqueda.setValue(null, { emitEvent: false });
    this.entidadElegida.set(null);
    this.sugerencias.set([]);
    this.hijos.set([]);
    this.hijoElegidoId = null;
    this.cdr.markForCheck();
  }

  private cargarHijos(padreId: I, hijoInicialId: number | null): void {
    if (!this.buscadorHijos) return;

    this.buscadorHijos.hijosDe(padreId).subscribe((hijos) => {
      this.hijos.set(hijos);
      this.hijoElegidoId = hijoInicialId;
      this.cdr.markForCheck();
    });
  }
}
