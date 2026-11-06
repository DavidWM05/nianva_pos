import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { CambioReporte } from '../reporte.types';
import { ReportFiltrosComponent } from './report-filtros.component';

// SEG-02: sin sucursales.todas la sucursal es la del usuario. Si no se sabe cual es, el
// filtro no adivina con la primera de la lista: manda null y el backend usa la del usuario
// (SucursalOperacion::paraFiltro).
describe('ReportFiltrosComponent sin sucursal del usuario', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportFiltrosComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  function crear() {
    const fixture = TestBed.createComponent(ReportFiltrosComponent);
    fixture.componentRef.setInput('sucursales', [
      { id: 9, nombre: 'Norte' },
      { id: 1, nombre: 'Centro' },
    ]);
    fixture.componentRef.setInput('puedeElegirSucursal', false);
    fixture.detectChanges();

    return fixture;
  }

  it('no toma la primera sucursal de la lista como la del usuario', () => {
    const fixture = crear();
    const cambios: CambioReporte[] = [];
    fixture.componentInstance.cambio.subscribe((cambio) => cambios.push(cambio));

    fixture.componentInstance['alCambiarFechas']([new Date(2026, 10, 1), new Date(2026, 10, 3)]);

    expect(cambios.at(-1)?.sucursalId).toBeNull();
  });

  it('no muestra el nombre de otra sucursal', () => {
    const texto = (crear().nativeElement as HTMLElement).textContent ?? '';

    expect(texto).not.toContain('Norte');
    expect(texto).toContain('Tu sucursal');
  });
});
