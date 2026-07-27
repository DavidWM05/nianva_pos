import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RecordTabConfig, RecordTabsComponent } from '@nucleo/ui-shared';

import { CuponesListComponent } from '../cupones-list/cupones-list.component';
import { ReglasPrecioListComponent } from '../reglas-precio-list/reglas-precio-list.component';

/**
 * Dos pestañas (Reglas de precio / Cupones) para las DOS LISTAS, no dos
 * rutas separadas -- son dos catalogos del mismo dominio que un usuario
 * alterna a menudo mientras arma una promocion. Cada FILA si tiene su
 * propia vista de registro con URL profunda (/precios/reglas/:id,
 * /precios/cupones/:id -- ver ReglaPrecioDetalleComponent/
 * CuponDetalleComponent, punto 1 del reporte); solo las dos pantallas de
 * LISTADO comparten esta pagina con tabs, igual que Kardex/Variantes
 * comparten pestanas dentro de ProductoDetalleComponent. Se reutiliza
 * RecordTabsComponent (ya construido para las vistas de registro) en vez
 * de armar un tab-view nuevo -- el mismo patron de content-projection
 * por <ng-template> sirve igual aqui.
 */
@Component({
  selector: 'nucleo-precios',
  standalone: true,
  imports: [RecordTabsComponent, ReglasPrecioListComponent, CuponesListComponent],
  templateUrl: './precios.component.html',
  styleUrl: './precios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreciosComponent {
  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Reglas de precio', icon: 'pi pi-percentage' },
    { label: 'Cupones', icon: 'pi pi-ticket' },
  ];
}
