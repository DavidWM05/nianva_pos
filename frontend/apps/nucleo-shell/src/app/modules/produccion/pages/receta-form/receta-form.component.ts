import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nucleo/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { forkJoin } from 'rxjs';

import { BUSCADOR_INSUMO, BUSCADOR_PRODUCTO, BUSCADOR_UNIDAD_MEDIDA, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { RecetaService } from '../../receta.service';
import { RecetaIngredientePayload } from '../../receta.types';

interface IngredienteEnLista extends RecetaIngredientePayload {
  etiquetaInsumo: string;
  etiquetaUnidad: string;
}

/**
 * Solo "crear" -- ProduccionController no tiene recetasShow()/recetasUpdate().
 * variante_id se elige en modo cascada (producto -> variante) via
 * EntidadSelectorComponent, mismo mecanismo que LineasProductoComponent.
 */
@Component({
  selector: 'nucleo-receta-form',
  standalone: true,
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, Button, InputText, Textarea],
  templateUrl: './receta-form.component.html',
  styleUrl: './receta-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecetaFormComponent {
  private readonly recetaService = inject(RecetaService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly buscadorProducto = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVarianteDeProducto = inject(BUSCADOR_VARIANTE_DE_PRODUCTO);
  protected readonly buscadorInsumo = inject(BUSCADOR_INSUMO);
  protected readonly buscadorUnidadMedida = inject(BUSCADOR_UNIDAD_MEDIDA);

  protected readonly productoId = signal<number | null>(null);
  protected readonly varianteId = signal<number | null>(null);

  protected readonly nombre = signal('');
  protected readonly descripcion = signal('');
  protected readonly instrucciones = signal('');
  protected readonly rendimiento = signal<number | null>(1);

  // -- Ingrediente en captura --
  protected readonly insumoStagingId = signal<number | null>(null);
  protected readonly unidadMedidaStagingId = signal<number | null>(null);
  protected readonly cantidadStaging = signal<number | null>(null);

  protected readonly ingredientes = signal<IngredienteEnLista[]>([]);
  protected readonly guardando = signal(false);

  onVarianteSeleccionada(id: number | null): void {
    this.varianteId.set(id);
  }

  agregarIngrediente(): void {
    const insumoId = this.insumoStagingId();
    const unidadMedidaId = this.unidadMedidaStagingId();
    const cantidad = this.cantidadStaging();
    if (insumoId === null || unidadMedidaId === null || !cantidad || cantidad <= 0) return;

    forkJoin({
      insumo: this.buscadorInsumo.obtener(insumoId),
      unidad: this.buscadorUnidadMedida.obtener(unidadMedidaId),
    }).subscribe(({ insumo, unidad }) => {
      this.ingredientes.update((actuales) => [
        ...actuales,
        { insumo_id: insumoId, cantidad, unidad_medida_id: unidadMedidaId, etiquetaInsumo: insumo.nombre, etiquetaUnidad: unidad.nombre },
      ]);
      this.insumoStagingId.set(null);
      this.unidadMedidaStagingId.set(null);
      this.cantidadStaging.set(null);
    });
  }

  quitarIngrediente(indice: number): void {
    this.ingredientes.update((actuales) => actuales.filter((_, i) => i !== indice));
  }

  crear(): void {
    const varianteId = this.varianteId();
    const nombre = this.nombre().trim();
    if (varianteId === null || !nombre || this.ingredientes().length === 0) {
      this.toast.warn('Selecciona una variante, un nombre y al menos un ingrediente.');

      return;
    }

    this.guardando.set(true);

    this.recetaService
      .crear({
        variante_id: varianteId,
        nombre,
        rendimiento: this.rendimiento() ?? 1,
        descripcion: this.descripcion().trim() || null,
        instrucciones: this.instrucciones().trim() || null,
        ingredientes: this.ingredientes().map(({ insumo_id, cantidad, unidad_medida_id }) => ({ insumo_id, cantidad, unidad_medida_id })),
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.toast.success('Receta creada.');
          this.router.navigate(['/produccion/recetas']);
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo crear la receta.');
        },
      });
  }
}
