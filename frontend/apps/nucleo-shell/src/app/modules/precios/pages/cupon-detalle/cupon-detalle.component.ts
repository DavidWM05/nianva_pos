import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nucleo/ui-shared';

import { CuponFormComponent } from '../../cupon-form/cupon-form.component';
import { CuponFormPayload, CuponService } from '../../cupon.service';
import { Cupon } from '../../cupon.types';

/**
 * Vista de registro de Cupon -- General (formulario, `readonly` sin
 * permiso de editar) + Auditoria (@defer on viewport). Mismo patron que
 * ReglaPrecioDetalleComponent.
 */
@Component({
  selector: 'nucleo-cupon-detalle',
  standalone: true,
  imports: [RecordTabsComponent, CuponFormComponent, AuditLogViewerComponent],
  templateUrl: './cupon-detalle.component.html',
  styleUrl: './cupon-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuponDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cuponService = inject(CuponService);
  private readonly toast = inject(ToastService);

  @ViewChild(CuponFormComponent) private formulario?: CuponFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-ticket' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cupon = signal<Cupon | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.cuponService.obtener(id).subscribe(({ cupon, permisos }) => {
      this.cupon.set(cupon);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });
  }

  onGuardar(payload: CuponFormPayload): void {
    const cupon = this.cupon();
    if (!cupon) {
      return;
    }

    this.guardando.set(true);

    this.cuponService.actualizar(cupon.id, payload).subscribe({
      next: (actualizado) => {
        this.cupon.set(actualizado);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el cupón.');
        }
      },
    });
  }
}
