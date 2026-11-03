import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { PantallaService } from './pantalla.service';
import { ShellComponent } from './shell.component';

@Component({ standalone: true, template: '' })
class VaciaComponent {}

@Component({
  standalone: true,
  imports: [ShellComponent],
  template: `
    <ui-shell>
      <nav menu class="menu">Menu</nav>
      <span encabezado class="migas">Inicio</span>
      <p class="contenido">Pantalla</p>
    </ui-shell>
  `,
})
class AnfitrionComponent {}

describe('ShellComponent', () => {
  const angosta = signal(false);

  beforeEach(() => {
    angosta.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'otra', component: VaciaComponent }]),
        { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } },
      ],
    });
  });

  function crear() {
    const fixture = TestBed.createComponent(AnfitrionComponent);
    fixture.detectChanges();

    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const boton = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('.ui-shell__abrir');
  const menu = (el: HTMLElement) => el.querySelector<HTMLElement>('.ui-shell__menu');

  it('proyecta el menu, el encabezado y el contenido', () => {
    const { el } = crear();

    expect(el.querySelector('.ui-shell__menu .menu')).not.toBeNull();
    expect(el.querySelector('.ui-shell__encabezado .migas')).not.toBeNull();
    expect(el.querySelector('.ui-shell__contenido .contenido')).not.toBeNull();
  });

  it('en pantalla ancha el menu queda fijo y no hay boton para abrirlo', () => {
    const { el } = crear();

    expect(boton(el)).toBeNull();
    expect(menu(el)?.getAttribute('aria-hidden')).toBeNull();
  });

  it('en pantalla angosta el menu queda oculto hasta abrirlo con el boton', () => {
    angosta.set(true);
    const { fixture, el } = crear();

    expect(menu(el)?.getAttribute('aria-hidden')).toBe('true');
    expect(boton(el)?.getAttribute('aria-expanded')).toBe('false');

    boton(el)?.click();
    fixture.detectChanges();

    expect(menu(el)?.classList).toContain('ui-shell__menu--abierto');
    expect(menu(el)?.getAttribute('aria-hidden')).toBeNull();
    expect(boton(el)?.getAttribute('aria-expanded')).toBe('true');
  });

  it('el panel se cierra tocando fuera y con Escape', () => {
    angosta.set(true);
    const { fixture, el } = crear();

    boton(el)?.click();
    fixture.detectChanges();
    el.querySelector<HTMLElement>('.ui-shell__velo')?.click();
    fixture.detectChanges();
    expect(menu(el)?.classList).not.toContain('ui-shell__menu--abierto');

    boton(el)?.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(menu(el)?.classList).not.toContain('ui-shell__menu--abierto');
  });

  it('el panel se cierra al navegar', async () => {
    angosta.set(true);
    const { fixture, el } = crear();

    boton(el)?.click();
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/otra');
    fixture.detectChanges();

    expect(menu(el)?.classList).not.toContain('ui-shell__menu--abierto');
  });

  it('al pasar a pantalla ancha el panel no queda abierto', () => {
    angosta.set(true);
    const { fixture, el } = crear();

    boton(el)?.click();
    fixture.detectChanges();
    angosta.set(false);
    fixture.detectChanges();

    expect(menu(el)?.classList).not.toContain('ui-shell__menu--abierto');
  });
});
