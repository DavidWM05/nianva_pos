import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  BotonCrearComponent,
  AccionEmitida,
  AccionFila,
} from '@nianva/ui-actions';
import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
  parametrosListado,
} from '@nianva/ui-data';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { ConfirmDialogService } from '@nianva/ui-feedback';
import { CampoComponent } from '@nianva/ui-forms';

import { ListaPrecioListadoService } from '../../lista-precio-listado.service';
import { ListaPrecio } from '../../lista-precio.types';

/**
 * Listado de listas-precio (UI-09), creado con el generador ui-listado. El detalle se abre
 * desde la accion Ver, nunca al hacer clic en la fila.
 */
@Component({
  selector: 'nucleo-listas-precio-listado',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PageComponent,
    FilterBarComponent,
    TablaComponent,
    BotonCrearComponent,
    CampoComponent,
  ],
  templateUrl: './listas-precio-listado.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListasPrecioListadoComponent {
  private readonly servicio = inject(ListaPrecioListadoService);
  private readonly router = inject(Router);
  private readonly confirmar = inject(ConfirmDialogService);

  protected readonly columnas: ColumnaListado<ListaPrecio>[] = [
    {
      tipo: 'principal',
      campo: 'nombre',
      encabezado: 'Nombre',
      ordenable: true,
    },
    {
      tipo: 'acciones',
      acciones: (fila) => {
        const acciones: AccionFila[] = [{ tipo: 'ver' }];
        if (this.meta()?.permisos?.['editar'])
          acciones.push({ tipo: 'editar' });
        if (
          fila.activo
            ? this.meta()?.permisos?.['eliminar']
            : this.meta()?.permisos?.['editar']
        )
          acciones.push({ tipo: 'estado', activo: fila.activo });
        return acciones;
      },
    },
  ];

  protected readonly filas = signal<ListaPrecio[]>([]);
  protected readonly meta = signal<MetaListado | null>(null);
  protected readonly cargando = signal(false);
  protected readonly fallo = signal(false);
  protected readonly busqueda = signal('');
  protected readonly hayFiltros = computed(() => this.busqueda().trim() !== '');
  protected readonly esInactiva = (fila: ListaPrecio) => !fila.activo;

  private cambio: CambioListado = {
    page: 1,
    rows: 25,
    sortField: null,
    sortOrder: null,
  };

  constructor() {
    this.cargar();
  }

  /** ui-tabla avisa al paginar u ordenar; la carga inicial ya se hizo en el constructor. */
  protected alCambiar(cambio: CambioListado): void {
    const igual =
      cambio.page === this.cambio.page &&
      cambio.rows === this.cambio.rows &&
      cambio.sortField === this.cambio.sortField &&
      cambio.sortOrder === this.cambio.sortOrder;

    if (igual && this.meta() !== null) {
      return;
    }

    this.cambio = cambio;
    this.cargar();
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.cambio = { ...this.cambio, page: 1 };
    this.cargar();
  }

  protected limpiar(): void {
    this.buscar('');
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.fallo.set(false);

    this.servicio
      .listar(parametrosListado(this.cambio, { q: this.busqueda() }))
      .subscribe({
        next: (respuesta) => {
          this.filas.set(respuesta.data);
          this.meta.set(respuesta.meta);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.fallo.set(true);
        },
      });
  }

  protected async ejecutar(evento: {
    fila: ListaPrecio;
    accion: AccionEmitida;
  }): Promise<void> {
    if (evento.accion.tipo === 'ver' || evento.accion.tipo === 'editar') {
      void this.router.navigate(['/precios/listas', evento.fila.id]);
    }
    if (
      evento.accion.tipo === 'estado' &&
      (await this.confirmar.confirm({
        header: evento.fila.activo ? 'Desactivar lista' : 'Activar lista',
        message: '¿Confirmas el cambio de estado de esta lista?',
        severity: 'info',
      }))
    ) {
      const peticion = evento.fila.activo
        ? this.servicio.desactivar(evento.fila.id)
        : this.servicio.actualizar(evento.fila.id, {
            nombre: evento.fila.nombre,
            activo: true,
          });
      peticion.subscribe({
        next: () => this.cargar(),
        error: () => this.fallo.set(true),
      });
    }
  }
}
