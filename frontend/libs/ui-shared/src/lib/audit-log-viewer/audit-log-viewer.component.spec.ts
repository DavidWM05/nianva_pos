import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditLogViewerComponent } from './audit-log-viewer.component';
import { AuditLogSource } from './audit-log-viewer.types';

describe('AuditLogViewerComponent', () => {
  let fixture: ComponentFixture<AuditLogViewerComponent>;
  let source: { listar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    source = {
      listar: vi.fn().mockReturnValue(throwError(() => ({ status: 403 }))),
    };

    await TestBed.configureTestingModule({
      imports: [AuditLogViewerComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: AuditLogSource, useValue: source },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogViewerComponent);
  });

  it('muestra un mensaje propio cuando la auditoria responde 403', () => {
    fixture.componentRef.setInput('tabla', 'clientes');
    fixture.componentRef.setInput('registroId', 1);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(source.listar).toHaveBeenCalledWith('clientes', 1);
    expect(texto).toContain('No tienes permiso para ver el historial');
  });
});
