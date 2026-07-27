import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';

import { ProductoFormComponent } from '../../producto-form/producto-form.component';
import { ProductoFormPayload, ProductoService } from '../../producto.service';

/**
 * Vista dedicada, no modal (ver el reporte del punto 1): producto es una
 * entidad raiz, igual que cliente/regla de precio/cupon -- el modal queda
 * reservado para sub-recursos anidados (variante dentro de producto,
 * abono dentro de apartado). Al guardar, navega al detalle recien creado
 * (mismo patron que ApartadoFormComponent).
 */
@Component({
  selector: 'nucleo-producto-crear',
  standalone: true,
  imports: [RouterLink, ProductoFormComponent],
  templateUrl: './producto-crear.component.html',
  styleUrl: './producto-crear.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoCrearComponent {
  private readonly productoService = inject(ProductoService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  @ViewChild(ProductoFormComponent) private formulario?: ProductoFormComponent;

  protected readonly guardando = signal(false);

  onGuardar(payload: ProductoFormPayload): void {
    this.guardando.set(true);

    this.productoService.crear(payload).subscribe({
      next: (producto) => {
        this.guardando.set(false);
        this.toast.success('Producto creado.');
        this.router.navigate(['/inventario/productos', producto.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo crear el producto.');
        }
      },
    });
  }
}
