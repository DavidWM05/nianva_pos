import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  EntidadSelectorComponent,
  StatusBadgeComponent,
  ToastService,
} from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { BUSCADOR_UNIDAD_MEDIDA } from '../../../../core/buscadores-entidad.tokens';
import { InsumoService, InsumosPermisos } from '../../insumo.service';
import { Insumo } from '../../insumo.types';

const PERMISOS_VACIOS: InsumosPermisos = { crear: false };

/** Sin insumosShow()/insumosUpdate() -- el alta vive en un dialogo sobre la misma lista. */
@Component({
  selector: 'nucleo-insumos-list',
  standalone: true,
  imports: [
    FormsModule,
    DataTableComponent,
    DataTableCellDirective,
    EntidadSelectorComponent,
    StatusBadgeComponent,
    Button,
    Checkbox,
    Dialog,
    InputText,
  ],
  templateUrl: './insumos-list.component.html',
  styleUrl: './insumos-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsumosListComponent implements OnInit {
  private readonly insumoService = inject(InsumoService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorUnidadMedida = inject(BUSCADOR_UNIDAD_MEDIDA);

  protected readonly columns: DataTableColumn[] = [
    { field: 'nombre', header: 'Nombre' },
    { field: 'sku', header: 'SKU' },
    { field: 'unidad_medida_id', header: 'Unidad' },
    { field: 'costo', header: 'Costo' },
    { field: 'stock_minimo', header: 'Stock mínimo' },
    { field: 'activo', header: 'Activo' },
  ];

  protected readonly insumos = signal<Insumo[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<InsumosPermisos>(PERMISOS_VACIOS);
  protected readonly nombreFiltro = signal('');
  protected readonly stockBajoFiltro = signal(false);

  // Catalogo chico y sin paginar (ver BUSCADOR_UNIDAD_MEDIDA) -- se carga
  // una vez con buscar('') para resolver "unidad_medida_id" a un nombre
  // legible en la tabla, ya que InsumoResource solo devuelve el id crudo.
  protected readonly nombresUnidadMedida = signal(new Map<number, string>());

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };

  // -- Nuevo insumo --
  protected readonly mostrarFormulario = signal(false);
  protected readonly nombre = signal('');
  protected readonly sku = signal('');
  protected readonly unidadMedidaId = signal<number | null>(null);
  protected readonly costo = signal<number | null>(null);
  protected readonly stockMinimo = signal<number | null>(null);
  protected readonly guardando = signal(false);

  ngOnInit(): void {
    this.buscadorUnidadMedida.buscar('').subscribe((unidades) => {
      this.nombresUnidadMedida.set(new Map(unidades.map((u) => [u.id, u.nombre])));
    });
  }

  onNombreInput(texto: string): void {
    this.nombreFiltro.set(texto);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onStockBajoCambio(valor: boolean): void {
    this.stockBajoFiltro.set(valor);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  abrirFormulario(): void {
    this.nombre.set('');
    this.sku.set('');
    this.unidadMedidaId.set(null);
    this.costo.set(null);
    this.stockMinimo.set(null);
    this.mostrarFormulario.set(true);
  }

  cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
  }

  guardar(): void {
    const nombre = this.nombre().trim();
    const unidadMedidaId = this.unidadMedidaId();
    if (!nombre || unidadMedidaId === null) return;

    this.guardando.set(true);

    this.insumoService
      .crear({
        nombre,
        sku: this.sku().trim() || null,
        unidad_medida_id: unidadMedidaId,
        costo: this.costo() ?? undefined,
        stock_minimo: this.stockMinimo() ?? undefined,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.mostrarFormulario.set(false);
          this.toast.success('Insumo registrado.');
          this.cargar(this.ultimoEvento);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo registrar el insumo.');
        },
      });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.insumoService.listar(evento, { nombre: this.nombreFiltro(), stockBajo: this.stockBajoFiltro() }).subscribe({
      next: (respuesta) => {
        this.insumos.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
