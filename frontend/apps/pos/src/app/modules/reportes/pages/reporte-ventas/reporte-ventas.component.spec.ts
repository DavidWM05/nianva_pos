import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SucursalService } from '../../../administracion/sucursal.service';
import { VentaService } from '../../../tpv/venta.service';
import { ReporteVentas } from '../../../tpv/venta.types';
import { ReporteVentasComponent } from './reporte-ventas.component';

describe('ReporteVentasComponent', () => {
  let fixture: ComponentFixture<ReporteVentasComponent>;
  let ventaService: { reporte: ReturnType<typeof vi.fn> };
  let sucursalService: { listar: ReturnType<typeof vi.fn> };

  const reporte: ReporteVentas = {
    total_ventas: 125000,
    numero_ventas: 340,
    ticket_promedio: 367.65,
    por_sucursal: [{ sucursal_id: 1, sucursal_nombre: 'Centro', total: 80000, numero_ventas: 210 }],
    por_metodo_pago: [{ metodo_pago_id: 1, metodo_pago_nombre: 'Efectivo', total: 70000 }],
    top_productos: [{ variante_id: 12, producto_nombre: 'Playera básica', talla: 'M', color: 'Negro', cantidad_vendida: 45, total_vendido: 6750 }],
  };

  async function crearComponente(): Promise<void> {
    ventaService = { reporte: vi.fn().mockReturnValue(of(reporte)) };
    sucursalService = { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Centro' }])) };

    await TestBed.configureTestingModule({
      imports: [ReporteVentasComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: VentaService, useValue: ventaService },
        { provide: SucursalService, useValue: sucursalService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteVentasComponent);
    fixture.detectChanges();
  }

  it('carga el reporte sin filtros al iniciar', async () => {
    await crearComponente();

    expect(ventaService.reporte).toHaveBeenCalledWith({ fechaDesde: null, fechaHasta: null, sucursalId: null });
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('$125000');
    expect(texto).toContain('340');
    expect(texto).toContain('Playera básica');
  });

  it('filtrar() vuelve a pedir el reporte con las fechas y la sucursal elegidas', async () => {
    await crearComponente();

    fixture.componentInstance['fechaDesde'].set('2026-07-01');
    fixture.componentInstance['fechaHasta'].set('2026-07-28');
    fixture.componentInstance['sucursalId'].set(1);
    fixture.componentInstance.filtrar();

    expect(ventaService.reporte).toHaveBeenLastCalledWith({ fechaDesde: '2026-07-01', fechaHasta: '2026-07-28', sucursalId: 1 });
  });

  it('limpiarFiltros() resetea los filtros y vuelve a pedir el reporte', async () => {
    await crearComponente();
    fixture.componentInstance['sucursalId'].set(1);

    fixture.componentInstance.limpiarFiltros();

    expect(fixture.componentInstance['sucursalId']()).toBeNull();
    expect(ventaService.reporte).toHaveBeenLastCalledWith({ fechaDesde: null, fechaHasta: null, sucursalId: null });
  });
});
