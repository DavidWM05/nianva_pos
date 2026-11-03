import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  OnDestroy,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampoComponent implements AfterContentInit, OnDestroy, UiCampoContexto {
  readonly etiqueta = input.required<string>();
  readonly requerido = input(false);
  readonly ayuda = input<string | null>(null);

  readonly invalido = signal(false);
  readonly errorId = signal<string | null>(null);
  readonly controlId = signal<string | null>(null);
  readonly mensaje = signal<string | null>(null);

  @ContentChild(NgControl, { descendants: true }) private controlNg?: NgControl;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly suscripciones: Array<{ unsubscribe(): void }> = [];

  ngAfterContentInit(): void {
    const control = this.controlNg?.control;

    if (! control) {
      return;
    }

    const nombre = this.controlNg?.name;
    const sufijo = `${nombre === undefined || nombre === null ? 'campo' : String(nombre)}-${++siguienteCampo}`;

    this.controlId.set(`ui-campo-control-${sufijo}`);
    this.errorId.set(`ui-campo-error-${sufijo}`);
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

  ngOnDestroy(): void {
    for (const suscripcion of this.suscripciones) {
      suscripcion.unsubscribe();
    }
  }

  private actualizar(control: AbstractControl): void {
    this.invalido.set(control.invalid);
    this.mensaje.set(this.mensajeDe(control));
    this.cdr.markForCheck();
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
