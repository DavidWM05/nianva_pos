import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../auth/auth.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { TemaPreferido, TemaService } from '../../core/tema.service';
import { MenuUsuarioComponent } from './menu-usuario.component';

describe('MenuUsuarioComponent', () => {
  let fixture: ComponentFixture<MenuUsuarioComponent>;
  let tema: { preferenciaActual: ReturnType<typeof signal<TemaPreferido>>; establecer: ReturnType<typeof vi.fn> };
  let auth: { logout: ReturnType<typeof vi.fn> };
  let authState: { usuario: ReturnType<typeof signal>; clear: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const preferencia = signal<TemaPreferido>('claro');
    tema = {
      preferenciaActual: preferencia,
      establecer: vi.fn((valor: TemaPreferido) => preferencia.set(valor)),
    };
    auth = { logout: vi.fn() };
    authState = { usuario: signal({ nombre: 'Vendedor', apellido: null }), clear: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MenuUsuarioComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: TemaService, useValue: tema },
        { provide: AuthService, useValue: auth },
        { provide: AuthStateService, useValue: authState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuUsuarioComponent);
    fixture.detectChanges();
  });

  const disparador = (): HTMLButtonElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]');
  // mat-menu pinta su panel en el overlay del CDK, fuera del componente.
  const panel = (): HTMLElement | null => document.querySelector<HTMLElement>('.cdk-overlay-container [role="menu"]');
  const opcion = (texto: string): HTMLElement | undefined =>
    [...(panel()?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])].find((e) => e.textContent?.trim() === texto);

  async function abrir(): Promise<void> {
    disparador()?.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('el boton lleva el nombre del usuario y un nombre accesible que dice que es su menu', () => {
    expect(disparador()?.textContent).toContain('Vendedor');
    expect(disparador()?.getAttribute('aria-label')).toBe('Menú de usuario: Vendedor');
  });

  it('el tema se ofrece como tres opciones de radio y la elegida queda marcada', async () => {
    await abrir();

    const radios = [...(panel()?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];

    expect(radios.map((r) => r.textContent?.trim())).toEqual(['Tema claro', 'Tema oscuro', 'Tema del sistema']);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
    expect(panel()?.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Tema');
  });

  it('elegir un tema lo guarda con TemaService y lo marca la proxima vez', async () => {
    await abrir();
    opcion('Tema oscuro')?.click();
    fixture.detectChanges();

    expect(tema.establecer).toHaveBeenCalledWith('oscuro');

    await abrir();
    expect(opcion('Tema oscuro')?.getAttribute('aria-checked')).toBe('true');
    expect(opcion('Tema claro')?.getAttribute('aria-checked')).toBe('false');
  });

  it('enlaza a Preferencias', async () => {
    await abrir();

    expect(opcion('Preferencias')?.getAttribute('href')).toBe('/perfil/preferencias');
  });

  it('"Cerrar sesión" llama a AuthService.logout, sin confirmacion', async () => {
    const respuesta = new Subject<void>();
    auth.logout.mockReturnValue(respuesta);
    await abrir();

    opcion('Cerrar sesión')?.click();

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(authState.clear).not.toHaveBeenCalled();
  });

  it('si el logout falla en el backend, igual limpia la sesion local y lleva a /login', async () => {
    auth.logout.mockReturnValue(throwError(() => new Error('500')));
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await abrir();

    opcion('Cerrar sesión')?.click();

    expect(authState.clear).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});
