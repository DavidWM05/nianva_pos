import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuditLogEntry } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { UsuarioAdminService } from '../../../administracion/usuario-admin.service';
import { AuditoriaGlobalService } from '../../auditoria-global.service';
import { AuditoriaGlobalComponent } from './auditoria-global.component';

describe('AuditoriaGlobalComponent', () => {
  let fixture: ComponentFixture<AuditoriaGlobalComponent>;
  let auditoriaService: { listar: ReturnType<typeof vi.fn> };

  const entradas: AuditLogEntry[] = [
    {
      id: 1,
      tabla_afectada: 'clientes',
      registro_id: 5,
      accion: 'update',
      usuario_id: 1,
      usuario_nombre: 'Ana',
      cambios: { nombre: { antes: 'Viejo', despues: 'Nuevo' } },
      fecha: '2026-07-23T10:00:00Z',
    },
  ];

  async function crearComponente(): Promise<void> {
    auditoriaService = {
      listar: vi.fn().mockReturnValue(of({ data: entradas, total: entradas.length, tablas: ['clientes', 'productos'] })),
    };

    await TestBed.configureTestingModule({
      imports: [AuditoriaGlobalComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: AuditoriaGlobalService, useValue: auditoriaService },
        { provide: UsuarioAdminService, useValue: { listarTodos: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaGlobalComponent);
    fixture.detectChanges();
  }

  it('carga la lista al iniciar sin filtros', async () => {
    await crearComponente();

    expect(auditoriaService.listar).toHaveBeenCalledTimes(1);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana');
  });

  it('"Ver cambios" abre el dialogo con el diff de la entrada', async () => {
    await crearComponente();

    fixture.componentInstance.verCambios(entradas[0]);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Viejo');
    expect(texto).toContain('Nuevo');
  });

  it('cambiar el filtro de tabla vuelve a pedir la lista desde la primera pagina', async () => {
    await crearComponente();

    fixture.componentInstance['filtroTabla'].set('productos');
    fixture.componentInstance.onFiltrar();

    expect(auditoriaService.listar).toHaveBeenCalledTimes(2);
    expect(auditoriaService.listar).toHaveBeenLastCalledWith(
      expect.objectContaining({ first: 0 }),
      expect.objectContaining({ tabla: 'productos' }),
    );
  });
});
