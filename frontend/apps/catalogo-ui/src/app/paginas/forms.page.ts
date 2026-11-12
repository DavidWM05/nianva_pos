import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  BtnEnviarComponent,
  CampoComponent,
  ChecklistAgrupadoComponent,
  GrupoChecklist,
  InputCantidadComponent,
  InputDineroComponent,
  InputPasswordComponent,
  InputPinComponent,
  SelectFiltroComponent,
  aplicarErroresServidor,
} from '@nianva/ui-forms';
import { FormActionsComponent, PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';

@Component({
  selector: 'cat-forms-page',
  standalone: true,
  imports: [
    BtnEnviarComponent,
    CampoComponent,
    ChecklistAgrupadoComponent,
    FormActionsComponent,
    InputCantidadComponent,
    InputDineroComponent,
    InputPasswordComponent,
    InputPinComponent,
    MatButton,
    PageHeaderComponent,
    ReactiveFormsModule,
    SectionComponent,
    SelectFiltroComponent,
  ],
  template: `
    <ui-page-header clave="catalogo-forms" subtitulo="Campos, contraseña, PIN y botón de envío" />

    <ui-section titulo="Formulario completo">
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <ui-campo etiqueta="Precio" [requerido]="true" ayuda="Precio de venta antes de impuestos.">
          <ui-input-dinero formControlName="precio" [min]="0" [max]="99999" />
        </ui-campo>
        <ui-campo etiqueta="Cantidad" [requerido]="true">
          <ui-input-cantidad formControlName="cantidad" [decimales]="2" unidad="kg" />
        </ui-campo>
        <ui-campo etiqueta="Contraseña" [requerido]="true">
          <ui-input-password formControlName="password" />
        </ui-campo>
        <ui-campo etiqueta="PIN" [requerido]="true">
          <ui-input-pin formControlName="pin" [longitud]="4" (completo)="pinCompleto.set($event)" />
        </ui-campo>
        <ui-campo etiqueta="Sucursal">
          <ui-select-filtro formControlName="sucursal" [opciones]="opciones" />
        </ui-campo>

        <ui-form-actions>
          <button matButton="outlined" type="button">Cancelar</button>
          <ui-btn-enviar etiqueta="Guardar" [enviando]="enviando()" />
        </ui-form-actions>
      </form>
      @if (pinCompleto()) {
        <p>PIN completo capturado.</p>
      }
      <p><button matButton="outlined" type="button" (click)="simularError()">Mostrar error de servidor</button></p>
    </ui-section>

    <ui-section titulo="Campo deshabilitado">
      <form [formGroup]="formDeshabilitado">
        <ui-campo etiqueta="Precio bloqueado">
          <ui-input-dinero formControlName="precio" />
        </ui-campo>
      </form>
    </ui-section>

    <ui-section titulo="Botón de envío">
      <p><ui-btn-enviar [enviando]="enviando()" (click)="enviando.set(!enviando())" /></p>
      <p><button matButton="outlined" type="button" (click)="enviando.set(!enviando())">Alternar estado de envío</button></p>
    </ui-section>

    <ui-section titulo="Checklist agrupado">
      <ui-checklist-agrupado
        etiqueta="Permisos"
        etiquetaFiltro="Filtrar permisos"
        placeholderFiltro="Módulo o permiso..."
        [grupos]="gruposChecklist"
        [formControl]="checklist"
      />
    </ui-section>

    <ui-section titulo="Checklist agrupado filtrado">
      <ui-checklist-agrupado
        etiqueta="Permisos"
        etiquetaFiltro="Filtrar permisos del rol"
        filtro="ver"
        [grupos]="gruposChecklist"
        [formControl]="checklistFiltrado"
      />
    </ui-section>

    <ui-section titulo="Checklist agrupado deshabilitado">
      <ui-checklist-agrupado etiqueta="Permisos" [grupos]="gruposChecklist" [formControl]="checklistDeshabilitado" />
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormsPage {
  protected readonly form = new FormGroup({
    precio: new FormControl<number | null>(1250.5),
    cantidad: new FormControl<number | null>(2),
    password: new FormControl(''),
    pin: new FormControl(''),
    sucursal: new FormControl<number | null>(null),
  });
  protected readonly formDeshabilitado = new FormGroup({
    precio: new FormControl({ value: 100, disabled: true }),
  });
  protected readonly opciones = [
    { label: 'Centro', value: 1 },
    { label: 'Norte', value: 2 },
  ];
  protected readonly gruposChecklist: GrupoChecklist[] = [
    {
      id: 'ventas',
      etiqueta: 'Ventas',
      opciones: [
        { id: 1, etiqueta: 'Ver' },
        { id: 2, etiqueta: 'Crear' },
        { id: 3, etiqueta: 'Anular', descripcion: 'Cancela una venta ya cobrada' },
      ],
    },
    {
      id: 'caja',
      etiqueta: 'Caja',
      opciones: [
        { id: 10, etiqueta: 'Ver' },
        { id: 11, etiqueta: 'Abrir' },
        { id: 12, etiqueta: 'Cerrar' },
      ],
    },
    {
      id: 'cuentas-cobrar',
      etiqueta: 'Cuentas por cobrar',
      opciones: [
        { id: 20, etiqueta: 'Ver' },
        { id: 21, etiqueta: 'Registrar abono' },
      ],
    },
  ];
  protected readonly checklist = new FormControl<readonly (string | number)[]>([1, 10, 11]);
  protected readonly checklistFiltrado = new FormControl<readonly (string | number)[]>([1, 2, 21]);
  protected readonly checklistDeshabilitado = new FormControl<readonly (string | number)[]>({ value: [1, 2, 10], disabled: true });
  protected readonly enviando = signal(false);
  protected readonly pinCompleto = signal('');

  protected guardar(): void {
    this.form.markAllAsTouched();

    if (this.form.valid) {
      this.enviando.set(true);
    }
  }

  protected simularError(): void {
    aplicarErroresServidor(this.form, { error: { errors: { precio: ['El precio debe ser mayor a cero.'] } } });
  }
}
