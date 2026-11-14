// Generador `ui-listado` (UI-09): crea una pantalla de listado con la composicion de la
// regla (ui-page-header, ui-filter-bar, ui-tabla, ui-empty) mas su servicio y sus tipos.
// No toca app.routes.ts ni el registro de navegacion: imprime los dos pasos que faltan.
//
//   pnpm nx g @nianva/generadores:ui-listado --entidad=cliente --plural=clientes \
//     --modulo=crm --clave=crm --endpoint=/clientes [--genero=f]
//
// Solo usa el `tree` que le pasa Nx (write/exists), sin @nx/devkit.

const pascal = (texto) => texto.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
const kebab = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function validar(opciones) {
  for (const campo of ['entidad', 'plural', 'modulo', 'clave']) {
    if (!kebab.test(opciones[campo] ?? '')) {
      throw new Error(`ui-listado: "${campo}" debe ir en kebab-case (por ejemplo "nota-credito").`);
    }
  }
  if (!/^\/[a-z0-9/-]+$/.test(opciones.endpoint ?? '')) {
    throw new Error('ui-listado: "endpoint" debe empezar con "/" (por ejemplo "/clientes").');
  }
  if (opciones.genero !== undefined && !['m', 'f'].includes(opciones.genero)) {
    throw new Error('ui-listado: "genero" es "m" o "f".');
  }
}

function archivos(o) {
  const Entidad = pascal(o.entidad);
  const Plural = pascal(o.plural);
  const objeto = o.entidad.replace(/-/g, ' ');
  const raizModulo = `apps/pos/src/app/modules/${o.modulo}`;
  const carpeta = `${raizModulo}/pages/${o.plural}-listado`;
  const base = `${carpeta}/${o.plural}-listado.component`;

  return {
    [`${raizModulo}/${o.entidad}.types.ts`]: `/** Fila del listado de ${o.plural}. Ajusta los campos al Resource del backend. */
export interface ${Entidad} {
  id: number;
  nombre: string;
  activo: boolean;
}
`,
    [`${raizModulo}/${o.entidad}-listado.service.ts`]: `import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { RespuestaListado } from '@nianva/ui-data';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { ${Entidad} } from './${o.entidad}.types';

/** Listado de ${o.plural} con el contrato de API-06 (page, rows, sort_field, sort_order, q). */
@Injectable({ providedIn: 'root' })
export class ${Entidad}ListadoService {
  private readonly http = inject(HttpClient);

  listar(parametros: Record<string, string | number>): Observable<RespuestaListado<${Entidad}>> {
    return this.http
      .get<RespuestaDe<'${o.endpoint}', 'get'>>(urlApi('${o.endpoint}'), { params: parametros })
      .pipe(map((respuesta) => respuesta as RespuestaListado<${Entidad}>));
  }
}
`,
    [`${base}.ts`]: `import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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

import { ${Entidad}ListadoService } from '../../${o.entidad}-listado.service';
import { ${Entidad} } from '../../${o.entidad}.types';

/**
 * Listado de ${o.plural} (UI-09), creado con el generador ui-listado. El detalle se abre
 * desde la accion Ver, nunca al hacer clic en la fila.
 */
@Component({
  selector: 'nucleo-${o.plural}-listado',
  standalone: true,
  imports: [PageHeaderComponent, PageComponent, FilterBarComponent, TablaComponent, BotonCrearComponent, CampoComponent],
  templateUrl: './${o.plural}-listado.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${Plural}ListadoComponent {
  private readonly servicio = inject(${Entidad}ListadoService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly columnas: ColumnaListado<${Entidad}>[] = [
    { tipo: 'principal', campo: 'nombre', encabezado: 'Nombre', ordenable: true },
    {
      tipo: 'acciones',
      acciones: (fila) => [{ tipo: 'ver' }, { tipo: 'editar' }, { tipo: 'estado', activo: fila.activo }],
    },
  ];

  protected readonly filas = signal<${Entidad}[]>([]);
  protected readonly meta = signal<MetaListado | null>(null);
  protected readonly cargando = signal(false);
  protected readonly fallo = signal(false);
  protected readonly busqueda = signal('');
  protected readonly hayFiltros = computed(() => this.busqueda().trim() !== '');
  protected readonly esInactiva = (fila: ${Entidad}) => !fila.activo;

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
        this.meta.set(respuesta.meta);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.fallo.set(true);
      },
    });
  }

  protected ejecutar(evento: { fila: ${Entidad}; accion: AccionEmitida }): void {
    if (evento.accion.tipo === 'ver' || evento.accion.tipo === 'editar') {
      void this.router.navigate([evento.fila.id], { relativeTo: this.ruta });
    }
  }
}
`,
    [`${base}.html`]: `<ui-page-header clave="${o.clave}">
  <ui-btn-crear acciones objeto="${objeto}"${o.genero === 'f' ? ' genero="f"' : ''} [ruta]="['nuevo']" />
</ui-page-header>

<ui-page [estado]="fallo() ? 'error' : 'listo'" forma="listado" (reintentar)="cargar()">
  <ui-filter-bar [meta]="meta()" [hayFiltros]="hayFiltros()" (limpiar)="limpiar()">
    <ui-campo #campoBuscar etiqueta="Buscar">
      <input
        #buscador
        [id]="campoBuscar.controlId()"
        type="search"
        placeholder="Buscar"
        [value]="busqueda()"
        (keyup.enter)="buscar(buscador.value)"
      />
    </ui-campo>
  </ui-filter-bar>

  <ui-tabla
    [columnas]="columnas"
    [filas]="filas()"
    [meta]="meta()"
    [cargando]="cargando()"
    [filaInactiva]="esInactiva"
    mensajeVacio="No hay ${o.plural.replace(/-/g, ' ')} que coincidan con la búsqueda."
    (cambio)="alCambiar($event)"
    (accion)="ejecutar($event)"
  />
</ui-page>
`,
    [`${base}.spec.ts`]: `import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { REGISTRO_NAVEGACION } from '@nianva/ui-layout';
import { Subject, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ${Entidad}ListadoService } from '../../${o.entidad}-listado.service';
import { ${Plural}ListadoComponent } from './${o.plural}-listado.component';

const respuesta = {
  data: [{ id: 1, nombre: 'Primero', activo: true }],
  meta: { total: 1, page: 1, rows: 25, filtros_aplicados: {}, permisos: {} },
};

describe('${Plural}ListadoComponent', () => {
  let listar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listar = vi.fn(() => of(respuesta));
    TestBed.configureTestingModule({
      imports: [${Plural}ListadoComponent],
      providers: [
        provideRouter([]),
        { provide: ${Entidad}ListadoService, useValue: { listar } },
        { provide: REGISTRO_NAVEGACION, useValue: [{ clave: '${o.clave}', ruta: '${o.modulo}', nombre: '${Plural}', icono: 'pi pi-list' }] },
      ],
    });
  });

  function crear() {
    const fixture = TestBed.createComponent(${Plural}ListadoComponent);
    fixture.detectChanges();

    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('carga la primera pagina al iniciar', () => {
    const { el } = crear();

    expect(listar).toHaveBeenCalledWith({ page: 1, rows: 25 });
    expect(el.textContent).toContain('Primero');
  });

  it('busca desde la primera pagina con q', () => {
    const { fixture } = crear();

    fixture.componentInstance['buscar']('abc');

    expect(listar).toHaveBeenLastCalledWith({ page: 1, rows: 25, q: 'abc' });
  });

  it('si la carga falla, muestra el error con Reintentar', () => {
    const fallo = new Subject<never>();
    listar.mockReturnValueOnce(fallo);
    const { fixture, el } = crear();

    fallo.error(new Error('500'));
    fixture.detectChanges();

    expect(el.querySelector('[role="alert"]')).not.toBeNull();
  });
});
`,
  };
}

function siguientesPasos(o) {
  const Plural = pascal(o.plural);
  return [
    '',
    'ui-listado: faltan dos pasos a mano.',
    `  1. Ruta en app.routes.ts: { path: '${o.modulo}', loadComponent: () => import('./modules/${o.modulo}/pages/${o.plural}-listado/${o.plural}-listado.component').then((m) => m.${Plural}ListadoComponent) }`,
    `  2. Entrada en NUCLEO_NAV_GROUPS (modules.config.ts) con key '${o.clave}' y path '${o.modulo}'.`,
    '  3. `pnpm nx sync`, si es la primera pantalla de la app que usa ui-data o ui-actions (referencias de tsconfig).',
    '  Ajusta los campos de la entidad y las columnas al Resource del backend.',
  ].join('\n');
}

module.exports = async function generarUiListado(tree, opciones) {
  validar(opciones);
  const nuevos = archivos(opciones);

  const existentes = Object.keys(nuevos).filter((ruta) => tree.exists(ruta));
  if (existentes.length > 0) {
    throw new Error(`ui-listado: estos archivos ya existen y no se sobrescriben:\n  ${existentes.join('\n  ')}`);
  }

  for (const [ruta, contenido] of Object.entries(nuevos)) {
    tree.write(ruta, contenido);
  }

  return () => console.log(siguientesPasos(opciones));
};

module.exports.archivos = archivos;
module.exports.validar = validar;
