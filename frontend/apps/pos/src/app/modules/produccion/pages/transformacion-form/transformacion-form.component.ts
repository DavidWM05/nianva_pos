import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EntidadSelectorComponent, ToastService } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { BUSCADOR_PRODUCTO, BUSCADOR_VARIANTE_DE_PRODUCTO } from '../../../../core/buscadores-entidad.tokens';
import { TransformacionService } from '../../transformacion.service';
import { TransformacionProducto } from '../../transformacion.types';

/**
 * Solo alta -- TransformacionResource no tiene show() propio, asi que tras
 * crear se muestra la confirmacion inline en esta misma pantalla en vez de
 * navegar a un detalle que no existe. La lista vive en
 * TransformacionesListComponent (ajuste 9: GET /transformaciones).
 */
@Component({
  selector: 'nucleo-transformacion-form',
  standalone: true,
  imports: [FormsModule, RouterLink, EntidadSelectorComponent, Button, InputText, Textarea],
  templateUrl: './transformacion-form.component.html',
  styleUrl: './transformacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransformacionFormComponent {
  private readonly transformacionService = inject(TransformacionService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorProductoOrigen = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVarianteOrigen = inject(BUSCADOR_VARIANTE_DE_PRODUCTO);
  protected readonly buscadorProductoDestino = inject(BUSCADOR_PRODUCTO);
  protected readonly buscadorVarianteDestino = inject(BUSCADOR_VARIANTE_DE_PRODUCTO);

  protected readonly productoOrigenId = signal<number | null>(null);
  protected readonly varianteOrigenId = signal<number | null>(null);
  protected readonly cantidadOrigen = signal<number | null>(null);

  protected readonly productoDestinoId = signal<number | null>(null);
  protected readonly varianteDestinoId = signal<number | null>(null);
  protected readonly cantidadDestino = signal<number | null>(null);

  protected readonly notas = signal('');
  protected readonly guardando = signal(false);
  protected readonly ultimaCreada = signal<TransformacionProducto | null>(null);

  crear(): void {
    const varianteOrigenId = this.varianteOrigenId();
    const varianteDestinoId = this.varianteDestinoId();
    const cantidadOrigen = this.cantidadOrigen();
    const cantidadDestino = this.cantidadDestino();
    if (varianteOrigenId === null || varianteDestinoId === null || !cantidadOrigen || !cantidadDestino) {
      this.toast.warn('Selecciona variante de origen, de destino y ambas cantidades.');

      return;
    }

    this.guardando.set(true);

    this.transformacionService
      .crear({
        variante_origen_id: varianteOrigenId,
        variante_destino_id: varianteDestinoId,
        cantidad_origen: cantidadOrigen,
        cantidad_destino: cantidadDestino,
        notas: this.notas().trim() || null,
      })
      .subscribe({
        next: (transformacion) => {
          this.guardando.set(false);
          this.ultimaCreada.set(transformacion);
          this.toast.success('Transformación registrada.');
          this.reiniciar();
        },
        error: (error: HttpErrorResponse) => {
          this.guardando.set(false);
          const cuerpo = error.error as { message?: string } | undefined;
          this.toast.error(cuerpo?.message ?? 'No se pudo registrar la transformación.');
        },
      });
  }

  private reiniciar(): void {
    this.productoOrigenId.set(null);
    this.varianteOrigenId.set(null);
    this.cantidadOrigen.set(null);
    this.productoDestinoId.set(null);
    this.varianteDestinoId.set(null);
    this.cantidadDestino.set(null);
    this.notas.set('');
  }
}
