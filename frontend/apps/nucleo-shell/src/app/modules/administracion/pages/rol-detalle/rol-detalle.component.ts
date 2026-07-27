import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nucleo/ui-shared';

import { RolFormComponent } from '../../rol-form/rol-form.component';
import { RolFormPayload, RolService } from '../../rol.service';
import { Rol } from '../../rol.types';

/**
 * Vista de registro de Rol -- General (formulario, `readonly` si falta
 * el permiso de editar O si es un rol de sistema -- admin/vendedor,
 * ver el reporte) + Auditoria (@defer on viewport). Mismo patron que
 * ClienteDetalleComponent (es_sistema).
 */
@Component({
  selector: 'nucleo-rol-detalle',
  standalone: true,
  imports: [RecordTabsComponent, RolFormComponent, AuditLogViewerComponent],
  templateUrl: './rol-detalle.component.html',
  styleUrl: './rol-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rolService = inject(RolService);
  private readonly toast = inject(ToastService);

  @ViewChild(RolFormComponent) private formulario?: RolFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-shield' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly rol = signal<Rol | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.rolService.obtener(id).subscribe(({ rol, permisos }) => {
      this.rol.set(rol);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });
  }

  onGuardar(payload: RolFormPayload): void {
    const rol = this.rol();
    if (!rol) {
      return;
    }

    this.guardando.set(true);

    this.rolService.actualizar(rol.id, payload).subscribe({
      next: (actualizado) => {
        this.rol.set(actualizado);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el rol.');
        }
      },
    });
  }
}
