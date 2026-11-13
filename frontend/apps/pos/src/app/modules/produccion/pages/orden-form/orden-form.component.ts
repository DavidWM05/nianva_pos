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
import {
  EntidadSelectorComponent,
  ToastService,
  mensajeError,
} from '@nianva/ui-shared';
import { CampoComponent, BtnEnviarComponent } from '@nianva/ui-forms';
import { PageHeaderComponent, PageComponent } from '@nianva/ui-layout';
import { BUSCADOR_RECETA } from '../../../../core/buscadores-entidad.tokens';
import { OrdenProduccionService } from '../../orden.service';

@Component({
  selector: 'nucleo-orden-form',
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
  templateUrl: './orden-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdenFormComponent {
  private readonly ordenService = inject(OrdenProduccionService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly buscadorReceta = inject(BUSCADOR_RECETA);
  // -- Nueva orden --
  protected readonly recetaId = signal<number | null>(null);
  protected readonly cantidadProgramada = signal<number | null>(null);
  protected readonly fechaProgramada = signal('');
  protected readonly notas = signal('');
  protected readonly guardando = signal(false);

  guardar(): void {
    const recetaId = this.recetaId();
    const cantidad = this.cantidadProgramada();
    if (recetaId === null || !cantidad || cantidad <= 0) return;

    this.guardando.set(true);

    this.ordenService
      .crear({
        receta_id: recetaId,
        cantidad_programada: cantidad,
        fecha_programada: this.fechaProgramada() || null,
        notas: this.notas().trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);

          this.toast.success('Orden de producción creada.');
          void this.router.navigate(['/produccion/ordenes']);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toast.error(
            mensajeError(error, 'No se pudo crear la orden de producción.'),
          );
        },
      });
  }
}
