import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { ConfirmDialogService } from '@nianva/ui-shared';
import { MatButton } from '@angular/material/button';
import {
  RowActionsComponent,
  AccionEmitida,
  AccionFila,
} from '@nianva/ui-actions';
import {
  CambioListado,
  ColumnaListado,
  EmptyComponent,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { AlertComponent } from '@nianva/ui-feedback';
import { CantidadPipe } from '@nianva/ui-format';
import { SectionComponent } from '@nianva/ui-layout';

import { ProductoVariante, StockPorSucursal } from '../producto.types';

/**
 * Primera relacion anidada de verdad del shell: cada variante tiene su
 * propio stock POR SUCURSAL (no solo un total). Decision: tarjetas
 * apiladas con una tabla chica de stock dentro de cada una, NO
 * row-expansion de PrimeNG ni una segunda nucleo-data-table anidada --
 * mismo criterio que "Mis dispositivos" del perfil de seguridad (ver ese
 * commit): son pocas variantes x pocas sucursales por producto, no un
 * dataset que necesite paginacion/virtual-scroll, y evita extender
 * nucleo-data-table con row-expansion sin poder verificarlo en un
 * navegador real.
 */
@Component({
  selector: 'nucleo-variantes-list',
  standalone: true,
  imports: [
    MatButton,
    RowActionsComponent,
    TablaComponent,
    EmptyComponent,
    AlertComponent,
    SectionComponent,
  ],
  providers: [CantidadPipe],
  templateUrl: './variantes-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantesListComponent {
  private readonly confirmDialog = inject(ConfirmDialogService);

  @Input() variantes: ProductoVariante[] = [];
  @Input() puedeEditar = false;
  @Input() puedeDesactivar = false;
  @Input() puedeRegistrarCompra = false;

  @Output() editar = new EventEmitter<ProductoVariante>();
  @Output() desactivar = new EventEmitter<ProductoVariante>();
  @Output() verKardex = new EventEmitter<ProductoVariante>();
  @Output() registrarCompra = new EventEmitter<ProductoVariante>();

  private readonly cantidad = inject(CantidadPipe);
  private readonly paginas = signal<
    Record<number, { page: number; rows: number }>
  >({});
  protected readonly columnasStock: ColumnaListado<StockPorSucursal>[] = [
    { tipo: 'principal', campo: 'sucursal_nombre', encabezado: 'Sucursal' },
    { tipo: 'cantidad', campo: 'stock_actual', encabezado: 'Stock actual' },
    { tipo: 'cantidad', campo: 'stock_minimo', encabezado: 'Stock mínimo' },
  ];
  protected metaStock(variante: ProductoVariante): MetaListado {
    const total = variante.stock?.length ?? 0;
    const actual = this.paginas()[variante.id] ?? { page: 1, rows: 100 };
    return {
      total,
      rows: actual.rows,
      page: Math.min(actual.page, Math.max(1, Math.ceil(total / actual.rows))),
      filtros_aplicados: {},
      permisos: {},
    };
  }
  protected filasStock(variante: ProductoVariante): StockPorSucursal[] {
    const meta = this.metaStock(variante);
    return (variante.stock ?? []).slice(
      (meta.page - 1) * meta.rows,
      meta.page * meta.rows,
    );
  }
  protected cambiarStock(id: number, evento: CambioListado): void {
    this.paginas.update((p) => ({ ...p, [id]: evento }));
  }
  protected stockBajo(variante: ProductoVariante): string {
    return (variante.stock ?? [])
      .filter((f) => f.stock_actual <= f.stock_minimo)
      .map(
        (f) =>
          (f.sucursal_nombre ?? 'Sin sucursal') +
          ' (' +
          this.cantidad.transform(f.stock_actual) +
          ' de ' +
          this.cantidad.transform(f.stock_minimo) +
          ')',
      )
      .join(', ');
  }
  protected acciones(variante: ProductoVariante): AccionFila[] {
    const acciones: AccionFila[] = [];
    if (this.puedeEditar) acciones.push({ tipo: 'editar' });
    if (this.puedeDesactivar && variante.activo)
      acciones.push({ tipo: 'estado', activo: true });
    return acciones;
  }
  protected onAccion(variante: ProductoVariante, accion: AccionEmitida): void {
    if (accion.tipo === 'editar') this.editar.emit(variante);
    if (accion.tipo === 'estado') void this.onDesactivar(variante);
  }

  protected etiquetaVariante(variante: ProductoVariante): string {
    const partes = [variante.talla, variante.color].filter((valor) => !!valor);

    return partes.length > 0 ? partes.join(' / ') : `Variante #${variante.id}`;
  }

  async onDesactivar(variante: ProductoVariante): Promise<void> {
    const confirmado = await this.confirmDialog.confirm({
      message: `¿Desactivar la variante "${this.etiquetaVariante(variante)}"?`,
      header: 'Desactivar variante',
      severity: 'danger',
    });

    if (confirmado) {
      this.desactivar.emit(variante);
    }
  }
}
