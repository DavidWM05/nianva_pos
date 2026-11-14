import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuentaCobrarService } from '../../../cuentas-cobrar/cuenta-cobrar.service';
import { ReporteCuentasCobrar } from '../../../cuentas-cobrar/cuenta-cobrar.types';
import { ReporteCuentasCobrarComponent } from './reporte-cuentas-cobrar.component';

// UI-05: todos los saldos con el pipe dinero (formato regional es-MX del spec).
describe('ReporteCuentasCobrarComponent formato por pipe', () => {
  it('muestra totales, antiguedad y saldo por cliente con dinero', async () => {
    const reporte: ReporteCuentasCobrar = {
      total_pendiente: 5000,
      total_vencido: 1000.5,
      por_antiguedad: { al_dia: '4000.00', vencido_1_30: '1100.00', vencido_31_60: '1200.00', vencido_61_90: '1300.00', vencido_90_mas: '1400.00' },
      por_cliente: [{ cliente_id: 9, cliente_nombre: 'Juan', saldo_pendiente: 2500, cuentas_pendientes: 1 }],
    };

    await TestBed.configureTestingModule({
      imports: [ReporteCuentasCobrarComponent],
      providers: [{ provide: CuentaCobrarService, useValue: { reporte: vi.fn().mockReturnValue(of(reporte)) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReporteCuentasCobrarComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const esperado of ['$5,000.00', '$1,000.50', '$4,000.00', '$1,100.00', '$1,200.00', '$1,300.00', '$1,400.00', '$2,500.00']) {
      expect(texto, esperado).toContain(esperado);
    }
  });
});
