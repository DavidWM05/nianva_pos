import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ConfirmDialogService, ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClienteService } from '../../cliente.service';
import { Cliente, ClientesPagina } from '../../cliente.types';
import { ClientesListComponent } from './clientes-list.component';

describe('ClientesListComponent', () => {
  let fixture: ComponentFixture<ClientesListComponent>;
  let clienteService: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn> };
  let router: Router;

  const clientes: Cliente[] = [
    {
      id: 1,
      nombre: 'Ana Pérez',
      documento_fiscal: 'XAXX010101000',
      telefono: '555-0101',
      correo: 'ana@test.com',
      direccion: null,
      activo: true,
      es_sistema: false,
      fecha_registro: '2026-07-01T10:00:00Z',
    },
    {
      id: 2,
      nombre: 'Publico General',
      documento_fiscal: null,
      telefono: null,
      correo: null,
      direccion: null,
      activo: true,
      es_sistema: true,
      fecha_registro: '2026-01-01T10:00:00Z',
    },
  ];

  function paginaCon(permisos: ClientesPagina['permisos']): ClientesPagina {
    return { data: clientes, total: clientes.length, permisos };
  }

  async function crearComponente(permisos: ClientesPagina['permisos']): Promise<void> {
    clienteService = { listar: vi.fn().mockReturnValue(of(paginaCon(permisos))), desactivar: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ClientesListComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: ClienteService, useValue: clienteService },
        { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesListComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza los clientes de la primera carga', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('Publico General');
    expect(clienteService.listar).toHaveBeenCalledTimes(1);
  });

  it('oculta "Nuevo cliente" sin el permiso clientes.crear', async () => {
    await crearComponente({ crear: false, editar: true, eliminar: true });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Nuevo cliente');
  });

  it('muestra "Nuevo cliente" con el permiso', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Nuevo cliente');
  });

  it('"Nuevo cliente" navega a la vista dedicada, no abre un modal', async () => {
    await crearComponente({ crear: true, editar: false, eliminar: false });

    const enlace = (fixture.nativeElement as HTMLElement).querySelector('a[href="/crm/clientes/nuevo"]');
    expect(enlace).toBeTruthy();
  });

  it('el cliente es_sistema nunca muestra el boton de desactivar, aunque el usuario tenga el permiso', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: true });

    const botonesDesactivar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Desactivar"]');
    // Solo 1 fila (Ana Pérez) puede desactivarse -- "Publico General" es es_sistema.
    expect(botonesDesactivar.length).toBe(1);
  });

  it('sin el permiso clientes.eliminar, ninguna fila muestra el boton de desactivar', async () => {
    await crearComponente({ crear: true, editar: true, eliminar: false });

    const botonesDesactivar = (fixture.nativeElement as HTMLElement).querySelectorAll('[aria-label="Desactivar"]');
    expect(botonesDesactivar.length).toBe(0);
  });

  it('la busqueda (con debounce) vuelve a pedir la lista con el filtro de nombre', async () => {
    vi.useFakeTimers();
    await crearComponente({ crear: true, editar: true, eliminar: true });

    fixture.componentInstance.onBuscarInput('carlos');
    expect(clienteService.listar).toHaveBeenCalledTimes(1); // todavia no, esta en debounce

    vi.advanceTimersByTime(300);

    expect(clienteService.listar).toHaveBeenCalledTimes(2);
    expect(clienteService.listar).toHaveBeenLastCalledWith(expect.objectContaining({ first: 0 }), 'carlos');
  });
});
