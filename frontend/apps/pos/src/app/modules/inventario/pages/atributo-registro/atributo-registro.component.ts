import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { limitesDe } from '@nianva/api-contrato';
import {
  Atributo,
  AtributoPayload,
  AtributoService,
  AtributoValor,
} from '@nianva/domain-inventario';
import { ColumnaListado, TablaComponent } from '@nianva/ui-data';
import {
  ConfirmDialogService,
  SkeletonComponent,
  ToastService,
} from '@nianva/ui-feedback';
import { BtnEnviarComponent, CampoComponent } from '@nianva/ui-forms';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import {
  AuditLogViewerComponent,
  RecordTabsComponent,
  esErrorNegocio,
  leerErrorNegocio,
  mensajeError,
} from '@nianva/ui-shared';
import { MatButton } from '@angular/material/button';
import { Observable, finalize } from 'rxjs';

import { SesionActualService } from '../../../../auth/sesion-actual.service';
import { AtributoFormComponent } from '../../atributo-form/atributo-form.component';

/** Límites del cuerpo de un valor, leídos del contrato (UI-11b). */
const LIMITES_VALOR = limitesDe('/atributos/{atributo}/valores', 'post');

/**
 * Registro de un atributo de variante (ARQ-07): `/inventario/atributos/nuevo` y
 * `/inventario/atributos/:id`. Los valores son un sub-recurso sin lista propia: se editan en su
 * pestaña y cada escritura responde con el atributo completo, que repinta la vista.
 */
@Component({
  selector: 'nucleo-atributo-registro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    PageHeaderComponent,
    TablaComponent,
    BtnEnviarComponent,
    CampoComponent,
    ReactiveFormsModule,
    FormsModule,
    SkeletonComponent,
    AuditLogViewerComponent,
    RecordTabsComponent,
    AtributoFormComponent,
    MatButton,
  ],
  templateUrl: './atributo-registro.component.html',
})
export class AtributoRegistroComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(AtributoService);
  private readonly sesion = inject(SesionActualService);
  private readonly confirmar = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  @ViewChild(AtributoFormComponent)
  private formulario?: AtributoFormComponent;

  protected readonly atributo = signal<Atributo | null>(null);
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly guardando = signal(false);
  protected readonly enviandoValor = signal(false);
  protected readonly permisos = signal({ crear: false, editar: false, eliminar: false });
  protected readonly nuevo = this.route.snapshot.paramMap.get('id') === null;
  protected readonly puedeGuardar = computed(() =>
    this.nuevo
      ? (this.sesion.sesion()?.permisos.includes('inventario.crear') ?? false)
      : this.permisos().editar,
  );
  protected readonly tabs = [
    { label: 'General', icon: 'pi pi-tag' },
    { label: 'Valores', icon: 'pi pi-list' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly editando = signal<AtributoValor | null>(null);
  protected readonly valorNombre = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(LIMITES_VALOR.nombre.maxLength)],
  });
  protected readonly valorOrden = new FormControl<number | null>(null, [
    Validators.min(LIMITES_VALOR.orden.minimum),
    Validators.max(LIMITES_VALOR.orden.maximum),
  ]);
  protected readonly maxNombreValor = LIMITES_VALOR.nombre.maxLength;

  protected readonly valores = computed(() => this.atributo()?.valores ?? []);
  protected readonly columnasValores: ColumnaListado<AtributoValor>[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Valor' },
    { tipo: 'texto', campo: 'orden', encabezado: 'Orden' },
    {
      tipo: 'acciones',
      acciones: () => (this.permisos().editar ? [{ tipo: 'editar' }, { tipo: 'eliminar' }] : []),
    },
  ];

  ngOnInit(): void {
    if (this.nuevo) this.estado.set('listo');
    else this.cargar();
  }

  protected cargar(inicial = true): void {
    if (inicial) this.estado.set('cargando');
    this.servicio.obtener(Number(this.route.snapshot.paramMap.get('id'))).subscribe({
      next: (r) => {
        this.atributo.set(r.data);
        this.permisos.set(r.meta.permisos);
        this.estado.set('listo');
      },
      error: () => this.estado.set('error'),
    });
  }

  guardar(datos: AtributoPayload): void {
    if (!this.puedeGuardar() || this.guardando()) return;
    this.guardando.set(true);
    const actual = this.atributo();
    const peticion = actual ? this.servicio.actualizar(actual.id, datos) : this.servicio.crear(datos);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (guardado) => {
        this.toast.success(this.nuevo ? 'Atributo creado.' : 'Cambios guardados.');
        if (this.nuevo) void this.router.navigate(['/inventario/atributos', guardado.id]);
        else this.atributo.set({ ...guardado, valores: actual?.valores });
      },
      error: (e) => {
        if (e.status === 422 && e.error?.errors) this.formulario?.setServerErrors(e.error.errors);
        else if (!leerErrorNegocio(e)) this.toast.error(mensajeError(e, 'No se pudo guardar el atributo.'));
      },
    });
  }

  protected async eliminar(): Promise<void> {
    const actual = this.atributo();
    if (!actual || !this.permisos().eliminar) return;
    if (!(await this.confirmar.confirmarEliminacion({ objeto: 'atributo' }))) return;
    this.servicio.eliminar(actual.id).subscribe({
      next: () => {
        this.toast.success('Atributo eliminado.');
        void this.router.navigate(['/inventario/atributos']);
      },
      error: (e) => this.toast.error(this.mensajeEliminar(e, 'No se pudo eliminar el atributo.')),
    });
  }

  protected guardarValor(): void {
    const actual = this.atributo();
    if (!actual || !this.permisos().editar || this.enviandoValor()) return;
    if (this.valorNombre.invalid || this.valorOrden.invalid) {
      this.valorNombre.markAsTouched();
      this.valorOrden.markAsTouched();
      return;
    }
    const datos = { nombre: this.valorNombre.value.trim(), orden: this.valorOrden.value };
    const valor = this.editando();
    const peticion: Observable<Atributo> = valor
      ? this.servicio.actualizarValor(valor.id, datos)
      : this.servicio.crearValor(actual.id, datos);
    this.enviandoValor.set(true);
    peticion.pipe(finalize(() => this.enviandoValor.set(false))).subscribe({
      next: (atributo) => {
        this.atributo.set(atributo);
        this.limpiarValor();
        this.toast.success('Valor guardado.');
      },
      error: (e) => {
        if (e.status === 422 && e.error?.errors?.nombre)
          this.valorNombre.setErrors({ servidor: String([e.error.errors.nombre].flat()[0]) });
        else if (!leerErrorNegocio(e)) this.toast.error(mensajeError(e, 'No se pudo guardar el valor.'));
      },
    });
  }

  protected limpiarValor(): void {
    this.editando.set(null);
    this.valorNombre.reset('');
    this.valorOrden.reset(null);
  }

  protected async accionValor(valor: AtributoValor, accion: string): Promise<void> {
    if (!this.permisos().editar) return;
    if (accion === 'editar') {
      this.editando.set(valor);
      this.valorNombre.setValue(valor.nombre);
      this.valorOrden.setValue(valor.orden);
      return;
    }
    if (!(await this.confirmar.confirmarEliminacion({ objeto: 'valor' }))) return;
    this.servicio.eliminarValor(valor.id).subscribe({
      next: () => {
        if (this.editando()?.id === valor.id) this.limpiarValor();
        this.cargar(false);
      },
      error: (e) => this.toast.error(this.mensajeEliminar(e, 'No se pudo eliminar el valor.')),
    });
  }

  /** `atributo_en_uso` trae su propio mensaje: el atributo o el valor ya lo usa una variante. */
  private mensajeEliminar(error: unknown, respaldo: string): string {
    return esErrorNegocio(error, 'atributo_en_uso') ? mensajeError(error, respaldo) : respaldo;
  }
}
