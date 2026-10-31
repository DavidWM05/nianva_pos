import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CrmAvanzadoService } from '../../../crm/crm-avanzado.service';
import { ReporteCrm } from '../../../crm/crm-avanzado.types';
import { ReporteCrmComponent } from './reporte-crm.component';

describe('ReporteCrmComponent', () => {
  let fixture: ComponentFixture<ReporteCrmComponent>;
  let crmAvanzadoService: { reporte: ReturnType<typeof vi.fn> };

  const reporte: ReporteCrm = {
    clientes_por_segmento: { nuevo: 12, frecuente: 30, vip: 8, inactivo: 15 },
    interacciones_por_tipo: { llamada: 20, email: 45 },
    loyalty: { puntos_ganados_total: 15200, puntos_canjeados_total: 4300, puntos_vencidos_total: 900, saldo_actual_total: 10000 },
    campanas_recientes: [{ id: 5, asunto: 'Promo verano', segmento: 'vip', destinatarios: 8, enviado_en: '2026-07-20T10:00:00Z' }],
  };

  async function crearComponente(): Promise<void> {
    crmAvanzadoService = { reporte: vi.fn().mockReturnValue(of(reporte)) };

    await TestBed.configureTestingModule({
      imports: [ReporteCrmComponent],
      providers: [{ provide: CrmAvanzadoService, useValue: crmAvanzadoService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCrmComponent);
    fixture.detectChanges();
  }

  it('carga el reporte al iniciar y muestra segmentos, interacciones, loyalty y campañas', async () => {
    await crearComponente();

    expect(crmAvanzadoService.reporte).toHaveBeenCalledTimes(1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('12');
    expect(texto).toContain('Llamada');
    expect(texto).toContain('15200');
    expect(texto).toContain('Promo verano');
  });

  it('sin interacciones ni campañas muestra los avisos correspondientes', async () => {
    crmAvanzadoService = {
      reporte: vi.fn().mockReturnValue(of({ ...reporte, interacciones_por_tipo: {}, campanas_recientes: [] })),
    };

    await TestBed.configureTestingModule({
      imports: [ReporteCrmComponent],
      providers: [{ provide: CrmAvanzadoService, useValue: crmAvanzadoService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCrmComponent);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay interacciones registradas todavía.');
    expect(texto).toContain('No se ha enviado ninguna campaña todavía.');
  });
});
