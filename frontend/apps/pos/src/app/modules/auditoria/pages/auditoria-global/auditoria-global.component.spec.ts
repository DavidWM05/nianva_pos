import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { AuditLogEntry } from '@nianva/ui-shared';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { Observable, Subject, of } from 'rxjs';
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

  async function crearComponente(usuarios: Observable<{ id: number; nombre: string }[]> = of([])): Promise<void> {
    auditoriaService = {
      listar: vi.fn().mockReturnValue(of({ data: entradas, total: entradas.length, tablas: ['clientes', 'productos'] })),
    };

    await TestBed.configureTestingModule({
      imports: [AuditoriaGlobalComponent],
      providers: [
        ...proveedoresDePantalla(),
        provideAnimationsAsync(),
        { provide: AuditoriaGlobalService, useValue: auditoriaService },
        { provide: UsuarioAdminService, useValue: { listarTodos: vi.fn().mockReturnValue(usuarios) } },
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

    const texto = document.querySelector('.cdk-overlay-container')?.textContent ?? '';
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

  it('el filtro de usuario usa los usuarios cargados por listarTodos', async () => {
    // Los usuarios llegan despues del primer render, como en la app: con of() sincronico el
    // computed sobre un campo comun tambien pasaba.
    const usuarios = new Subject<{ id: number; nombre: string }[]>();
    await crearComponente(usuarios.asObservable());
    usuarios.next([{ id: 7, nombre: 'Beatriz' }]);
    fixture.detectChanges();

    expect((fixture.componentInstance as unknown as { opcionesUsuarios: () => unknown }).opcionesUsuarios()).toEqual([
      { label: 'Beatriz', value: 7 },
    ]);
  });

  it('al recargar por filtro, la barra de filtros sigue en el DOM', async () => {
    await crearComponente();
    const pendiente = new Subject<{ data: AuditLogEntry[]; total: number; tablas: string[] }>();
    auditoriaService.listar.mockReturnValueOnce(pendiente.asObservable());

    fixture.componentInstance['filtroTabla'].set('productos');
    fixture.componentInstance.onFiltrar();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('ui-filter-bar')).not.toBeNull();
  });

  it('al cambiar de pagina, meta refleja la pagina pedida aunque el total no cambie', async () => {
    await crearComponente();

    fixture.componentInstance['onCambio']({ page: 2, rows: 25, sortField: null, sortOrder: null });
    fixture.detectChanges();

    expect(fixture.componentInstance['meta']().page).toBe(2);
  });
});
