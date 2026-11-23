import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { EmptyComponent, TablaComponent, type ColumnaListado } from '@nianva/ui-data';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { KpiComponent, SkeletonComponent } from '@nianva/ui-feedback';
import { CantidadPipe, DineroPipe, FechaPipe } from '@nianva/ui-format';
import { DatosComponent, PageComponent, PageHeaderComponent, SectionComponent, TarjetaComponent, TarjetasComponent } from '@nianva/ui-layout';

import { CajaActual, CajaService } from '@nianva/domain-tpv';
import { InicioResumenMetricas, InicioService, type VarianteRankingInicio } from '@nianva/domain-nucleo';
import { GraficaSerieComponent } from '@nianva/ui-report';
import { mensajeError } from '@nianva/ui-shared';

import { RentabilidadComponent } from '../../../../core/rentabilidad/rentabilidad.component';

/**
 * Reemplaza el placeholder de "Núcleo" (ver el reporte de Fase C, punto
 * 4). Junta datos de Tpv (caja) e Inicio (ventas del dia + apartados por
 * vencer, InicioController -- cruce Tpv+Apartados documentado ahi) en
 * una sola pantalla -- inyecta CajaService de Tpv directamente (excepcion
 * de dependencia entre modulos ya establecida en el frontend, ver
 * ProductoDetalleComponent->ConfiguracionService).
 */
/**
 * Portada de Nucleo: junta caja y el resumen de ventas del dia. Inyecta
 * CajaService de Tpv directamente, una excepcion de dependencia ya
 * establecida en el frontend.
 */
@Component({
  selector: 'nucleo-inicio',
  standalone: true,
  imports: [
    CantidadPipe, DatosComponent, DineroPipe, EmptyComponent, FechaPipe, GraficaSerieComponent,
    KpiComponent, MatButton, PageComponent, PageHeaderComponent, RentabilidadComponent, RouterLink, SectionComponent,
    SkeletonComponent, TablaComponent, TarjetaComponent, TarjetasComponent,
  ],
  templateUrl: './inicio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioComponent implements OnInit {
  private readonly inicioService = inject(InicioService);
  private readonly cajaService = inject(CajaService);

  protected readonly cargandoResumen = signal(true);
  protected readonly resumen = signal<InicioResumenMetricas | null>(null);
  protected readonly errorResumen = signal<string | null>(null);
  protected readonly estadoResumen = computed(() => this.cargandoResumen() ? 'cargando' : this.errorResumen() ? 'error' : 'listo');
  protected readonly serie = computed(() => this.resumen()?.ventas_ultimos_siete_dias?.map(
    ({ fecha, vendido }) => ({ fecha, importe: vendido }),
  ) ?? []);
  protected readonly columnasRanking: ColumnaListado<VarianteRankingInicio>[] = [
    { tipo: 'principal', campo: 'producto_nombre', encabezado: 'Producto' },
    { tipo: 'texto', campo: 'variante_id', encabezado: 'Variante' },
    { tipo: 'cantidad', campo: 'cantidad_base', encabezado: 'Cantidad base' },
  ];

  protected readonly cargandoCaja = signal(true);
  protected readonly caja = signal<CajaActual | null>(null);

  ngOnInit(): void {
    this.cargarResumen();

    this.cajaService.actual().subscribe({
      next: (caja) => {
        this.caja.set(caja);
        this.cargandoCaja.set(false);
      },
      error: () => this.cargandoCaja.set(false),
    });
  }

  protected cargarResumen(): void {
    this.cargandoResumen.set(true);
    this.errorResumen.set(null);
    this.inicioService.resumen().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargandoResumen.set(false);
      },
      error: (error: unknown) => {
        this.errorResumen.set(mensajeError(error, 'No se pudo cargar el resumen.'));
        this.cargandoResumen.set(false);
      },
    });
  }

}
