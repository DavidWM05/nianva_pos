import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BotonCrearComponent, AccionEmitida } from '@nianva/ui-actions';
import {
  CambioListado,
  ColumnaListado,
  FilterBarComponent,
  MetaListado,
  TablaComponent,
  parametrosListado,
} from '@nianva/ui-data';
import { PageComponent, PageHeaderComponent } from '@nianva/ui-layout';
import { CampoComponent } from '@nianva/ui-forms';

import { Atributo, AtributoService } from '@nianva/domain-inventario';

/**
 * Listado de atributos (UI-09), creado con el generador ui-listado. El detalle se abre
 * desde la accion Ver, nunca al hacer clic en la fila.
 */
@Component({
  selector: 'nucleo-atributos-listado',
  standalone: true,
  imports: [PageHeaderComponent, PageComponent, FilterBarComponent, TablaComponent, BotonCrearComponent, CampoComponent],
  templateUrl: './atributos-listado.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtributosListadoComponent {
  private readonly servicio = inject(AtributoService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly columnas: ColumnaListado<Atributo>[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true },
    { tipo: 'texto', campo: 'orden', encabezado: 'Orden', ordenable: true },
    {
      tipo: 'acciones',
      acciones: () => (this.meta()?.permisos?.['editar'] ? [{ tipo: 'ver' }, { tipo: 'editar' }] : [{ tipo: 'ver' }]),
    },
  ];

  protected readonly filas = signal<Atributo[]>([]);
  protected readonly meta = signal<MetaListado | null>(null);
  protected readonly cargando = signal(false);
  protected readonly fallo = signal(false);
  protected readonly busqueda = signal('');
  protected readonly hayFiltros = computed(() => this.busqueda().trim() !== '');

  private cambio: CambioListado = { page: 1, rows: 25, sortField: null, sortOrder: null };

  constructor() {
    this.cargar();
  }

  /** ui-tabla avisa al paginar u ordenar; la carga inicial ya se hizo en el constructor. */
  protected alCambiar(cambio: CambioListado): void {
    const igual = cambio.page === this.cambio.page
      && cambio.rows === this.cambio.rows
      && cambio.sortField === this.cambio.sortField
      && cambio.sortOrder === this.cambio.sortOrder;

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

    this.servicio.listar(parametrosListado(this.cambio, { q: this.busqueda() })).subscribe({
      next: (respuesta) => {
        this.filas.set(respuesta.data);
        this.meta.set(respuesta.meta as MetaListado);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.fallo.set(true);
      },
    });
  }

  protected ejecutar(evento: { fila: Atributo; accion: AccionEmitida }): void {
    if (evento.accion.tipo === 'ver' || evento.accion.tipo === 'editar') {
      void this.router.navigate([evento.fila.id], { relativeTo: this.ruta });
    }
  }
}
