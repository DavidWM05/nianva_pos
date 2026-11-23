import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ExportacionReportesService, type EndpointExportar } from '@nianva/domain-nucleo';
import type { CambioListado, MetaListado } from '@nianva/ui-data';
import { ToastService } from '@nianva/ui-feedback';
import type { EstadoReporte } from '@nianva/ui-report';
import { esErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { type Observable, type Subscription, finalize } from 'rxjs';


type PaginaReporte = Pick<CambioListado, 'page' | 'rows'>;
export class ConsultaReporte<Respuesta extends { meta: MetaListado }> {
  private readonly destroyRef = inject(DestroyRef);
  private readonly exportaciones = inject(ExportacionReportesService);
  private readonly documento = inject(DOCUMENT);
  private readonly toast = inject(ToastService);
  private solicitud?: Subscription;
  private pagina: PaginaReporte = { page: 1, rows: 25 };

  readonly respuesta = signal<Respuesta | null>(null);
  readonly error = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly exportando = signal(false);
  readonly puedeExportar = computed(() =>
    !this.cargando() && !this.error() && this.respuesta()?.meta.permisos['exportar'] === true,
  );
  readonly estado = computed<EstadoReporte>(() => {
    const respuesta = this.respuesta();
    if (this.error()) {
      return 'error';
    }
    if (!respuesta) {
      return 'cargando';
    }
    return respuesta.meta.total > 0 ? 'listo' : 'vacio';
  });

  constructor(
    private readonly consultar: (pagina: PaginaReporte) => Observable<Respuesta>,
    private readonly endpoint: EndpointExportar,
    private readonly filtrosCsv: () => Record<string, string | number> = () => ({}),
  ) {}

  cargar(): void {
    this.solicitud?.unsubscribe();
    this.error.set(null);
    this.cargando.set(true);
    this.solicitud = this.consultar(this.pagina).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (respuesta) => {
        this.respuesta.set(respuesta);
        this.cargando.set(false);
      },
      error: (error: unknown) => {
        this.error.set(mensajeError(error, 'No se pudo cargar el reporte.'));
        this.cargando.set(false);
      },
    });
  }

  reiniciar(): void {
    this.pagina = { page: 1, rows: this.pagina.rows };
    this.cargar();
  }

  paginar({ page, rows }: CambioListado): void {
    if (page === this.pagina.page && rows === this.pagina.rows) {
      return;
    }
    this.pagina = { page, rows };
    this.cargar();
  }

  exportar(): void {
    if (!this.puedeExportar() || this.exportando()) {
      return;
    }
    this.exportando.set(true);
    this.exportaciones.descargar(this.endpoint, this.filtrosCsv()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.exportando.set(false)),
    ).subscribe({
      next: (respuesta) => this.descargar(respuesta),
      error: (error: unknown) => { void this.notificarError(error); },
    });
  }

  private descargar(respuesta: HttpResponse<Blob>): void {
    if (respuesta.body === null) {
      this.toast.error('No se recibió el archivo del reporte.');
      return;
    }

    const url = URL.createObjectURL(respuesta.body);
    const enlace = this.documento.createElement('a');
    const cabecera = respuesta.headers.get('Content-Disposition') ?? '';
    const nombre = /filename="?([a-z0-9-]+\.csv)"?/i.exec(cabecera)?.[1];
    enlace.href = url;
    enlace.download = nombre ?? this.endpoint.split('/')[1] + '.csv';
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private async notificarError(error: unknown): Promise<void> {
    let detalle: unknown = error;
    if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
      try {
        detalle = new HttpErrorResponse({ ...error, url: error.url ?? undefined, error: JSON.parse(await error.error.text()) });
      } catch {
        // Un error de red o proxy puede carecer de cuerpo JSON.
      }
    }
    this.toast.error(esErrorNegocio(detalle, 'reporte_exportacion_limite')
      ? 'El reporte supera las 10 000 filas. Acota el rango si el reporte admite filtros.'
      : mensajeError(detalle, 'No se pudo exportar el reporte.'));
  }
}
