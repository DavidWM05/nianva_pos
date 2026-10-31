import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent, ToastService } from '@nianva/ui-shared';

import { DepartamentoFormComponent } from '../../departamento-form/departamento-form.component';
import { DepartamentoFormPayload, DepartamentoService } from '../../departamento.service';
import { Departamento } from '../../departamento.types';

/**
 * Vista de registro de Departamento -- General (formulario, `readonly`
 * sin permiso de editar) + Auditoria (@defer on viewport). Mismo patron
 * que CategoriaDetalleComponent.
 */
@Component({
  selector: 'nucleo-departamento-detalle',
  standalone: true,
  imports: [RecordTabsComponent, DepartamentoFormComponent, AuditLogViewerComponent],
  templateUrl: './departamento-detalle.component.html',
  styleUrl: './departamento-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartamentoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly departamentoService = inject(DepartamentoService);
  private readonly toast = inject(ToastService);

  @ViewChild(DepartamentoFormComponent) private formulario?: DepartamentoFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-building' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly departamento = signal<Departamento | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);

  protected readonly guardando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.departamentoService.obtener(id).subscribe(({ departamento, permisos }) => {
      this.departamento.set(departamento);
      this.puedeEditar.set(permisos.editar);
      this.cargando.set(false);
    });
  }

  onGuardar(payload: DepartamentoFormPayload): void {
    const departamento = this.departamento();
    if (!departamento) {
      return;
    }

    this.guardando.set(true);

    this.departamentoService.actualizar(departamento.id, payload).subscribe({
      next: (actualizado) => {
        this.departamento.set(actualizado);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar el departamento.');
        }
      },
    });
  }
}
