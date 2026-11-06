import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { REGISTRO_NAVEGACION } from '@nianva/ui-layout';
import { UMBRAL_INDICADOR_MS } from '@nianva/ui-feedback';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EstadoReporte } from '../reporte.types';
import { ReportComponent } from './report.component';

@Component({
  standalone: true,
  imports: [ReportComponent],
  template: `
    <ui-report
      clave="reportes"
      [estado]="estado()"
      [exportando]="exportando()"
      (exportar)="exportaciones = exportaciones + 1"
      (reintentar)="reintentos = reintentos + 1"
    >
      <div filtros class="filtros">Filtros</div>
      <div kpis class="kpis">KPI</div>
      @if (mostrarGrafica()) {
        <div grafica class="grafica">Grafica</div>
      }
      <div detalle class="detalle">Detalle</div>
    </ui-report>
  `,
})
class HostReportComponent {
  readonly estado = signal<EstadoReporte>('listo');
  readonly exportando = signal(false);
  readonly mostrarGrafica = signal(true);
  exportaciones = 0;
  reintentos = 0;
}

describe('ReportComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostReportComponent],
      providers: [
        provideAnimationsAsync(),
        {
          provide: REGISTRO_NAVEGACION,
          useValue: [{ clave: 'reportes', ruta: 'reportes', nombre: 'Reportes', icono: 'pi pi-chart-line' }],
        },
      ],
    }).compileComponents();
  });

  function render(mostrarGrafica = true) {
    const fixture = TestBed.createComponent(HostReportComponent);
    fixture.componentInstance.mostrarGrafica.set(mostrarGrafica);
    fixture.detectChanges();

    return fixture;
  }

  it('proyecta filtros, KPIs, grafica y detalle', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.ui-report__filtros .filtros')).not.toBeNull();
    expect(el.querySelector('.ui-report__kpis .kpis')).not.toBeNull();
    expect(el.querySelector('.ui-report__grafica .grafica')).not.toBeNull();
    expect(el.querySelector('.ui-report__detalle .detalle')).not.toBeNull();
  });

  it('no deja el contenedor de grafica cuando no se proyecta', () => {
    const fixture = render(false);

    expect(fixture.nativeElement.querySelector('.ui-report__grafica')).toBeNull();
  });

  it('emite exportar y muestra el indicador pasado el umbral', () => {
    vi.useFakeTimers();
    const fixture = render();
    const boton = fixture.nativeElement.querySelector('ui-page-header button') as HTMLButtonElement;

    expect(boton.textContent).toContain('Exportar');
    boton.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.exportaciones).toBe(1);

    fixture.componentInstance.exportando.set(true);
    fixture.detectChanges();
    TestBed.tick();
    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS);
    fixture.detectChanges();

    expect(boton.disabled).toBe(true);
  });

  it('muestra el skeleton y el error con reintentar', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;

    fixture.componentInstance.estado.set('cargando');
    fixture.detectChanges();
    expect(el.querySelectorAll('ui-skeleton').length).toBeGreaterThan(0);
    expect(el.querySelector('.filtros')).toBeNull();

    fixture.componentInstance.estado.set('error');
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
    el.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    expect(fixture.componentInstance.reintentos).toBe(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
