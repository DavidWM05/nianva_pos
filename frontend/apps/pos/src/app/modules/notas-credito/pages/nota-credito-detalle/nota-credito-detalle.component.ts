import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { BadgeComponent, SkeletonComponent } from '@nianva/ui-feedback';
import { DineroPipe, FechaPipe, FechaHoraPipe } from '@nianva/ui-format';
import {
  DatosComponent,
  PageComponent,
  PageHeaderComponent,
  SectionComponent,
} from '@nianva/ui-layout';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AuditLogViewerComponent,
  RecordTabConfig,
  RecordTabsComponent,
} from '@nianva/ui-shared';

import { NotaCreditoService } from '../../nota-credito.service';
import { NotaCredito } from '../../nota-credito.types';

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Solo lectura: no hay acciones, ver el docblock de NotaCreditoService.
 */
@Component({
  selector: 'nucleo-nota-credito-detalle',
  standalone: true,
  imports: [
    RouterLink,
    RecordTabsComponent,
    AuditLogViewerComponent,
    PageComponent,
    PageHeaderComponent,
    SectionComponent,
    DatosComponent,
    TablaComponent,
    BadgeComponent,
    SkeletonComponent,
    DineroPipe,
    FechaPipe,
    FechaHoraPipe,
  ],
  templateUrl: './nota-credito-detalle.component.html',
  styleUrl: './nota-credito-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotaCreditoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notaCreditoService = inject(NotaCreditoService);

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Nota de Crédito', icon: 'pi pi-ticket' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly notaCredito = signal<NotaCredito | null>(null);

  ngOnInit(): void {
    this.cargar(Number(this.route.snapshot.paramMap.get('id')));
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.error.set(false);

    this.notaCreditoService.obtener(id).subscribe({
      next: (nota) => {
        this.notaCredito.set(nota);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  protected readonly error = signal(false);
  protected readonly estado = computed(() =>
    this.cargando() ? 'cargando' : this.error() ? 'error' : 'listo',
  );
  protected readonly paginaHistorial = signal(1);
  protected readonly filasPorPagina = signal(25);
  protected readonly historial = computed(() =>
    (this.notaCredito()?.usos ?? []).map((fila) => ({
      ...fila,
      ventaTexto: 'Venta #' + fila.venta_id,
    })),
  );
  protected readonly filasHistorial = computed(() =>
    this.historial().slice(
      (this.paginaHistorial() - 1) * this.filasPorPagina(),
      this.paginaHistorial() * this.filasPorPagina(),
    ),
  );
  protected readonly metaHistorial = computed<MetaListado>(() => ({
    total: this.historial().length,
    page: this.paginaHistorial(),
    rows: this.filasPorPagina(),
    filtros_aplicados: {},
    permisos: {},
  }));
  protected readonly columnasHistorial: ColumnaListado<
    NonNullable<NotaCredito['usos']>[number] & { ventaTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'ventaTexto', encabezado: 'Venta' },
    { tipo: 'fechaHora', campo: 'created_at', encabezado: 'Fecha' },
    { tipo: 'dinero', campo: 'monto_usado', encabezado: 'Monto usado' },
    { tipo: 'acciones', acciones: () => [{ tipo: 'ver' }] },
  ];

  verVenta(id: number): void {
    this.router.navigate(['/tpv/ventas', id]);
  }

  reintentar(): void {
    this.cargar(Number(this.route.snapshot.paramMap.get('id')));
  }

  cambiarPaginaHistorial(evento: CambioListado): void {
    this.paginaHistorial.set(evento.page);
    this.filasPorPagina.set(evento.rows);
  }
}
