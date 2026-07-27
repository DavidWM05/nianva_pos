import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { ConfirmDialogService, StatusBadgeComponent } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';

import { ProductoVariante } from '../producto.types';

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
  imports: [StatusBadgeComponent, Button],
  templateUrl: './variantes-list.component.html',
  styleUrl: './variantes-list.component.scss',
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
