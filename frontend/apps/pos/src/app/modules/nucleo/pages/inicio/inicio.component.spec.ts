import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CajaActual } from '../../../tpv/caja.types';
import { CajaService } from '../../../tpv/caja.service';
import { InicioResumen } from '../../inicio.types';
import { InicioService } from '../../inicio.service';
import { InicioComponent } from './inicio.component';

describe('InicioComponent', () => {
  let fixture: ComponentFixture<InicioComponent>;

  const resumen: InicioResumen = {
    ventas_hoy: { cantidad: 3, total: 450.5 },
    apartados_por_vencer: [
      { id: 1, cliente_nombre: 'Ana Pérez', fecha_vencimiento: '2026-07-25', total: '200.00', total_abonado: '50.00' },
    ],
  };

  async function crearComponente(caja: CajaActual): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([]),
        { provide: InicioService, useValue: { resumen: vi.fn().mockReturnValue(of(resumen)) } },
        { provide: CajaService, useValue: { actual: vi.fn().mockReturnValue(of(caja)) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
  }

  it('renderiza el resumen de ventas de hoy', async () => {
    await crearComponente({ sesion: null, resumen: null, permisos: { abrir: true, cerrar: false, gastos_ver: false, gastos_crear: false } });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('3');
    expect(texto).toContain('450.5');
  });

  it('muestra "Cerrada" y un link para abrir caja cuando no hay sesion abierta', async () => {
    await crearComponente({ sesion: null, resumen: null, permisos: { abrir: true, cerrar: false, gastos_ver: false, gastos_crear: false } });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Cerrada');
    expect(texto).toContain('Abrir caja');
  });

  it('muestra "Abierta" y el resumen de ventas de la sesion cuando hay una caja abierta', async () => {
    const cajaAbierta: CajaActual = {
      sesion: {
        id: 1,
        sucursal_id: 1,
        usuario_id: 1,
        monto_apertura: '0.00',
        monto_cierre: null,
        total_ventas_sistema: null,
        diferencia: null,
        fecha_apertura: '2026-07-23T08:00:00Z',
        fecha_cierre: null,
        estado: 'abierta',
      },
      resumen: { ventas_count: 5, total_ventas: 800, total_gastos: 0 },
      permisos: { abrir: false, cerrar: true, gastos_ver: true, gastos_crear: true },
    };

    await crearComponente(cajaAbierta);

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Abierta');
    expect(texto).toContain('5 ventas');
  });

  it('renderiza los apartados por vencer con link al detalle', async () => {
    await crearComponente({ sesion: null, resumen: null, permisos: { abrir: true, cerrar: false, gastos_ver: false, gastos_crear: false } });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana Pérez');

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/apartados/1"]');
    expect(enlace).toBeTruthy();
  });

  it('sin apartados por vencer, muestra el aviso en vez de la lista', async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [
        provideRouter([]),
        {
          provide: InicioService,
          useValue: { resumen: vi.fn().mockReturnValue(of({ ...resumen, apartados_por_vencer: [] })) },
        },
        {
          provide: CajaService,
          useValue: {
            actual: vi.fn().mockReturnValue(
              of({ sesion: null, resumen: null, permisos: { abrir: true, cerrar: false, gastos_ver: false, gastos_crear: false } }),
            ),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No hay apartados próximos a vencer.');
  });
});
