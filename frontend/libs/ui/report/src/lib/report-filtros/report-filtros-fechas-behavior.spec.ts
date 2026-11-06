import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { CambioReporte } from '../reporte.types';
import { ReportFiltrosComponent } from './report-filtros.component';

type Interno = {
  alCambiarFechas: (valor: Date[]) => void;
  rango: () => Date[] | null;
};

describe('ReportFiltrosComponent selector de fechas', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportFiltrosComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function render(puedeElegirSucursal = false) {
    const fixture = TestBed.createComponent(ReportFiltrosComponent);
    fixture.componentRef.setInput('puedeElegirSucursal', puedeElegirSucursal);
    fixture.componentRef.setInput('sucursalUsuario', { id: 1, nombre: 'Centro' });
    fixture.detectChanges();

    return fixture;
  }

  it('elegir un rango emite desde y hasta en YYYY-MM-DD', () => {
    const fixture = render();
    const cambios: CambioReporte[] = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));

    (fixture.componentInstance as unknown as Interno).alCambiarFechas([
      new Date(2026, 10, 3, 23, 30),
      new Date(2026, 10, 5, 1, 15),
    ]);

    expect(cambios.at(-1)).toEqual({
      desde: '2026-11-03',
      hasta: '2026-11-05',
      sucursalId: 1,
    });
  });

  it('el campo del periodo tiene un nombre accesible', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    const inputs = [...el.querySelectorAll('input')];

    expect(el.textContent).toContain('Periodo');
    expect(inputs.length).toBeGreaterThan(0);
    expect(
      inputs.some(
        (input) =>
          input.getAttribute('aria-label') !== null ||
          input.getAttribute('aria-labelledby') !== null ||
          (input.id !== '' && el.querySelector(`label[for="${input.id}"]`) !== null),
      ),
    ).toBe(true);
  });

  it('Limpiar vacia el rango y emite un cambio sin fechas', () => {
    const fixture = render(true);
    const cambios: CambioReporte[] = [];
    const componente = fixture.componentInstance as unknown as Interno;
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));

    componente.alCambiarFechas([new Date(2026, 10, 3), new Date(2026, 10, 5)]);
    expect(componente.rango()).toHaveLength(2);
    fixture.detectChanges();

    const limpiar = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((boton) =>
      boton.textContent?.includes('Limpiar'),
    ) as HTMLButtonElement;
    limpiar.click();
    fixture.detectChanges();

    expect(componente.rango()).toBeNull();
    expect(cambios.at(-1)).toEqual({ desde: null, hasta: null, sucursalId: null });
  });
});
