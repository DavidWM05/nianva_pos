import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CrmAvanzadoService } from '../../../crm/crm-avanzado.service';
import { ReporteCrm } from '../../../crm/crm-avanzado.types';
import { ReporteCrmComponent } from './reporte-crm.component';

// UI-05: puntos con el pipe cantidad y la fecha de envio con fechaHora (es-MX, America/Mexico_City).
describe('ReporteCrmComponent formato por pipe', () => {
  it('muestra los puntos con cantidad y la fecha de la campana con fechaHora', async () => {
    const reporte: ReporteCrm = {
      clientes_por_segmento: { nuevo: 12, frecuente: 30, vip: 8, inactivo: 15 },
      interacciones_por_tipo: { llamada: 20 },
      loyalty: { puntos_ganados_total: 15200, puntos_canjeados_total: 4300, puntos_vencidos_total: 1900, saldo_actual_total: 10000 },
      campanas_recientes: [{ id: 5, asunto: 'Promo verano', segmento: 'vip', destinatarios: 8, enviado_en: '2026-07-20T10:00:00Z' }],
    };

    await TestBed.configureTestingModule({
      imports: [ReporteCrmComponent],
      providers: [{ provide: CrmAvanzadoService, useValue: { reporte: vi.fn().mockReturnValue(of(reporte)) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ReporteCrmComponent);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    for (const esperado of ['15,200', '4,300', '1,900', '10,000', '20/07/2026 04:00']) {
      expect(texto, esperado).toContain(esperado);
    }
  });
});
