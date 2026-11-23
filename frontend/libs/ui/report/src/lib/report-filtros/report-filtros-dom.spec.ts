import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, expect, it } from 'vitest';

import type { CambioReporte } from '../reporte.types';
import { ReportFiltrosComponent } from './report-filtros.component';

describe('Filtros de periodo en el DOM', () => {
  it('las fechas introducidas en ambos campos llegan como fechas civiles', () => {
    TestBed.configureTestingModule({ providers: [provideAnimationsAsync()] });
    const fixture = TestBed.createComponent(ReportFiltrosComponent);
    const cambios: CambioReporte[] = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    for (const etiqueta of ['Desde', 'Hasta']) {
      const input = host.querySelector<HTMLInputElement>('input[aria-label="' + etiqueta + '"]')!;
      input.value = '2024-06-14';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    expect(cambios.at(-1)).toEqual({ desde: '2024-06-14', hasta: '2024-06-14', sucursalId: null });
  });
});
