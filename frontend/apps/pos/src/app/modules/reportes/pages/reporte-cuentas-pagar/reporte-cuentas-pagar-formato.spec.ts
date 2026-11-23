import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuentaPagarService, ReporteCuentasPagar } from '@nianva/domain-cuentas-pagar';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ReporteCuentasPagarComponent } from './reporte-cuentas-pagar.component';

// UI-05: todos los saldos con el pipe dinero (formato regional es-MX del spec).
describe('ReporteCuentasPagarComponent formato por pipe', () => {
  it('muestra totales, antiguedad y saldo por proveedor con dinero', async () => {
    const reporte: ReporteCuentasPagar = {
      total_pendiente: '8000.00',
      total_vencido: '3000.25',
      por_antiguedad: { al_dia: '5000.00', vencido_1_30: '1100.00', vencido_31_60: '1200.00', vencido_61_90: '1300.00', vencido_90_mas: '1400.00' },
      por_proveedor: [{ proveedor_id: 4, proveedor_nombre: 'Distribuidora X', saldo_pendiente: '2500.00', cuentas_pendientes: 1 }],
    };

    await TestBed.configureTestingModule({
      imports: [ReporteCuentasPagarComponent],
      providers: [...proveedoresDePantalla(), provideHttpClient(), { provide: CuentaPagarService, useValue: { reportePaginado: vi.fn().mockReturnValue(of({ data: { ...reporte, detalle: [] }, meta: { page: 1, rows: 25, total: 0, filtros_aplicados: {}, permisos: { exportar: false } } })) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReporteCuentasPagarComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const esperado of ['$8,000.00', '$3,000.25', '$5,000.00', '$1,100.00', '$1,200.00', '$1,300.00', '$1,400.00', '$2,500.00']) {
      expect(texto, esperado).toContain(esperado);
    }
  });
});
