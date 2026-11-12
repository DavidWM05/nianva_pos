import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
} from '@angular/core';
import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { PageComponent } from '@nianva/ui-layout';

import { MovimientoKardex } from '../producto.types';

/**
 * Historial de movimientos de una variante -- solo lectura (kardex nunca
 * se escribe desde el frontend, solo desde InventarioService en el
 * backend). Tabla propia, no nucleo-data-table: es un listado acotado
 * (ultimos 100, sin paginacion -- ver KardexController) para dar
 * contexto dentro del registro, mismo criterio que el historial de
 * ventas de Cliente en Crm.
 */
@Component({
  selector: 'nucleo-kardex-list',
  standalone: true,
  imports: [PageComponent, TablaComponent],
  templateUrl: './kardex-list.component.html',
  styleUrl: './kardex-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KardexListComponent {
  @Input() movimientos: MovimientoKardex[] = [];
  @Input() cargando = false;
  @Input() error = false;
  @Output() reintentar = new EventEmitter<void>();
  private readonly pagina = signal(1);
  private readonly cantidadFilas = signal(100);
  protected get meta(): MetaListado {
    return {
      total: this.movimientos.length,
      page: this.pagina(),
      rows: this.cantidadFilas(),
      filtros_aplicados: {},
      permisos: {},
    };
  }
  protected get filas(): MovimientoKardex[] {
    return this.movimientos.slice(
      (this.pagina() - 1) * this.cantidadFilas(),
      this.pagina() * this.cantidadFilas(),
    );
  }
  protected cambiar(evento: CambioListado): void {
    this.pagina.set(evento.page);
    this.cantidadFilas.set(evento.rows);
  }
  protected readonly columnas: ColumnaListado<MovimientoKardex>[] = [
    { tipo: 'texto', campo: 'tipo', encabezado: 'Tipo' },
    { tipo: 'cantidad', campo: 'cantidad', encabezado: 'Cantidad' },
    { tipo: 'texto', campo: 'motivo', encabezado: 'Motivo' },
    { tipo: 'texto', campo: 'sucursal_nombre', encabezado: 'Sucursal' },
    { tipo: 'texto', campo: 'usuario_nombre', encabezado: 'Usuario' },
    { tipo: 'fechaHora', campo: 'fecha', encabezado: 'Fecha' },
    {
      tipo: 'cantidad',
      campo: 'stock_resultante',
      encabezado: 'Stock resultante',
    },
  ];
}
