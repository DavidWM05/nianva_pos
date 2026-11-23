import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CrmAvanzadoService, ReporteCrm } from '@nianva/domain-crm';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ReporteCrmComponent } from './reporte-crm.component';

describe('ReporteCrmComponent', () => {
  let fixture: ComponentFixture<ReporteCrmComponent>;
  let crmAvanzadoService: { reportePaginado: ReturnType<typeof vi.fn> };

  const reporte: ReporteCrm = {
    clientes_por_segmento: { nuevo: 12, frecuente: 30, vip: 8, inactivo: 15 },
    interacciones_por_tipo: { llamada: 20, email: 45 },
    loyalty: { puntos_ganados_total: 15200, puntos_canjeados_total: 4300, puntos_vencidos_total: 900, saldo_actual_total: 10000 },
    campanas_recientes: [{ id: 5, asunto: 'Promo verano', segmento: 'vip', destinatarios: 8, enviado_en: '2026-07-20T10:00:00Z' }],
  };

  async function crearComponente(): Promise<void> {
    crmAvanzadoService = { reportePaginado: vi.fn().mockReturnValue(of({ data: { ...reporte, detalle: reporte.campanas_recientes }, meta: { page: 1, rows: 25, total: reporte.campanas_recientes.length, filtros_aplicados: {}, permisos: { exportar: false } } })) };

    await TestBed.configureTestingModule({
      imports: [ReporteCrmComponent],
      providers: [...proveedoresDePantalla(), provideHttpClient(), { provide: CrmAvanzadoService, useValue: crmAvanzadoService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCrmComponent);
    fixture.detectChanges();
  }

  it('carga el reporte al iniciar y muestra segmentos, interacciones, loyalty y campañas', async () => {
    await crearComponente();

    expect(crmAvanzadoService.reportePaginado).toHaveBeenCalledTimes(1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('12');
    expect(texto).toContain('Llamada');
    expect(texto).toContain('15,200');
    expect(texto).toContain('Promo verano');
  });

  it('sin interacciones ni campañas muestra los avisos correspondientes', async () => {
    crmAvanzadoService = {
      reportePaginado: vi.fn().mockReturnValue(of({ data: { ...reporte, interacciones_por_tipo: {}, campanas_recientes: [], detalle: [] }, meta: { page: 1, rows: 25, total: 0, filtros_aplicados: {}, permisos: { exportar: false } } })),
    };

    await TestBed.configureTestingModule({
      imports: [ReporteCrmComponent],
      providers: [...proveedoresDePantalla(), provideHttpClient(), { provide: CrmAvanzadoService, useValue: crmAvanzadoService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReporteCrmComponent);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay interacciones registradas todavía.');
    expect(texto).toContain('No se ha enviado ninguna campaña todavía.');
  });
});
