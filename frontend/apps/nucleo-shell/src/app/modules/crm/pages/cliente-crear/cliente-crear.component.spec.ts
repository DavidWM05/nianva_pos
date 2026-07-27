import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ClienteService } from '../../cliente.service';
import { ClienteCrearComponent } from './cliente-crear.component';

describe('ClienteCrearComponent', () => {
  let fixture: ComponentFixture<ClienteCrearComponent>;
  let clienteService: { crear: ReturnType<typeof vi.fn> };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;

  async function crearComponente(): Promise<void> {
    clienteService = { crear: vi.fn().mockReturnValue(of({ id: 7, nombre: 'Maria Lopez' })) };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ClienteCrearComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        provideRouter([]),
        { provide: ClienteService, useValue: clienteService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteCrearComponent);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  }

  it('al guardar, crea el cliente y navega a su detalle', async () => {
    await crearComponente();

    fixture.componentInstance.onGuardar({ nombre: 'Maria Lopez' });

    expect(clienteService.crear).toHaveBeenCalledWith({ nombre: 'Maria Lopez' });
    expect(toastService.success).toHaveBeenCalledWith('Cliente creado.');
    expect(router.navigate).toHaveBeenCalledWith(['/crm/clientes', 7]);
  });

  it('un error generico se reporta por toast, sin navegar', async () => {
    await crearComponente();
    clienteService.crear.mockReturnValue(throwError(() => ({ status: 500 })));

    fixture.componentInstance.onGuardar({ nombre: 'Maria Lopez' });

    expect(toastService.error).toHaveBeenCalledWith('No se pudo crear el cliente.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
