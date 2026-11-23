const kebab = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

module.exports = (tree, opciones) => {
  for (const campo of ['nombre', 'modulo', 'clave']) {
    if (!kebab.test(opciones[campo] ?? '')) {
      throw new Error('ui-reporte: ' + campo + ' debe ir en kebab-case.');
    }
  }

  if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(opciones.endpoint ?? '')) {
    throw new Error('ui-reporte: endpoint debe ser una ruta de la API con barra inicial.');
  }

  const { nombre, modulo, clave, endpoint } = opciones;
  const nombreClase = nombre.split('-').map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1)).join('');
  const base = 'apps/pos/src/app/modules/' + modulo + '/pages/' + nombre + '/' + nombre + '.component';

  const archivos = {
    [base + '.ts']: [
      "import { HttpClient } from '@angular/common/http';",
      "import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';",
      "import { takeUntilDestroyed } from '@angular/core/rxjs-interop';",
      "import { DestroyRef } from '@angular/core';",
      "import type { RespuestaDe } from '@nianva/api-contrato';",
      "import { TablaComponent, type CambioListado, type ColumnaListado } from '@nianva/ui-data';",
      "import { mensajeError } from '@nianva/ui-shared';",
      "import { urlApi } from '../../../../core/api-config';",
      "import { ReportComponent, type EstadoReporte } from '@nianva/ui-report';",
      '',
      'type Respuesta = RespuestaDe<' + JSON.stringify(endpoint) + ", 'get'>;",
      "type Datos = Respuesta['data'];",
      "type Fila = Datos['detalle'][number];",
      '',
      '// Declara aquí los campos de la capa de métricas que consume el reporte.',
      'export const metricas' + nombreClase + ' = [] as const satisfies readonly (keyof Datos)[];',
      '',
      '@Component({',
      "  selector: 'nucleo-" + nombre + "',",
      '  standalone: true,',
      '  imports: [ReportComponent, TablaComponent],',
      "  templateUrl: './" + nombre + ".component.html',",
      '  changeDetection: ChangeDetectionStrategy.OnPush,',
      '})',
      'export class ' + nombreClase + 'Component {',
      '  private readonly http = inject(HttpClient);',
      '  private readonly destroyRef = inject(DestroyRef);',
      '  protected readonly respuesta = signal<Respuesta | null>(null);',
      '  protected readonly error = signal<string | null>(null);',
      '  protected readonly columnas: ColumnaListado<Fila>[] = [];',
      "  protected readonly estado = computed<EstadoReporte>(() => this.error() ? 'error' : !this.respuesta() ? 'cargando' : this.respuesta()?.meta.total ? 'listo' : 'vacio');",
      '  private pagina = { page: 1, rows: 25 };',
      '',
      '  constructor() {',
      '    this.cargar();',
      '  }',
      '',
      '  protected paginar({ page, rows }: CambioListado): void {',
      '    if (page === this.pagina.page && rows === this.pagina.rows) {',
      '      return;',
      '    }',
      '    this.pagina = { page, rows };',
      '    this.cargar();',
      '  }',
      '',
      '  protected cargar(): void {',
      '    this.error.set(null);',
      '    this.respuesta.set(null);',
      '    this.http.get<Respuesta>(urlApi(' + JSON.stringify(endpoint) + '), { params: this.pagina })',
      '      .pipe(takeUntilDestroyed(this.destroyRef))',
      '      .subscribe({',
      '        next: (respuesta) => this.respuesta.set(respuesta),',
      "        error: (error) => this.error.set(mensajeError(error, 'No se pudo cargar el reporte.')),",
      '      });',
      '  }',
      '  protected readonly metricas = computed(() => metricas' + nombreClase + ');',
      '}',
      '',
    ].join('\n'),
    [base + '.html']: [
      '<ui-report clave="' + clave + '" [estado]="estado()" [mensajeError]="error() ?? \'\'" [puedeExportar]="false" (reintentar)="cargar()">',
      '  @if (respuesta(); as reporte) {',
      '    <ui-tabla detalle [columnas]="columnas" [filas]="reporte.data.detalle" [meta]="reporte.meta" (cambio)="paginar($event)" />',
      '  }',
      '</ui-report>',
      '',
    ].join('\n'),
  };

  for (const ruta of Object.keys(archivos)) {
    if (tree.exists(ruta)) {
      throw new Error('ui-reporte: ya existe ' + ruta);
    }
  }
  for (const [ruta, contenido] of Object.entries(archivos)) {
    tree.write(ruta, contenido);
  }

  return () => console.log([
    '1. Agrega la ruta del reporte en app.routes.ts y su permiso de lectura.',
    '2. Registra la clave ' + clave + ' en la navegación.',
    '3. Declara las métricas y conecta el servicio tipado, filtros, ui-tabla y exportación autorizada.',
    '4. Ejecuta pnpm nx sync y las pruebas dirigidas.',
  ].join('\n'));
};
