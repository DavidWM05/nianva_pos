import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { Router } from '@angular/router';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { AuthStateService } from '../../auth/auth-state.service';
import { BUSCADOR_USUARIO } from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { EmpleadosListComponent } from './pages/empleados-list/empleados-list.component';
import { NominasListComponent } from './pages/nominas-list/nominas-list.component';
import { EmpleadoService } from './empleado.service';
import { NominaService } from './nomina.service';
import { PrestamoFormComponent } from '../prestamos/pages/prestamo-form/prestamo-form.component';
import { PrestamoService } from '../prestamos/prestamo.service';

interface CasoFecha {
  pantalla: Type<object>;
  servicio: Type<unknown>;
  campo: string;
  payload: string;
  metodo: string;
  api: string;
}

// La zona se fija aqui y no depende de la maquina: CI corre en UTC, donde new Date('YYYY-MM-DD')
// no retrocede un dia y la regresion de carga pasaria inadvertida. Node aplica el cambio de TZ
// en caliente; al terminar se restaura para los demas specs del mismo proceso.
const zonaOriginal = process.env['TZ'];
beforeAll(() => {
  process.env['TZ'] = 'America/Mexico_City';
});
afterAll(() => {
  if (zonaOriginal === undefined) {
    delete process.env['TZ'];
  } else {
    process.env['TZ'] = zonaOriginal;
  }
});

const casos: CasoFecha[] = [
  {
    pantalla: EmpleadosListComponent,
    servicio: EmpleadoService,
    campo: 'fechaIngreso',
    payload: 'fecha_ingreso',
    metodo: 'guardar',
    api: 'crear',
  },
  {
    pantalla: NominasListComponent,
    servicio: NominaService,
    campo: 'periodoInicio',
    payload: 'periodo_inicio',
    metodo: 'confirmarGenerar',
    api: 'generar',
  },
  {
    pantalla: NominasListComponent,
    servicio: NominaService,
    campo: 'periodoFin',
    payload: 'periodo_fin',
    metodo: 'confirmarGenerar',
    api: 'generar',
  },
  {
    pantalla: PrestamoFormComponent,
    servicio: PrestamoService,
    campo: 'fechaPrestamo',
    payload: 'fecha_prestamo',
    metodo: 'crear',
    api: 'crear',
  },
  {
    pantalla: PrestamoFormComponent,
    servicio: PrestamoService,
    campo: 'fechaVencimiento',
    payload: 'fecha_vencimiento',
    metodo: 'crear',
    api: 'crear',
  },
];
const poner = (c: object, nombre: string, valor: unknown) =>
  Reflect.get(c, nombre).set(valor);
afterEach(() => TestBed.resetTestingModule());
async function preparar(caso: CasoFecha) {
  const servicio = {
    listar: vi
      .fn()
      .mockReturnValue(of({ data: [], total: 0, permisos: { crear: true } })),
    crear: vi.fn().mockReturnValue(of({ id: 1 })),
    generar: vi.fn().mockReturnValue(of({ id: 1 })),
  };
  await TestBed.configureTestingModule({
    imports: [caso.pantalla],
    providers: [
      ...proveedoresDePantalla(),
      { provide: caso.servicio, useValue: servicio },
      {
        provide: AuthStateService,
        useValue: { usuario: () => ({ sucursal_id: 7 }) },
      },
      {
        provide: BUSCADOR_USUARIO,
        useValue: {
          buscar: () => of([]),
          obtener: () => of({ id: 1, nombre: 'Persona' }),
        },
      },
      {
        provide: ToastService,
        useValue: { success: vi.fn(), error: vi.fn(), warn: vi.fn() },
      },
    ],
  }).compileComponents();
  vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(caso.pantalla);
  fixture.detectChanges();
  const c = fixture.componentInstance;
  if (caso.servicio === EmpleadoService) poner(c, 'usuarioId', 1);
  if (caso.servicio === NominaService) {
    poner(c, 'periodoInicio', new Date(2026, 10, 1));
    poner(c, 'periodoFin', new Date(2026, 10, 15));
  }
  if (caso.servicio === PrestamoService) poner(c, 'monto', 100);
  return { fixture, c, servicio };
}
for (const caso of casos) {
  it(
    '50l fecha ' + caso.campo + ': envía el día local en America/Mexico_City',
    async () => {
      expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
        'America/Mexico_City',
      );
      const { c, servicio } = await preparar(caso);
      poner(c, caso.campo, new Date(2026, 10, 12, 23, 30));
      Reflect.get(c, caso.metodo).call(c);
      expect(Reflect.get(servicio, caso.api)).toHaveBeenCalledWith(
        expect.objectContaining({ [caso.payload]: '2026-11-12' }),
      );
    },
  );
  it(
    '50l fecha ' +
      caso.campo +
      ': carga YYYY-MM-DD en el calendario sin retroceder un día',
    async () => {
      const { fixture } = await preparar(caso);
      const adapter = fixture.debugElement.injector.get(DateAdapter);
      const fecha = adapter.deserialize('2026-11-12');
      expect(fecha?.getFullYear()).toBe(2026);
      expect(fecha?.getMonth()).toBe(10);
      expect(fecha?.getDate()).toBe(12);
    },
  );
}
