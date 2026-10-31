import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { Usuario } from '../../../../auth/usuario.types';
import { NominaService, NominasPagina } from '../../nomina.service';
import { Nomina } from '../../nomina.types';
import { NominasListComponent } from './nominas-list.component';

describe('NominasListComponent', () => {
  let fixture: ComponentFixture<NominasListComponent>;
  let nominaService: { listar: ReturnType<typeof vi.fn>; generar: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

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

  function nominaCon(overrides: Partial<Nomina>): Nomina {
    return {
      id: 1,
      periodo_inicio: '2026-07-01',
      periodo_fin: '2026-07-15',
      total_percepciones: '4000.00',
      total_deducciones: '0.00',
      total_neto: '4000.00',
      estado: 'calculada',
      fecha_pago: null,
      ...overrides,
    };
  }

  function paginaCon(nominas: Nomina[], permisos: NominasPagina['permisos']): NominasPagina {
    return { data: nominas, total: nominas.length, permisos };
  }

  async function crearComponente(permisos: NominasPagina['permisos'] = { crear: true }): Promise<void> {
    nominaService = {
      listar: vi.fn().mockReturnValue(of(paginaCon([nominaCon({})], permisos))),
      generar: vi.fn(),
    };
    toast = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NominasListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: NominaService, useValue: nominaService },
        { provide: AuthStateService, useValue: { usuario: () => usuario } },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NominasListComponent);
    fixture.detectChanges();
  }

  it('carga las nominas al iniciar', async () => {
    await crearComponente();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('4000.00');
    expect(nominaService.listar).toHaveBeenCalledTimes(1);
  });

  it('"Ver" navega al detalle de la nomina', async () => {
    await crearComponente();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentInstance.irADetalle(nominaCon({ id: 5 }));

    expect(navigateSpy).toHaveBeenCalledWith(['/payroll/nominas', 5]);
  });

  it('confirmarGenerar() manda sucursal_id del usuario autenticado', async () => {
    await crearComponente();
    nominaService.generar.mockReturnValue(of(nominaCon({})));

    fixture.componentInstance['periodoInicio'].set(new Date('2026-07-01T00:00:00Z'));
    fixture.componentInstance['periodoFin'].set(new Date('2026-07-15T00:00:00Z'));
    fixture.componentInstance.confirmarGenerar();

    expect(nominaService.generar).toHaveBeenCalledWith({
      sucursal_id: 7,
      periodo_inicio: '2026-07-01',
      periodo_fin: '2026-07-15',
    });
    expect(toast.success).toHaveBeenCalledWith('Nómina generada.');
  });
  it('si el backend reporta sucursal_requerida, muestra el mensaje fijo', async () => {
    await crearComponente();
    nominaService.generar.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { message: 'La operacion requiere una sucursal.', error_code: 'sucursal_requerida' },
          }),
      ),
    );

    fixture.componentInstance['periodoInicio'].set(new Date('2026-07-01T00:00:00Z'));
    fixture.componentInstance['periodoFin'].set(new Date('2026-07-15T00:00:00Z'));
    fixture.componentInstance.confirmarGenerar();

    expect(toast.error).toHaveBeenCalledWith('Tu usuario no tiene sucursal asignada; pide a un administrador que te asigne una.');
  });});
