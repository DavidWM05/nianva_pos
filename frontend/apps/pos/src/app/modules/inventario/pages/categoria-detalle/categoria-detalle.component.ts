import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { AlertComponent, SkeletonComponent } from '@nianva/ui-feedback';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AuditLogViewerComponent,
  RecordTabConfig,
  RecordTabsComponent,
  ToastService,
} from '@nianva/ui-shared';

import { CategoriaFormComponent } from '../../categoria-form/categoria-form.component';
import {
  CategoriaFormPayload,
  CategoriaService,
} from '../../categoria.service';
import { Categoria } from '../../categoria.types';

/**
 * Vista de registro de Categoria -- General (formulario, `readonly` sin
 * permiso de editar) + Auditoria (@defer on viewport). Mismo patron que
 * ReglaPrecioDetalleComponent/CuponDetalleComponent (Fase B).
 */
@Component({
  selector: 'nucleo-categoria-detalle',
  standalone: true,
  imports: [
    PageComponent,
    PageHeaderComponent,
    AlertComponent,
    SkeletonComponent,
    RecordTabsComponent,
    CategoriaFormComponent,
    AuditLogViewerComponent,
  ],
  templateUrl: './categoria-detalle.component.html',
  styleUrl: './categoria-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly categoriaService = inject(CategoriaService);
  private readonly toast = inject(ToastService);

  @ViewChild(CategoriaFormComponent)
  private formulario?: CategoriaFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-tag' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly categoria = signal<Categoria | null>(null);
  protected readonly puedeEditar = signal(false);
  protected readonly cargando = signal(true);
  protected readonly error = signal(false);

  protected readonly guardando = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.cargar(id);
  }

  reintentar(): void {
    this.cargar(Number(this.route.snapshot.paramMap.get('id')));
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.error.set(false);
    this.categoriaService.obtener(id).subscribe({
      next: ({ categoria, permisos }) => {
        this.categoria.set(categoria);
        this.puedeEditar.set(permisos.editar);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  onGuardar(payload: CategoriaFormPayload): void {
    const categoria = this.categoria();
    if (!categoria) {
      return;
    }

    this.guardando.set(true);

    this.categoriaService.actualizar(categoria.id, payload).subscribe({
      next: (actualizada) => {
        this.categoria.set(actualizada);
        this.guardando.set(false);
        this.toast.success('Cambios guardados.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar la categoría.');
        }
      },
    });
  }
}
