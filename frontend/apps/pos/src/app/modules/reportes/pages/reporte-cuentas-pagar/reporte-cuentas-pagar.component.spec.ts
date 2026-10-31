import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuentaPagarService } from '../../../cuentas-pagar/cuenta-pagar.service';
import { ReporteCuentasPagar } from '../../../cuentas-pagar/cuenta-pagar.types';
import { ReporteCuentasPagarComponent } from './reporte-cuentas-pagar.component';

describe('ReporteCuentasPagarComponent', () => {
  let fixture: ComponentFixture<ReporteCuentasPagarComponent>;
  let cuentaPagarService: { reporte: ReturnType<typeof vi.fn> };

  const reporte: ReporteCuentasPagar = {
    total_pendiente: 8000,
    total_vencido: 3000,
    por_antiguedad: { al_dia: 5000, vencido_1_30: 0, vencido_31_60: 3000, vencido_61_90: 0, vencido_90_mas: 0 },
    por_proveedor: [{ proveedor_id: 4, proveedor_nombre: 'Distribuidora X', saldo_pendiente: 3000, cuentas_pendientes: 1 }],
  };

  async function crearComponente(): Promise<void> {
    cuentaPagarService = { reporte: vi.fn().mockReturnValue(of(reporte)) };

    await TestBed.configureTestingModule({
      imports: [ReporteCuentasPagarComponent],
      providers: [{ provide: CuentaPagarService, useValue: cuentaPagarService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCuentasPagarComponent);
    fixture.detectChanges();
  }

  it('carga el reporte al iniciar y muestra los totales y el top de proveedores', async () => {
    await crearComponente();

    expect(cuentaPagarService.reporte).toHaveBeenCalledTimes(1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('$8000');
    expect(texto).toContain('$3000');
    expect(texto).toContain('Distribuidora X');
  });

  it('sin proveedores con saldo pendiente muestra el aviso', async () => {
    cuentaPagarService = { reporte: vi.fn().mockReturnValue(of({ ...reporte, por_proveedor: [] })) };

    await TestBed.configureTestingModule({
      imports: [ReporteCuentasPagarComponent],
      providers: [{ provide: CuentaPagarService, useValue: cuentaPagarService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCuentasPagarComponent);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay cuentas por pagar pendientes.');
  });
});
