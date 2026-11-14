import { TestBed } from '@angular/core/testing';
import { ConfirmDialogService } from '@nianva/ui-shared';
import { describe, expect, it, vi } from 'vitest';

import { DispositivosConfiablesListComponent } from './dispositivos-confiables-list.component';

// UI-05: las fechas salen del pipe fechaHora (es-MX, America/Mexico_City), no de `date`.
describe('DispositivosConfiablesListComponent fechas', () => {
  it('muestra la fecha de confianza y de expiracion con fechaHora', async () => {
    await TestBed.configureTestingModule({
      imports: [DispositivosConfiablesListComponent],
      providers: [{ provide: ConfirmDialogService, useValue: { confirm: vi.fn() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(DispositivosConfiablesListComponent);
    fixture.componentInstance.dispositivos = [
      {
        id: 1,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0',
        ip_registro: '127.0.0.1',
        fecha_creacion: '2026-07-01T16:30:00Z',
        fecha_expiracion: '2026-08-01T16:30:00Z',
        es_actual: false,
      },
    ];
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Confiado el 01/07/2026 10:30');
    expect(texto).toContain('Expira el 01/08/2026 10:30');
  });
});
