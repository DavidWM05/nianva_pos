import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import {
  BotonCrearComponent,
  AccionEmitida,
  AccionFila,
} from '@nianva/ui-actions';
import { PageComponent } from '@nianva/ui-layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { DataTableLazyEvent } from '@nianva/ui-shared';

import { PrestamoService } from '../../prestamo.service';
import { Prestamo } from '../../prestamo.types';

@Component({
  selector: 'nucleo-prestamos-list',
  standalone: true,
  imports: [TablaComponent, BotonCrearComponent, PageComponent],
  templateUrl: './prestamos-list.component.html',
  styleUrl: './prestamos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrestamosListComponent {
  private readonly prestamoService = inject(PrestamoService);
  private readonly router = inject(Router);

  protected readonly columns: ColumnaListado<
    Prestamo & { referenciaTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'referenciaTexto', encabezado: 'Referencia' },
    { tipo: 'dinero', campo: 'monto', encabezado: 'Monto' },
    {
      tipo: 'dinero',
      campo: 'monto_a_pagar',
      encabezado: 'A pagar (con interés)',
    },
    { tipo: 'porcentaje', campo: 'interes', encabezado: 'Interés' },
    { tipo: 'dinero', campo: 'saldo_pendiente', encabezado: 'Saldo pendiente' },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'prestamo',
    },
    {
      tipo: 'fecha',
      campo: 'fecha_prestamo',
      encabezado: 'Fecha',
      ordenable: true,
    },
    { tipo: 'acciones', acciones: () => this.acciones() },
  ];

  protected readonly prestamos = signal<Prestamo[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);

  private ultimoEvento: DataTableLazyEvent = {
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  };

  constructor() {
    this.cargar(this.ultimoEvento);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(prestamo: Prestamo): void {
    this.router.navigate(['/prestamos', prestamo.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.errorCarga.set(false);
    this.loading.set(true);

    this.prestamoService.listar(evento).subscribe({
      next: (respuesta) => {
        this.prestamos.set(respuesta.data);
        this.total.set(respuesta.total);
        this.primeraCarga.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.primeraCarga.set(false);
        this.loading.set(false);
        this.errorCarga.set(true);
      },
    });
  }
  protected readonly primeraCarga = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly estado = computed(() =>
    this.loading() && this.primeraCarga()
      ? 'cargando'
      : this.errorCarga()
        ? 'error'
        : 'listo',
  );
  protected readonly filas = computed(() =>
    this.prestamos().map((f) => ({
      ...f,
      referenciaTexto: f.referencia ?? 'Préstamo #' + f.id,
    })),
  );
  protected get meta(): MetaListado {
    return {
      total: this.total(),
      page: Math.floor(this.ultimoEvento.first / this.ultimoEvento.rows) + 1,
      rows: this.ultimoEvento.rows,
      filtros_aplicados: {},
      permisos: {},
    };
  }
  onCambio(evento: CambioListado): void {
    this.onLazyLoad({
      first: (evento.page - 1) * evento.rows,
      rows: evento.rows,
      sortField: evento.sortField,
      sortOrder:
        evento.sortOrder === 'asc'
          ? 1
          : evento.sortOrder === 'desc'
            ? -1
            : null,
      filters: {},
    });
  }
  reintentar(): void {
    this.cargar(this.ultimoEvento);
  }

  protected acciones(): AccionFila[] {
    return [{ tipo: 'ver' }];
  }
  onAccion(fila: Prestamo, accion: AccionEmitida): void {
    if (accion.tipo === 'ver') this.irADetalle(fila);
  }
}
