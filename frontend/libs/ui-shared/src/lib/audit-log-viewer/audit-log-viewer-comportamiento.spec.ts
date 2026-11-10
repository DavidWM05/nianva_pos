import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { NEVER, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditLogViewerComponent } from './audit-log-viewer.component';
import { AuditLogEntry, AuditLogSource } from './audit-log-viewer.types';

// Serie 50d: lo que muestra el historial, sin depender de la libreria que lo dibuja. Debe
// pasar igual antes y despues de quitar PrimeNG.
const ENTRADAS: AuditLogEntry[] = [
  {
    id: 2,
    accion: 'update',
    usuario_nombre: 'Ana López',
    fecha: '2026-11-09T10:30:00',
    cambios: { nombre: { antes: 'Vales', despues: 'Vales de despensa' }, activo: { antes: null, despues: true } },
  },
  {
    id: 1,
    accion: 'create',
    usuario_nombre: null,
    fecha: '2026-11-08T09:00:00',
    cambios: null,
  },
] as unknown as AuditLogEntry[];

describe('AuditLogViewerComponent (comportamiento)', () => {
  let fixture: ComponentFixture<AuditLogViewerComponent>;
  let source: { listar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    source = { listar: vi.fn().mockReturnValue(of(ENTRADAS)) };

    await TestBed.configureTestingModule({
      imports: [AuditLogViewerComponent],
      providers: [provideAnimationsAsync(), { provide: AuditLogSource, useValue: source }],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogViewerComponent);
    fixture.componentRef.setInput('tabla', 'metodos_pago');
    fixture.componentRef.setInput('registroId', 7);
  });

  const texto = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('pinta cada entrada con su usuario, o "Sistema" si no lo hay', () => {
    fixture.detectChanges();

    expect(source.listar).toHaveBeenCalledWith('metodos_pago', 7);
    expect(texto()).toContain('Ana López');
    expect(texto()).toContain('Sistema');
  });

  it('pinta la accion de cada entrada con su badge', () => {
    fixture.detectChanges();

    const badges = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nucleo-status-badge')];
    expect(badges.map((b) => b.textContent?.trim().toLowerCase())).toEqual(['update', 'create']);
  });

  it('lista los cambios campo por campo, con antes y despues', () => {
    fixture.detectChanges();

    expect(texto()).toContain('nombre');
    expect(texto()).toContain('Vales → Vales de despensa');
    expect(texto()).toContain('activo');
    expect(texto()).toContain('— → true');
  });

  it('las entradas van en orden, dentro de una lista', () => {
    fixture.detectChanges();

    // Cada entrada es un elemento de lista propio (no basta la lista interna de cambios).
    const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll(':is(ol, ul) > li')].filter((li) =>
      li.querySelector('.audit-log-viewer__header'),
    );
    expect(items.map((li) => li.textContent?.includes('Ana López') ? 'Ana' : 'Sistema')).toEqual(['Ana', 'Sistema']);
  });

  it('sin entradas avisa que no hay actividad', () => {
    source.listar.mockReturnValue(of([]));
    fixture.detectChanges();

    expect(texto()).toContain('Sin actividad registrada.');
  });

  it('mientras carga no muestra entradas ni el aviso de vacio', () => {
    source.listar.mockReturnValue(NEVER);
    fixture.detectChanges();

    expect(texto()).not.toContain('Sin actividad registrada.');
    expect(texto()).not.toContain('Ana López');
  });
});
