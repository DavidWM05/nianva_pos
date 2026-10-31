import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { Usuario } from '../../../../auth/usuario.types';
import { BUSCADOR_USUARIO } from '../../../../core/buscadores-entidad.tokens';
import { EmpleadoService, EmpleadosPagina } from '../../empleado.service';
import { Empleado } from '../../empleado.types';
import { EmpleadosListComponent } from './empleados-list.component';

describe('EmpleadosListComponent', () => {
  let fixture: ComponentFixture<EmpleadosListComponent>;
  let empleadoService: { listar: ReturnType<typeof vi.fn>; crear: ReturnType<typeof vi.fn> };

  const usuario: Usuario = {
    id: 1,
    nombre: 'Ana',
    apellido: null,
    correo: 'ana@test.com',
    tenant_id: 3,
    sucursal_id: 7,
    es_superadmin: false,
    roles: ['admin'],
    requiere_dos_factor: false,
    dos_factor_confirmado: false,
  };

  const empleados: Empleado[] = [
    {
      id: 1,
      usuario_id: 4,
      usuario: { id: 4, nombre: 'Carlos' },
      sucursal_id: 7,
      salario_base: '8000.00',
      tipo_salario: 'fijo',
      numero_seguridad_social: null,
      fecha_ingreso: '2026-01-01',
      activo: true,
    },
  ];

  function paginaCon(permisos: EmpleadosPagina['permisos']): EmpleadosPagina {
    return { data: empleados, total: empleados.length, permisos };
  }

  async function crearComponente(permisos: EmpleadosPagina['permisos'] = { crear: true }): Promise<void> {
    empleadoService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), crear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [EmpleadosListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: EmpleadoService, useValue: empleadoService },
        { provide: AuthStateService, useValue: { usuario: () => usuario } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } },
        { provide: BUSCADOR_USUARIO, useValue: { buscar: vi.fn().mockReturnValue(of([])), obtener: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpleadosListComponent);
    fixture.detectChanges();
  }

  it('carga los empleados al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Carlos');
    expect(empleadoService.listar).toHaveBeenCalledTimes(1);
  });

  it('"Ver" navega al detalle del empleado', async () => {
    await crearComponente();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(empleados[0]);

    expect(navigateSpy).toHaveBeenCalledWith(['/payroll/empleados', 1]);
  });

  it('oculta "Nuevo empleado" sin el permiso payroll.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo empleado');
  });

  it('guardar() manda sucursal_id del usuario autenticado, nunca un input del formulario', async () => {
    await crearComponente();
    empleadoService.crear.mockReturnValue(of(empleados[0]));

    fixture.componentInstance['usuarioId'].set(4);
    fixture.componentInstance.guardar();

    expect(empleadoService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ usuario_id: 4, sucursal_id: 7, tipo_salario: 'fijo' }),
    );
  });

  it('sin usuario seleccionado, guardar() no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.guardar();

    expect(empleadoService.crear).not.toHaveBeenCalled();
  });
});
