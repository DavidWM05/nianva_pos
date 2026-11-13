import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { EntidadSelectorComponent, ToastService } from '@nianva/ui-shared';
import { CampoComponent, BtnEnviarComponent } from '@nianva/ui-forms';
import { PageHeaderComponent, PageComponent } from '@nianva/ui-layout';
import { BUSCADOR_UNIDAD_MEDIDA } from '../../../../core/buscadores-entidad.tokens';
import { InsumoService } from '../../insumo.service';

@Component({
  selector: 'nucleo-insumo-form',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    MatButton,
    MatInput,
    EntidadSelectorComponent,
    CampoComponent,
    BtnEnviarComponent,
    PageHeaderComponent,
    PageComponent,
  ],
  templateUrl: './insumo-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsumoFormComponent {
  private readonly insumoService = inject(InsumoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly buscadorUnidadMedida = inject(BUSCADOR_UNIDAD_MEDIDA);
  // -- Nuevo insumo --
  protected readonly nombre = signal('');
  protected readonly sku = signal('');
  protected readonly unidadMedidaId = signal<number | null>(null);
  protected readonly costo = signal<number | null>(null);
  protected readonly stockMinimo = signal<number | null>(null);
  protected readonly guardando = signal(false);

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

          this.toast.success('Insumo registrado.');
          void this.router.navigate(['/produccion/insumos']);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(
            cuerpo?.message ?? 'No se pudo registrar el insumo.',
          );
        },
      });
  }
}
