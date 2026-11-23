import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import { BotonExportarComponent } from '@nianva/ui-actions';
import { EmptyComponent } from '@nianva/ui-data';
import { PageHeaderComponent, PageComponent } from '@nianva/ui-layout';

import { EstadoReporte } from '../reporte.types';

@Component({
  selector: 'ui-report',
  standalone: true,
  imports: [BotonExportarComponent, EmptyComponent, PageComponent, PageHeaderComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportComponent implements AfterViewChecked {
  readonly clave = input.required<string>();
  readonly estado = input.required<EstadoReporte>();
  readonly exportando = input(false);
  readonly puedeExportar = input(true);
  readonly mensajeError = input('No se pudo cargar la información.');
  readonly mensajeVacio = input('No hay resultados para los filtros seleccionados.');

  readonly exportar = output<void>();
  readonly reintentar = output<void>();

  protected readonly estadoPagina = computed(() => {
    const estado = this.estado();
    return estado === 'vacio' ? 'listo' : estado;
  });

  protected readonly hayGrafica = signal(true);

  @ViewChild('graficaSeccion', { read: ElementRef }) private graficaSeccion?: ElementRef<HTMLElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private graficaComprobada = false;

  ngAfterViewChecked(): void {
    if (this.graficaComprobada || !this.graficaSeccion) {
      return;
    }

    this.graficaComprobada = true;
    const tieneGrafica = this.graficaSeccion.nativeElement.querySelector('[grafica]') !== null;

    if (! tieneGrafica) {
      this.hayGrafica.set(false);
      this.cdr.detectChanges();
    }
  }
}
