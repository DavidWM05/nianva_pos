import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ApartadoService } from '../../apartado.service';
import { Apartado, ApartadosListaPermisos, ApartadosPagina } from '../../apartado.types';
import { ApartadosListComponent } from './apartados-list.component';

describe('ApartadosListComponent', () => {
  let fixture: ComponentFixture<ApartadosListComponent>;
  let apartadoService: { listar: ReturnType<typeof vi.fn> };

  const hoy = new Date();
  const fechaISO = (diasDesdeHoy: number): string => {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + diasDesdeHoy);

    return fecha.toISOString().slice(0, 10);
  };

  const apartados: Apartado[] = [
    {
      id: 1,
      fecha_creacion: '2026-07-01T10:00:00.000000Z',
      cliente: { id: 9, nombre: 'Maria Lopez' },
      total: '600.00',
      total_abonado: '480.00',
      estado: 'activo',
      fecha_vencimiento: fechaISO(3),
      fecha_completado: null,
      fecha_cancelado: null,
      motivo_cancelacion: null,
      venta_id: null,
      notas: null,
    },
    {
      id: 2,
      fecha_creacion: '2026-06-01T10:00:00.000000Z',
      cliente: { id: 10, nombre: 'Juan Perez' },
      total: '300.00',
      total_abonado: '100.00',
      estado: 'activo',
      fecha_vencimiento: fechaISO(-5),
      fecha_completado: null,
      fecha_cancelado: null,
      motivo_cancelacion: null,
      venta_id: null,
      notas: null,
    },
  ];

  function paginaCon(permisos: ApartadosListaPermisos): ApartadosPagina {
    return { data: apartados, total: apartados.length, permisos };
  }

  async function crearComponente(permisos: ApartadosListaPermisos): Promise<void> {
    apartadoService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))) };

    await TestBed.configureTestingModule({
      imports: [ApartadosListComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: ApartadoService, useValue: apartadoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApartadosListComponent);
    fixture.detectChanges();
  }

  it('renderiza cliente y el avance de abono como "480.00 / 600.00"', async () => {
    await crearComponente({ crear: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Maria Lopez');
    expect(texto).toContain('$480.00 / $600.00');
  });

  it('calcula el porcentaje de avance para la barra de progreso', async () => {
    await crearComponente({ crear: true });

    expect(fixture.componentInstance['porcentajeAbonado'](apartados[0])).toBe(80);
  });

  it('marca un apartado vencido y uno proximo a vencer', async () => {
    await crearComponente({ crear: true });

    expect(fixture.componentInstance['estadoVencimiento'](apartados[0])).toBe('proximo');
    expect(fixture.componentInstance['estadoVencimiento'](apartados[1])).toBe('vencido');
  });

  it('oculta "Nuevo apartado" sin el permiso apartados.crear', async () => {
    await crearComponente({ crear: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo apartado');
  });
});
