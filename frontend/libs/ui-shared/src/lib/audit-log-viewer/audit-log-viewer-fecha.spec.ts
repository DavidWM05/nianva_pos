import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogViewerComponent } from './audit-log-viewer.component';
import { AuditLogEntry, AuditLogSource } from './audit-log-viewer.types';

// UI-05: la fecha de cada entrada sale del pipe fechaHora (es-MX, America/Mexico_City), no de `date`.
describe('AuditLogViewerComponent fecha', () => {
  it('muestra la fecha de la entrada con fechaHora', async () => {
    const entradas: AuditLogEntry[] = [
      { id: 1, tabla_afectada: 'ventas', registro_id: 1, accion: 'update', usuario_id: 1, usuario_nombre: 'Ana', fecha: '2026-11-09T16:30:00Z', cambios: null },
    ];

    await TestBed.configureTestingModule({
      imports: [AuditLogViewerComponent],
      providers: [provideAnimationsAsync(), { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of(entradas)) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuditLogViewerComponent);
    fixture.componentRef.setInput('tabla', 'ventas');
    fixture.componentRef.setInput('registroId', 1);
    fixture.detectChanges();

    const fecha = (fixture.nativeElement as HTMLElement).querySelector('.audit-log-viewer__fecha');

    expect(fecha?.textContent?.trim()).toBe('09/11/2026 10:30');
  });
});
