import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CambioReporte, fechaComoIso } from '../reporte.types';
import { ReportFiltrosComponent } from './report-filtros.component';

describe('ReportFiltrosComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportFiltrosComponent],
      providers: [provideAnimationsAsync(), providePrimeNG()],
    }).compileComponents();
  });

  function render(puedeElegirSucursal = false) {
    const fixture = TestBed.createComponent(ReportFiltrosComponent);
    fixture.componentRef.setInput('sucursales', [
      { id: 1, nombre: 'Centro' },
      { id: 2, nombre: 'Norte' },
    ]);
    fixture.componentRef.setInput('puedeElegirSucursal', puedeElegirSucursal);
    fixture.componentRef.setInput('sucursalUsuario', { id: 1, nombre: 'Centro' });
    fixture.detectChanges();

    return fixture;
  }

  it('convierte el rango de fechas a YYYY-MM-DD sin desplazamiento de zona', () => {
    expect(fechaComoIso(new Date(2026, 10, 3, 23, 30))).toBe('2026-11-03');
    expect(fechaComoIso(null)).toBeNull();
  });

  it('emite desde, hasta y sucursal al cambiar el rango', () => {
    const fixture = render();
    const cambios: CambioReporte[] = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));
    const componente = fixture.componentInstance as unknown as {
      alCambiarFechas: (valor: Date[]) => void;
    };

    componente.alCambiarFechas([new Date(2026, 10, 3), new Date(2026, 10, 5)]);

    expect(cambios.at(-1)).toEqual({
      desde: '2026-11-03',
      hasta: '2026-11-05',
      sucursalId: 1,
    });
  });

  it('sin permiso muestra la sucursal del usuario como texto y no el selector', () => {
    const fixture = render(false);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('ui-select-filtro')).toBeNull();
    expect(el.textContent).toContain('Centro');
  });

  it('con permiso muestra el selector de sucursal y permite elegir', () => {
    const fixture = render(true);
    const componente = fixture.componentInstance as unknown as {
      alCambiarSucursal: (valor: number) => void;
    };
    const cambios: CambioReporte[] = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));

    expect(fixture.nativeElement.querySelector('ui-select-filtro')).not.toBeNull();

    componente.alCambiarSucursal(2);

    expect(cambios.at(-1)?.sucursalId).toBe(2);
  });

  it('limpiar emite limpiar y un cambio vacio', () => {
    const fixture = render(true);
    const componente = fixture.componentInstance as unknown as {
      limpiarFiltros: () => void;
    };
    const limpiar = vi.fn();
    const cambios: CambioReporte[] = [];
    fixture.componentInstance.limpiar.subscribe(limpiar);
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));

    componente.limpiarFiltros();

    expect(limpiar).toHaveBeenCalledOnce();
    expect(cambios.at(-1)).toEqual({ desde: null, hasta: null, sucursalId: null });
  });
});
