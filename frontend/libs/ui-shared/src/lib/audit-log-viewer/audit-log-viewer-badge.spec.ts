import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogViewerComponent } from './audit-log-viewer.component';
import { AuditLogEntry, AuditLogSource } from './audit-log-viewer.types';

// UI-06b: la accion de cada entrada se pinta con ui-badge y la entidad accionAuditoria del
// registro de estados; la etiqueta y el tono salen del registro, no del visor.
const ENTRADAS = [
  { id: 3, accion: 'delete', usuario_nombre: 'Ana', fecha: '2026-11-10T10:00:00', cambios: null },
  { id: 2, accion: 'update', usuario_nombre: 'Ana', fecha: '2026-11-09T10:00:00', cambios: null },
  { id: 1, accion: 'create', usuario_nombre: null, fecha: '2026-11-08T10:00:00', cambios: null },
] as unknown as AuditLogEntry[];

describe('AuditLogViewerComponent badge de accion', () => {
  async function crear() {
    await TestBed.configureTestingModule({
      imports: [AuditLogViewerComponent],
      providers: [{ provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of(ENTRADAS)) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuditLogViewerComponent);
    fixture.componentRef.setInput('tabla', 'productos');
    fixture.componentRef.setInput('registroId', 1);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('usa ui-badge, no nucleo-status-badge', async () => {
    const host = await crear();

    expect(host.querySelectorAll('ui-badge')).toHaveLength(3);
    expect(host.querySelector('nucleo-status-badge')).toBeNull();
  });

  it('cada accion lleva la etiqueta y el tono del registro', async () => {
    const host = await crear();

    const badges = [...host.querySelectorAll('ui-badge .ui-badge')].map((badge) => ({
      etiqueta: badge.textContent?.trim(),
      clase: badge.className,
    }));

    expect(badges).toEqual([
      { etiqueta: 'Eliminado', clase: 'ui-badge ui-badge--peligro' },
      { etiqueta: 'Modificado', clase: 'ui-badge ui-badge--info' },
      { etiqueta: 'Creado', clase: 'ui-badge ui-badge--exito' },
    ]);
  });
});
