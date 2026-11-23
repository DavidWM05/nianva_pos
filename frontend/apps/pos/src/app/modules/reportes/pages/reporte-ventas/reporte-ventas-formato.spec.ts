import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SucursalService } from '@nianva/domain-administracion';
import { ReporteVentas, VentaService } from '@nianva/domain-tpv';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ReporteVentasComponent } from './reporte-ventas.component';

// UI-05: importes con el pipe dinero y cantidades con cantidad (formato regional es-MX del spec).
describe('ReporteVentasComponent formato por pipe', () => {
  it('muestra importes con dinero y la cantidad vendida con cantidad', async () => {
    const reporte: ReporteVentas = {
      total_ventas: '125000.00',
      numero_ventas: 340,
      ticket_promedio: '367.60',
      por_sucursal: [{ sucursal_id: 1, sucursal_nombre: 'Centro', total: '80000.50', numero_ventas: 210 }],
      por_metodo_pago: [{ metodo_pago_id: 1, metodo_pago_nombre: 'Efectivo', total: '70000.00' }],
      top_productos: [{ variante_id: 12, producto_nombre: 'Playera', nombre: 'M / Negro', cantidad_vendida: '1250.500', total_vendido: '6750.00' }],
    };

    await TestBed.configureTestingModule({
      imports: [ReporteVentasComponent],
      providers: [
        ...proveedoresDePantalla(), provideHttpClient(),
        { provide: VentaService, useValue: { reportePaginado: vi.fn().mockReturnValue(of({ data: { ...reporte, detalle: [], por_dia: [], totales: { vendido: reporte.total_ventas, tickets: reporte.numero_ventas, ticket_promedio: reporte.ticket_promedio, ventas_netas_comerciales: reporte.total_ventas } }, meta: { page: 1, rows: 25, total: 0, filtros_aplicados: {}, permisos: { exportar: false } } })) } },
        { provide: SucursalService, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReporteVentasComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const esperado of ['$125,000.00', '$367.60', '$80,000.50', '$70,000.00', '1,250.5', '$6,750.00']) {
      expect(texto, esperado).toContain(esperado);
    }
  });
});
