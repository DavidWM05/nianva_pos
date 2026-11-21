import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CuentaCobrarService, ReporteCuentasCobrar } from '@nianva/domain-cuentas-cobrar';
import { ReporteCuentasCobrarComponent } from './reporte-cuentas-cobrar.component';
import { ulidDePrueba } from '../../../../testing/ulid-de-prueba';

describe('ReporteCuentasCobrarComponent', () => {
  let fixture: ComponentFixture<ReporteCuentasCobrarComponent>;
  let cuentaCobrarService: { reporte: ReturnType<typeof vi.fn> };

  const reporte: ReporteCuentasCobrar = {
    total_pendiente: '5000.00',
    total_vencido: '1000.00',
    por_antiguedad: { al_dia: '4000.00', vencido_1_30: '1000.00', vencido_31_60: '0.00', vencido_61_90: '0.00', vencido_90_mas: '0.00' },
    por_cliente: [{ cliente_id: ulidDePrueba(9), cliente_nombre: 'Juan Pérez', saldo_pendiente: '1000.00', cuentas_pendientes: 1 }],
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
    expect(texto).toContain('$5,000.00');
    expect(texto).toContain('$1,000.00');
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
