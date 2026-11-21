import {
  Component,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormControl,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { TablaComponent, ColumnaListado } from '@nianva/ui-data';
import {
  BtnEnviarComponent,
  CampoComponent,
  InputDineroComponent,
  SelectFiltroComponent,
} from '@nianva/ui-forms';
import {
  ConfirmDialogService,
  SkeletonComponent,
  ToastService,
} from '@nianva/ui-feedback';
import {
  AuditLogViewerComponent,
  RecordTabsComponent,
  EntidadSelectorComponent,
  leerErrorNegocio,
  mensajeError,
} from '@nianva/ui-shared';
import { aCentavos } from '@nianva/ui-format';
import { limitesDe } from '@nianva/api-contrato';
import { finalize } from 'rxjs';
import { SesionActualService } from '@nianva/domain-sesion';
import {
  BUSCADOR_CLIENTE,
  BUSCADOR_PRODUCTO,
  BUSCADOR_VARIANTE_DE_PRODUCTO,
} from '../../../../core/buscadores-entidad.tokens';
import { type ListaPrecioCliente, type ListaPrecioItem, ListaPrecioListadoService, type ListaPrecioRegistro } from '@nianva/domain-precios';
import { ListaPrecioFormComponent } from '../../lista-precio-form/lista-precio-form.component';

/** Limites del contrato de POST /precios/listas/{lista}/items (UI-11b). */
const LIMITES_ITEM = limitesDe('/precios/listas/{lista}/items', 'post');

@Component({
  selector: 'nucleo-lista-precio-registro',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    PageHeaderComponent,
    TablaComponent,
    BtnEnviarComponent,
    CampoComponent,
    InputDineroComponent,
    SelectFiltroComponent,
    ReactiveFormsModule,
    FormsModule,
    SkeletonComponent,
    AuditLogViewerComponent,
    RecordTabsComponent,
    EntidadSelectorComponent,
    ListaPrecioFormComponent,
  ],
  templateUrl: './lista-precio-registro.component.html',
})
export class ListaPrecioRegistroComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly servicio = inject(ListaPrecioListadoService);
  private readonly sesion = inject(SesionActualService);
  private readonly confirmar = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);
  protected readonly buscadorProducto = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVariantes = inject(BUSCADOR_VARIANTE_DE_PRODUCTO);
  @ViewChild(ListaPrecioFormComponent)
  private formulario?: ListaPrecioFormComponent;
  protected readonly lista = signal<ListaPrecioRegistro | null>(null);
  protected readonly estado = signal<'cargando' | 'listo' | 'error'>(
    'cargando',
  );
  protected readonly guardando = signal(false);
  protected readonly enviandoItem = signal(false);
  protected readonly enviandoCliente = signal(false);
  protected readonly permisos = signal({
    crear: false,
    editar: false,
    eliminar: false,
  });
  protected readonly nuevo = this.route.snapshot.paramMap.get('id') === null;
  protected readonly puedeGuardar = computed(() =>
    this.nuevo
      ? (this.sesion.sesion()?.permisos.includes('listas_precio.crear') ??
        false)
      : this.permisos().editar,
  );
  protected readonly tabs = [
    { label: 'General' },
    { label: 'Precios' },
    { label: 'Clientes' },
    { label: 'Auditoría' },
  ];
  protected readonly tipo = signal<'producto' | 'variante'>('producto');
  protected readonly productoId = signal<number | null>(null);
  protected readonly varianteId = signal<number | null>(null);
  protected readonly clienteId = signal<string | null>(null);
  protected readonly editando = signal<ListaPrecioItem | null>(null);
  protected readonly precio = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(LIMITES_ITEM.precio.minimum),
    Validators.max(LIMITES_ITEM.precio.maximum),
  ]);
  protected readonly opcionesTipo = [
    { value: 'producto', label: 'Producto' },
    { value: 'variante', label: 'Variante' },
  ];
  protected readonly items = computed(() =>
    (this.lista()?.items ?? []).map((item) => ({
      ...item,
      referencia: this.referencia(item),
    })),
  );
  protected readonly clientes = computed(() =>
    (this.lista()?.clientes ?? []).map((c) => ({
      ...c,
      referencia: 'Cliente #' + c.cliente_id,
    })),
  );
  protected readonly columnasItems: ColumnaListado<
    ListaPrecioItem & { referencia: string }
  >[] = [
    {
      tipo: 'principal',
      campo: 'referencia',
      encabezado: 'Producto o variante',
    },
    { tipo: 'dinero', campo: 'precio', encabezado: 'Precio' },
    {
      tipo: 'acciones',
      acciones: () =>
        this.permisos().editar
          ? [{ tipo: 'editar' }, { tipo: 'eliminar' }]
          : [],
    },
  ];
  protected readonly columnasClientes: ColumnaListado<
    ListaPrecioCliente & { referencia: string }
  >[] = [
    { tipo: 'principal', campo: 'referencia', encabezado: 'Cliente' },
    {
      tipo: 'acciones',
      acciones: () => (this.permisos().editar ? [{ tipo: 'eliminar' }] : []),
    },
  ];
  ngOnInit(): void {
    if (this.nuevo) this.estado.set('listo');
    else this.cargar();
  }
  protected cargar(inicial = true): void {
    if (inicial) this.estado.set('cargando');
    this.servicio
      .obtener(Number(this.route.snapshot.paramMap.get('id')))
      .subscribe({
        next: (r) => {
          this.lista.set(r.data);
          this.permisos.set(r.meta.permisos);
          this.estado.set('listo');
        },
        error: () => this.estado.set('error'),
      });
  }
  guardar(datos: { nombre: string }): void {
    if (!this.puedeGuardar() || this.guardando()) return;
    this.guardando.set(true);
    const lista = this.lista();
    const peticion = lista
      ? this.servicio.actualizar(lista.id, datos)
      : this.servicio.crear(datos);
    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: () => {
        this.toast.success('Cambios guardados.');
        if (this.nuevo) void this.router.navigate(['/precios/listas']);
        else this.cargar(false);
      },
      error: (e) => {
        if (e.status === 422 && e.error?.errors)
          this.formulario?.setServerErrors(e.error.errors);
        else if (!leerErrorNegocio(e))
          this.toast.error(mensajeError(e, 'No se pudo guardar el cambio.'));
      },
    });
  }
  protected referencia(item: ListaPrecioItem): string {
    return item.variante_id === null
      ? 'Producto #' + item.producto_id
      : 'Variante #' + item.variante_id;
  }
  protected cambiarTipo(tipo: 'producto' | 'variante'): void {
    this.tipo.set(tipo);
    this.productoId.set(null);
    this.varianteId.set(null);
  }
  protected limpiarPrecio(): void {
    this.editando.set(null);
    this.precio.reset();
    this.productoId.set(null);
    this.varianteId.set(null);
  }
  protected guardarPrecio(): void {
    const lista = this.lista(),
      precio = this.precio.value;
    if (
      !lista ||
      !this.permisos().editar ||
      this.enviandoItem() ||
      this.precio.invalid ||
      precio === null
    ) {
      this.precio.markAsTouched();
      return;
    }
    const producto_id = this.tipo() === 'producto' ? this.productoId() : null,
      variante_id = this.tipo() === 'variante' ? this.varianteId() : null;
    if (producto_id === null && variante_id === null) return;
    this.enviandoItem.set(true);
    const item = this.editando(),
      datos = { producto_id, variante_id, precio };
    const peticion = item
      ? this.servicio.actualizarItem(lista.id, item.id, datos)
      : this.servicio.guardarItem(lista.id, datos);
    peticion.pipe(finalize(() => this.enviandoItem.set(false))).subscribe({
      next: () => {
        this.limpiarPrecio();
        this.cargar(false);
        this.toast.success('Precio guardado.');
      },
      error: (e) => {
        if (e.status === 422 && e.error?.errors?.precio)
          this.precio.setErrors({ servidor: e.error.errors.precio });
        else if (!leerErrorNegocio(e))
          this.toast.error(mensajeError(e, 'No se pudo guardar el cambio.'));
      },
    });
  }
  protected async accionItem(
    item: ListaPrecioItem,
    accion: string,
  ): Promise<void> {
    if (!this.permisos().editar) return;
    if (accion === 'editar') {
      this.editando.set(item);
      this.tipo.set(item.variante_id === null ? 'producto' : 'variante');
      this.productoId.set(item.producto_id);
      this.varianteId.set(item.variante_id);
      this.precio.setValue(aCentavos(item.precio) / 100);
      return;
    }
    const lista = this.lista();
    if (
      !lista ||
      !(await this.confirmar.confirmarEliminacion({
        objeto: 'precio de lista',
      }))
    )
      return;
    this.servicio.quitarItem(lista.id, item.id).subscribe({
      next: () => this.cargar(false),
      error: (e) => {
        if (!leerErrorNegocio(e))
          this.toast.error(mensajeError(e, 'No se pudo guardar el cambio.'));
      },
    });
  }
  protected asignarCliente(): void {
    const lista = this.lista(),
      id = this.clienteId();
    if (
      !lista ||
      id === null ||
      !this.permisos().editar ||
      this.enviandoCliente()
    )
      return;
    this.enviandoCliente.set(true);
    this.servicio
      .asignarCliente(lista.id, id)
      .pipe(finalize(() => this.enviandoCliente.set(false)))
      .subscribe({
        next: () => {
          this.clienteId.set(null);
          this.cargar(false);
          this.toast.success('Cliente asignado.');
        },
        error: (e) => {
          if (!leerErrorNegocio(e))
            this.toast.error(mensajeError(e, 'No se pudo guardar el cambio.'));
        },
      });
  }
  protected async quitarCliente(cliente: ListaPrecioCliente): Promise<void> {
    const lista = this.lista();
    if (
      !lista ||
      !this.permisos().editar ||
      !(await this.confirmar.confirmarEliminacion({
        objeto: 'asignación de cliente',
      }))
    )
      return;
    this.servicio.quitarCliente(lista.id, cliente.id).subscribe({
      next: () => this.cargar(false),
      error: (e) => {
        if (!leerErrorNegocio(e))
          this.toast.error(mensajeError(e, 'No se pudo guardar el cambio.'));
      },
    });
  }
}
