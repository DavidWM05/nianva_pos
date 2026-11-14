import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CambioListado, ColumnaListado, MetaListado, TablaComponent } from '@nianva/ui-data';
import { BadgeComponent, SkeletonComponent } from '@nianva/ui-feedback';
import { DineroPipe, FechaHoraPipe } from '@nianva/ui-format';
import { DatosComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent } from '@nianva/ui-shared';

import { VentaService } from '../../venta.service';
import { Venta, VentaDetalle } from '../../venta.types';

/**
 * Vista de registro de Venta -- General (resumen + cliente + pago, ver el
 * reporte del punto 2: datos principales de la transaccion arriba) +
 * Lineas (sub-tab, datos secundarios) + Auditoria. Siempre de solo
 * lectura -- una venta nunca se edita, solo se anula (VentasListComponent)
 * o se devuelve (DevolucionComponent) -- por eso no hay `readonly`
 * @Input ni boton de guardar aqui, a diferencia de Producto/Cliente/
 * ReglaPrecio/Cupon.
 */
@Component({
  selector: 'nucleo-venta-detalle',
  standalone: true,
  imports: [
    RouterLink,
    RecordTabsComponent,
    BadgeComponent,
    AuditLogViewerComponent,
    MatButton,
    SkeletonComponent,
    TablaComponent,
    DineroPipe,
    FechaHoraPipe,
    DatosComponent,
    PageHeaderComponent,
  ],
  templateUrl: './venta-detalle.component.html',
  styleUrl: './venta-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VentaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ventaService = inject(VentaService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-receipt' },
    { label: 'Líneas', icon: 'pi pi-list' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly venta = signal<Venta | null>(null);
  protected readonly cargando = signal(true);

  // Lineas en ui-tabla, paginadas en el cliente como en el detalle de cotizacion y de apartado.
  protected readonly paginaLineas = signal<CambioListado>({ page: 1, rows: 25, sortField: null, sortOrder: null });
  protected readonly todasLineas = computed(() =>
    (this.venta()?.detalles ?? []).map((detalle) => ({
      ...detalle,
      productoTexto: this.textoProducto(detalle),
    })),
  );
  protected readonly filasLineas = computed(() => {
    const { page, rows } = this.paginaLineas();

    return this.todasLineas().slice((page - 1) * rows, page * rows);
  });
  protected readonly metaLineas = computed<MetaListado>(() => ({
    total: this.todasLineas().length,
    page: this.paginaLineas().page,
    rows: this.paginaLineas().rows,
    filtros_aplicados: {},
    permisos: {},
  }));
  protected readonly columnasLineas: ColumnaListado<ReturnType<typeof this.todasLineas>[number]>[] = [
    { tipo: 'principal', campo: 'productoTexto', encabezado: 'Producto' },
    { tipo: 'cantidad', campo: 'cantidad', encabezado: 'Cantidad' },
    { tipo: 'dinero', campo: 'precio_unitario', encabezado: 'Precio' },
    { tipo: 'dinero', campo: 'descuento_aplicado', encabezado: 'Descuento' },
    { tipo: 'dinero', campo: 'subtotal', encabezado: 'Subtotal' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.ventaService.obtener(id).subscribe((venta) => {
      this.venta.set(venta);
      this.cargando.set(false);
    });
  }

  private textoProducto(detalle: VentaDetalle): string {
    const variante = detalle.variante;
    const nombre = variante?.producto_nombre ?? '';

    return variante?.talla || variante?.color ? `${nombre} (${variante.talla ?? ''} / ${variante.color ?? ''})` : nombre;
  }

  protected etiquetaMetodosPago(venta: Venta): string {
    if (!venta.metodos_pago || venta.metodos_pago.length === 0) return '—';

    return venta.metodos_pago.map((p) => p.nombre ?? 'Método eliminado').join(' + ');
  }
}
