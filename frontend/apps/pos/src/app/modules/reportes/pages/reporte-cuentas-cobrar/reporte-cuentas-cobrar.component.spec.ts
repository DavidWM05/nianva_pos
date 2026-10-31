import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuentaCobrarService } from '../../../cuentas-cobrar/cuenta-cobrar.service';
import { ReporteCuentasCobrar } from '../../../cuentas-cobrar/cuenta-cobrar.types';
import { ReporteCuentasCobrarComponent } from './reporte-cuentas-cobrar.component';

describe('ReporteCuentasCobrarComponent', () => {
  let fixture: ComponentFixture<ReporteCuentasCobrarComponent>;
  let cuentaCobrarService: { reporte: ReturnType<typeof vi.fn> };

  const reporte: ReporteCuentasCobrar = {
    total_pendiente: 5000,
    total_vencido: 1000,
    por_antiguedad: { al_dia: 4000, vencido_1_30: 1000, vencido_31_60: 0, vencido_61_90: 0, vencido_90_mas: 0 },
    por_cliente: [{ cliente_id: 9, cliente_nombre: 'Juan Pérez', saldo_pendiente: 1000, cuentas_pendientes: 1 }],
  };

  async function crearComponente(): Promise<void> {
    cuentaCobrarService = { reporte: vi.fn().mockReturnValue(of(reporte)) };

    await TestBed.configureTestingModule({
      imports: [ReporteCuentasCobrarComponent],
      providers: [{ provide: CuentaCobrarService, useValue: cuentaCobrarService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCuentasCobrarComponent);
    fixture.detectChanges();
  }

  it('carga el reporte al iniciar y muestra los totales y el top de clientes', async () => {
    await crearComponente();

    expect(cuentaCobrarService.reporte).toHaveBeenCalledTimes(1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('$5000');
    expect(texto).toContain('$1000');
    expect(texto).toContain('Juan Pérez');
  });

  it('sin clientes con saldo pendiente muestra el aviso', async () => {
    cuentaCobrarService = { reporte: vi.fn().mockReturnValue(of({ ...reporte, por_cliente: [] })) };

    await TestBed.configureTestingModule({
      imports: [ReporteCuentasCobrarComponent],
      providers: [{ provide: CuentaCobrarService, useValue: cuentaCobrarService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCuentasCobrarComponent);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay cuentas por cobrar pendientes.');
  });
});
