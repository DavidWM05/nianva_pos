import { CambioListado, ColumnaListado, MetaListado, TablaComponent } from '@nianva/ui-data';
import { DineroPipe, FechaHoraPipe } from '@nianva/ui-format';
import { SkeletonComponent, } from '@nianva/ui-feedback';
import { DatosComponent, PageComponent, PageHeaderComponent, } from '@nianva/ui-layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent } from '@nianva/ui-shared';
import { DevolucionService } from '../../devolucion.service';
import { Devolucion } from '../../devolucion.types';


/**
 * Vista de registro de una devolucion/cambio -- General (venta origen,
 * items, diferencia, pagos, link a la venta sombra si es un cambio) y
 * Auditoria (@defer, patron de siempre). Sin acciones de escritura aqui
 * (a diferencia de Venta/Apartado): el catalogo de permisos sembrado
 * solo tiene devoluciones.ver/crear, no hay "anular"/"cancelar" una
 * devolucion ya registrada.
 */
@Component({
  selector: 'nucleo-devolucion-detalle',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, RecordTabsComponent, AuditLogViewerComponent, TablaComponent, DineroPipe, FechaHoraPipe, SkeletonComponent, DatosComponent, PageComponent, PageHeaderComponent, ],
  templateUrl: './devolucion-detalle.component.html',
  styleUrl: './devolucion-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevolucionDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly devolucionService = inject(DevolucionService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-file' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly devolucion = signal<Devolucion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargando.set(true);
    this.error.set(false);

    this.devolucionService.obtener(id).subscribe({
      next: (devolucion) => {
        this.devolucion.set(devolucion);
        this.cargando.set(false);
      },
      error: () => { this.cargando.set(false); this.error.set(true); },
    });
  }

  protected etiquetaMetodosPago(pagos: { nombre: string | null }[] | undefined): string {
    if (!pagos || pagos.length === 0) return '—';

    return pagos.map((p) => p.nombre ?? 'Método eliminado').join(' + ');
  }

  /** Quita el signo por texto (no aritmetica) para no perder el formato "120.00". */
  protected montoAbsoluto(diferencia: string): string {
    return diferencia.startsWith('-') ? diferencia.slice(1) : diferencia;
  }
  protected readonly paginaLineas = signal<CambioListado>({ page: 1, rows: 25, sortField: null, sortOrder: null });
  protected readonly todasLineas = computed(() => (this.devolucion()?.items ?? []).map(d => ({ ...d, productoTexto: (d.variante?.producto_nombre ?? '') + (d.variante?.talla || d.variante?.color ? ' (' + (d.variante?.talla ?? '') + ' / ' + (d.variante?.color ?? '') + ')' : ''), tipoTexto: d.tipo === 'nuevo' ? 'Nuevo' : 'Devuelto', mermaTexto: d.va_a_merma ? 'Merma' : '' })));
  protected readonly filasLineas = computed(() => this.todasLineas().slice((this.paginaLineas().page - 1) * this.paginaLineas().rows, this.paginaLineas().page * this.paginaLineas().rows));
  protected readonly metaLineas = computed<MetaListado>(() => ({ total: this.todasLineas().length, page: this.paginaLineas().page, rows: this.paginaLineas().rows, filtros_aplicados: {}, permisos: {} }));
  protected readonly columnasLineas: ColumnaListado<ReturnType<typeof this.todasLineas>[number]>[] = [{ tipo: 'principal', campo: 'productoTexto', encabezado: 'Producto' },{ tipo: 'cantidad', campo: 'cantidad', encabezado: 'Cantidad', unidad: 'unidad(es)' },{ tipo: 'dinero', campo: 'precio_unitario', encabezado: 'Precio' },{ tipo: 'dinero', campo: 'subtotal', encabezado: 'Subtotal' },{ tipo: 'texto', campo: 'tipoTexto', encabezado: 'Tipo' },{ tipo: 'texto', campo: 'mermaTexto', encabezado: 'Destino' }];

}
