import {
  AfterContentInit,
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';

import { CampoBase } from './campo-base';
import { UI_CAMPO_CONTEXTO, UiCampoContexto } from './campo-contexto';
import { quitarErrorServidor } from './campo.utils';

// El nombre del control se repite entre formularios (una pantalla y su modal): el contador
// hace unico el id que enlaza label for, aria-describedby y el mensaje de error.
let siguienteCampo = 0;

@Component({
  selector: 'ui-campo',
  standalone: true,
  providers: [{ provide: UI_CAMPO_CONTEXTO, useExisting: forwardRef(() => CampoComponent) }],
  templateUrl: './campo.component.html',
  styleUrl: './campo.component.scss',
  // Para dar estilo a los inputs nativos proyectados (UI-11): los selectores llevan el prefijo ui-campo.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampoComponent implements AfterContentInit, AfterViewChecked, OnDestroy, UiCampoContexto {
  readonly etiqueta = input.required<string>();
  readonly requerido = input(false);
  readonly ayuda = input<string | null>(null);

  readonly invalido = signal(false);
  readonly errorId = signal<string | null>(null);
  readonly controlId = signal<string | null>(null);
  readonly etiquetaId = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);
  private readonly sufijo = signal<string | null>(null);
  readonly ayudaId = computed(() => {
    const sufijo = this.sufijo();

    return this.ayuda() && sufijo !== null ? `ui-campo-ayuda-${sufijo}` : null;
  });

  @ContentChild(NgControl, { descendants: true }) private controlNg?: NgControl;
  // El elemento que lleva el control: un input nativo o un matInput proyectado, que no leen el contexto.
  @ContentChild(NgControl, { descendants: true, read: ElementRef }) private elementoControl?: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly suscripciones: Array<{ unsubscribe(): void }> = [];
  private idsEnlazados: string[] = [];

  ngAfterContentInit(): void {
    const control = this.controlNg?.control;

    if (! control) {
      return;
    }

    const nombre = this.controlNg?.name;
    const sufijo = `${nombre === undefined || nombre === null ? 'campo' : String(nombre)}-${++siguienteCampo}`;

    this.controlId.set(`ui-campo-control-${sufijo}`);
    this.errorId.set(`ui-campo-error-${sufijo}`);
    this.etiquetaId.set(`ui-campo-etiqueta-${sufijo}`);
    this.sufijo.set(sufijo);
    this.suscripciones.push(control.events.subscribe(() => this.actualizar(control)));
    this.suscripciones.push(
      control.valueChanges.subscribe(() => {
        if (control.dirty && control.hasError('servidor')) {
          quitarErrorServidor(control);
        }
        this.actualizar(control);
      }),
    );
    this.actualizar(control);
  }

  ngAfterViewChecked(): void {
    // Tras los bindings de la vista que proyecta: si el control enlaza su propio aria-describedby
    // y lo cambia, aqui se vuelven a sumar la ayuda y el error.
    this.enlazarDescripcion();
  }

  ngOnDestroy(): void {
    for (const suscripcion of this.suscripciones) {
      suscripcion.unsubscribe();
    }
  }

  private actualizar(control: AbstractControl): void {
    this.invalido.set(control.invalid);
    this.mensaje.set(this.mensajeDe(control));
    this.enlazarDescripcion();
    this.cdr.markForCheck();
  }

  /**
   * UI-04: un control proyectado con id (un matInput suelto, un input nativo) no lee el contexto,
   * asi que ui-campo le suma a su aria-describedby la ayuda y, si se muestra, el error. Conserva
   * los ids que ya tenia (los de mat-form-field o los del propio binding) sin repetirlos. Los
   * controles de libs/ui (CampoBase) se describen solos con descritoPor().
   */
  private enlazarDescripcion(): void {
    const elemento = this.elementoControl?.nativeElement;

    if (! elemento?.id || this.controlNg?.valueAccessor instanceof CampoBase) {
      return;
    }

    const propios = [this.ayudaId(), this.mensaje() ? this.errorId() : null].filter((id): id is string => id !== null);
    const ajenos = (elemento.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter((id) => id !== '' && ! this.idsEnlazados.includes(id));
    const ids = [...ajenos, ...propios];

    if (ids.length > 0) {
      elemento.setAttribute('aria-describedby', ids.join(' '));
    } else {
      elemento.removeAttribute('aria-describedby');
    }

    this.idsEnlazados = propios;
  }

  private mensajeDe(control: AbstractControl): string | null {
    const servidor = control.getError('servidor');

    if (typeof servidor === 'string') {
      return servidor;
    }

    if (! control.touched || control.valid) {
      return null;
    }

    if (control.hasError('required')) {
      return `${this.etiqueta() || 'Este campo'} es obligatorio.`;
    }

    if (control.hasError('min')) {
      return `Debe ser mayor o igual a ${control.getError('min')['min']}.`;
    }

    if (control.hasError('max')) {
      return `Debe ser menor o igual a ${control.getError('max')['max']}.`;
    }

    if (control.hasError('minlength')) {
      return `Debe tener al menos ${control.getError('minlength')['requiredLength']} caracteres.`;
    }

    if (control.hasError('maxlength')) {
      return `No puede tener más de ${control.getError('maxlength')['requiredLength']} caracteres.`;
    }

    return 'Valor inválido.';
  }
}
