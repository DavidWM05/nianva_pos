import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nianva/ui-shared';

import { ReglaPrecioFormComponent } from '../../regla-precio-form/regla-precio-form.component';
import { ReglaPrecioFormPayload, ReglaPrecioService } from '../../regla-precio.service';
import { ReglaPrecio } from '../../regla-precio.types';

/**
 * Vista de registro de Regla de precio -- General (formulario, `readonly`
 * sin permiso de editar, ver el reporte del punto 1) + Auditoria
 * (@defer on viewport). Mismo patron que ProductoDetalleComponent/
 * ClienteDetalleComponent.
 */
@Component({
  selector: 'nucleo-regla-precio-detalle',
  standalone: true,
  imports: [RecordTabsComponent, ReglaPrecioFormComponent, AuditLogViewerComponent],
  templateUrl: './regla-precio-detalle.component.html',
  styleUrl: './regla-precio-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReglaPrecioDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reglaPrecioService = inject(ReglaPrecioService);
  private readonly toast = inject(ToastService);

  @ViewChild(ReglaPrecioFormComponent) private formulario?: ReglaPrecioFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-percentage' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly regla = signal<ReglaPrecio | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.reglaPrecioService.obtener(id).subscribe(({ regla, permisos }) => {
      this.regla.set(regla);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });
  }

  onGuardar(payload: ReglaPrecioFormPayload): void {
    const regla = this.regla();
    if (!regla) {
      return;
    }

    this.guardando.set(true);

    this.reglaPrecioService.actualizar(regla.id, payload).subscribe({
      next: (actualizada) => {
        this.regla.set(actualizada);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar la regla de precio.');
        }
      },
    });
  }
}
