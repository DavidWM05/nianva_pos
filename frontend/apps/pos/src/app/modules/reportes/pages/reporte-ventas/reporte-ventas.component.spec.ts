import { By } from '@angular/platform-browser';
import { SesionActualService } from '@nianva/domain-sesion';
import { ReportFiltrosComponent } from '@nianva/ui-report';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SucursalService } from '@nianva/domain-administracion';
import { ReporteVentas, VentaService } from '@nianva/domain-tpv';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ReporteVentasComponent } from './reporte-ventas.component';

describe('ReporteVentasComponent', () => {
  let fixture: ComponentFixture<ReporteVentasComponent>;
  let ventaService: { reportePaginado: ReturnType<typeof vi.fn> };
  let sucursalService: { listar: ReturnType<typeof vi.fn> };

  const reporte: ReporteVentas = {
    total_ventas: '125000.00',
    numero_ventas: 340,
    ticket_promedio: '367.65',
    por_sucursal: [{ sucursal_id: 1, sucursal_nombre: 'Centro', total: '80000.00', numero_ventas: 210 }],
    por_metodo_pago: [{ metodo_pago_id: 1, metodo_pago_nombre: 'Efectivo', total: '70000.00' }],
    top_productos: [{ variante_id: 12, producto_nombre: 'Playera básica', nombre: 'M / Negro', cantidad_vendida: '45.000', total_vendido: '6750.00' }],
  };

  async function crearComponente(permisos = ['sucursales.todas', 'usuarios.ver']): Promise<void> {
    ventaService = { reportePaginado: vi.fn().mockReturnValue(of({ data: { ...reporte, detalle: [], por_dia: [], totales: { vendido: reporte.total_ventas, tickets: reporte.numero_ventas, ticket_promedio: reporte.ticket_promedio, ventas_netas_comerciales: reporte.total_ventas } }, meta: { page: 1, rows: 25, total: 0, filtros_aplicados: {}, permisos: { exportar: false } } })) };
    sucursalService = { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Centro' }])) };

    await TestBed.configureTestingModule({
      imports: [ReporteVentasComponent],
      providers: [
        ...proveedoresDePantalla(), provideHttpClient(),
        { provide: VentaService, useValue: ventaService },
        { provide: SucursalService, useValue: sucursalService },
        { provide: SesionActualService, useValue: { sesion: () => ({ permisos, sucursal: { id: 1, nombre: 'Centro' } }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteVentasComponent);
    fixture.detectChanges();
  }

  it('carga el reporte sin filtros al iniciar', async () => {
    await crearComponente();

    expect(ventaService.reportePaginado).toHaveBeenCalledWith({ fechaDesde: null, fechaHasta: null, sucursalId: null }, 1, 25);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('$125,000.00');
    expect(texto).toContain('340');
    expect(texto).toContain('Playera básica');
  });

  it('filtrar() vuelve a pedir el reporte con las fechas y la sucursal elegidas', async () => {
    await crearComponente();

    filtros().cambio.emit({ desde: '2026-07-01', hasta: '2026-07-28', sucursalId: 1 });

    expect(ventaService.reportePaginado).toHaveBeenLastCalledWith({ fechaDesde: '2026-07-01', fechaHasta: '2026-07-28', sucursalId: 1 }, 1, 25);
  });

  it('limpiarFiltros() resetea los filtros y vuelve a pedir el reporte', async () => {
    await crearComponente();
    filtros()["alCambiarSucursal"](1);

    filtros()["limpiarFiltros"]();

    expect(filtros()['sucursalId']()).toBeNull();
    expect(ventaService.reportePaginado).toHaveBeenLastCalledWith({ fechaDesde: null, fechaHasta: null, sucursalId: null }, 1, 25);
  });

  function filtros(): ReportFiltrosComponent {
    return fixture.debugElement.query(By.directive(ReportFiltrosComponent)).injector.get(ReportFiltrosComponent);
  }

  it('muestra el consolidado sin consultar sucursales cuando falta usuarios.ver', async () => {
    await crearComponente(['sucursales.todas']);
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.querySelector('ui-report-filtros')?.textContent).toContain('Todas las sucursales');
    expect(vista.querySelector('ui-report-filtros ui-select-filtro')).toBeNull();
    expect(sucursalService.listar).not.toHaveBeenCalled();
    expect(ventaService.reportePaginado).toHaveBeenCalledWith({ fechaDesde: null, fechaHasta: null, sucursalId: null }, 1, 25);
  });
});
