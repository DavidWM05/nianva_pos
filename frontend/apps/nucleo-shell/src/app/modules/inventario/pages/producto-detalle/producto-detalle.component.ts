import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';

import { CompraFormComponent, CompraFormValue } from '../../compra-form/compra-form.component';
import { CompraFormPayload, CompraService, ProveedorFormPayload } from '../../compra.service';
import { ConfiguracionService } from '../../../configuracion/configuracion.service';
import { KardexListComponent } from '../../kardex-list/kardex-list.component';
import { ProductoFormComponent } from '../../producto-form/producto-form.component';
import { ProductoFormPayload, ProductoService, VarianteFormPayload } from '../../producto.service';
import { MovimientoKardex, Producto, ProductoVariante, ProveedorSimple } from '../../producto.types';
import { ProveedorFormComponent } from '../../proveedor-form/proveedor-form.component';
import { VarianteFormComponent } from '../../variante-form/variante-form.component';
import { VariantesListComponent } from '../../variantes-list/variantes-list.component';

/**
 * Vista de registro de Inventario -- General (formulario + variantes con
 * su stock por sucursal), Kardex (de la variante seleccionada), Auditoria
 * (@defer on viewport, igual que en Crm). Kardex NO usa @defer: el
 * encargo solo lo pide para Auditoria; aqui simplemente se recarga cada
 * vez que cambia la variante seleccionada.
 *
 * "Registrar compra" (ver el reporte del bug "no puedo ingresar stock")
 * vive aqui, por variante, en vez de en una pantalla propia -- es la unica
 * forma de ingresar stock inicial en todo el sistema. Requiere al menos un
 * proveedor existente (ver ProveedorFormComponent, alta rapida desde el
 * mismo modal).
 */
@Component({
  selector: 'nucleo-producto-detalle',
  standalone: true,
  imports: [
    FormsModule,
    RecordTabsComponent,
    ProductoFormComponent,
    VariantesListComponent,
    VarianteFormComponent,
    KardexListComponent,
    AuditLogViewerComponent,
    CompraFormComponent,
    ProveedorFormComponent,
    Button,
    Dialog,
    Select,
  ],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productoService = inject(ProductoService);
  private readonly compraService = inject(CompraService);
  private readonly toast = inject(ToastService);
  // Inventario->Configuracion, excepcion documentada igual que
  // CajaController->GastoService en el backend (ver ese docblock): esta
  // pagina orquesta la lectura de un flag de otro modulo, VarianteFormComponent
  // en si mismo no conoce Configuracion, solo recibe un boolean por @Input.
  private readonly configuracionService = inject(ConfiguracionService);

  @ViewChild(ProductoFormComponent) private formularioProducto?: ProductoFormComponent;
  @ViewChild(VarianteFormComponent) private formularioVariante?: VarianteFormComponent;
  @ViewChild(CompraFormComponent) private formularioCompra?: CompraFormComponent;
  @ViewChild(ProveedorFormComponent) private formularioProveedor?: ProveedorFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-box' },
    { label: 'Kardex', icon: 'pi pi-list' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly producto = signal<Producto | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly puedeEliminar = signal(false);
  protected readonly puedeRegistrarCompra = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  protected readonly mostrarFormularioVariante = signal(false);
  protected readonly varianteEnEdicion = signal<ProductoVariante | null>(null);
  protected readonly codigoBarrasAutomatico = signal(false);

  protected readonly varianteSeleccionadaId = signal<number | null>(null);
  protected readonly kardex = signal<MovimientoKardex[]>([]);
  protected readonly cargandoKardex = signal(false);

  protected readonly mostrarFormularioCompra = signal(false);
  protected readonly varianteEnCompra = signal<ProductoVariante | null>(null);
  protected readonly proveedores = signal<ProveedorSimple[]>([]);
  protected readonly registrandoCompra = signal(false);

  protected readonly mostrarFormularioProveedor = signal(false);
  protected readonly guardandoProveedor = signal(false);

  private productoId!: number;

  ngOnInit(): void {
    this.productoId = Number(this.route.snapshot.paramMap.get('id'));
    this.cargarProducto();

    this.configuracionService
      .publica()
      .subscribe((config) => this.codigoBarrasAutomatico.set(config.codigo_barras_automatico));
  }

  private cargarProducto(): void {
    this.cargando.set(true);
    this.productoService.obtener(this.productoId).subscribe(({ producto, permisos }) => {
      this.producto.set(producto);
      this.puedeEditar.set(permisos.editar);
      this.puedeEliminar.set(permisos.eliminar);
      this.puedeRegistrarCompra.set(permisos.compras_crear ?? false);
      this.cargando.set(false);

      const variantes = producto.variantes ?? [];
      if (variantes.length > 0 && this.varianteSeleccionadaId() === null) {
        this.seleccionarVariante(variantes[0].id);
      }
    });
  }

  onGuardarProducto(payload: ProductoFormPayload): void {
    const producto = this.producto();
    if (!producto) {
      return;
    }

    this.guardando.set(true);

    this.productoService.actualizar(producto.id, payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
        this.cargarProducto();
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formularioProducto?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el producto.');
        }
      },
    });
  }

  abrirNuevaVariante(): void {
    this.varianteEnEdicion.set(null);
    this.mostrarFormularioVariante.set(true);
  }

  abrirEdicionVariante(variante: ProductoVariante): void {
    this.varianteEnEdicion.set(variante);
    this.mostrarFormularioVariante.set(true);
  }

  cerrarFormularioVariante(): void {
    this.mostrarFormularioVariante.set(false);
  }

  onGuardarVariante(payload: VarianteFormPayload): void {
    const enEdicion = this.varianteEnEdicion();
    const observable = enEdicion
      ? this.productoService.actualizarVariante(enEdicion.id, payload)
      : this.productoService.crearVariante(this.productoId, payload);

    observable.subscribe({
      next: () => {
        this.mostrarFormularioVariante.set(false);
        this.toast.success(enEdicion ? 'Variante actualizada.' : 'Variante creada.');
        this.cargarProducto();
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 422 && error.error?.errors) {
          this.formularioVariante?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar la variante.');
        }
      },
    });
  }

  onDesactivarVariante(variante: ProductoVariante): void {
    this.productoService.desactivarVariante(variante.id).subscribe(() => this.cargarProducto());
  }

  seleccionarVariante(varianteId: number): void {
    this.varianteSeleccionadaId.set(varianteId);
    this.cargandoKardex.set(true);

    this.productoService.kardex(varianteId).subscribe({
      next: (movimientos) => {
        this.kardex.set(movimientos);
        this.cargandoKardex.set(false);
      },
      error: () => this.cargandoKardex.set(false),
    });
  }

  abrirModalCompra(variante: ProductoVariante): void {
    this.varianteEnCompra.set(variante);
    this.mostrarFormularioCompra.set(true);
    this.cargarProveedores();
  }

  cerrarModalCompra(): void {
    this.mostrarFormularioCompra.set(false);
  }

  private cargarProveedores(): void {
    this.compraService.proveedores().subscribe((proveedores) => this.proveedores.set(proveedores));
  }

  onGuardarCompra(valor: CompraFormValue): void {
    const variante = this.varianteEnCompra();
    if (!variante) {
      return;
    }

    const payload: CompraFormPayload = {
      proveedor_id: valor.proveedor_id,
      numero_comprobante: valor.numero_comprobante,
      items: [{ variante_id: variante.id, cantidad: valor.cantidad, precio_compra: valor.precio_compra }],
    };

    this.registrandoCompra.set(true);

    this.compraService.registrar(payload).subscribe({
      next: () => {
        this.registrandoCompra.set(false);
        this.mostrarFormularioCompra.set(false);
        this.toast.success('Compra registrada.');
        // Refresca stock (Variantes) y kardex (pestaña Kardex) de la misma
        // variante -- cargarProducto() solo re-selecciona una variante
        // automaticamente si NINGUNA estaba seleccionada todavia.
        this.cargarProducto();
        this.seleccionarVariante(variante.id);
      },
      error: (error: HttpErrorResponse) => {
        this.registrandoCompra.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formularioCompra?.setServerErrors(this.remapearErroresDeItems(error.error.errors));
        } else {
          this.toast.error('No se pudo registrar la compra.');
        }
      },
    });
  }

  /** `items.0.cantidad` (validacion del backend) -> `cantidad` (nombre del campo en el form). */
  private remapearErroresDeItems(errores: Record<string, string | string[]>): Record<string, string | string[]> {
    const remapeado: Record<string, string | string[]> = {};

    for (const [clave, mensaje] of Object.entries(errores)) {
      const claveLimpia = clave.replace(/^items\.\d+\./, '');
      remapeado[claveLimpia] = mensaje;
    }

    return remapeado;
  }

  abrirModalProveedor(): void {
    this.mostrarFormularioProveedor.set(true);
  }

  cerrarModalProveedor(): void {
    this.mostrarFormularioProveedor.set(false);
  }

  onGuardarProveedor(payload: ProveedorFormPayload): void {
    this.guardandoProveedor.set(true);

    this.compraService.crearProveedor(payload).subscribe({
      next: (proveedor) => {
        this.guardandoProveedor.set(false);
        this.mostrarFormularioProveedor.set(false);
        this.toast.success('Proveedor creado.');
        this.proveedores.update((actuales) => [...actuales, proveedor]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardandoProveedor.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formularioProveedor?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el proveedor.');
        }
      },
    });
  }
}
