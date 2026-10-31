import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { StatusBadgeComponent } from '@nianva/ui-shared';

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
  imports: [DatePipe, StatusBadgeComponent],
  templateUrl: './kardex-list.component.html',
  styleUrl: './kardex-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KardexListComponent {
  @Input() movimientos: MovimientoKardex[] = [];
  @Input() cargando = false;
}
