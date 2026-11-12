import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PantallaService } from '@nianva/ui-layout';
import { beforeEach, describe, expect, it } from 'vitest';

import { SidebarComponent } from './sidebar.component';

// El boton de colapsar se busca por su rol y su nombre accesible, no por el componente que lo
// pinta: asi el spec vale igual con PrimeNG y con Material (50i).
describe('SidebarComponent: boton de colapsar', () => {
  const angosta = signal(false);

  beforeEach(() => {
    angosta.set(false);
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [provideRouter([]), { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } }],
    });
  });

  function crear() {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const boton = (nombre: string): HTMLButtonElement | null =>
      el.querySelector<HTMLButtonElement>(`.sidebar__header button[aria-label="${nombre}"]`);

    return { fixture, el, boton };
  }

  it('en pantalla ancha muestra "Colapsar menu" y al pulsarlo colapsa y pasa a "Expandir menu"', () => {
    const { fixture, el, boton } = crear();

    expect(boton('Colapsar menu')).not.toBeNull();
    boton('Colapsar menu')?.click();
    fixture.detectChanges();

    expect(el.querySelector('.sidebar')?.classList).toContain('sidebar--collapsed');
    expect(boton('Colapsar menu')).toBeNull();
    expect(boton('Expandir menu')).not.toBeNull();

    boton('Expandir menu')?.click();
    fixture.detectChanges();

    expect(el.querySelector('.sidebar')?.classList).not.toContain('sidebar--collapsed');
  });

  it('en pantalla angosta no hay boton de colapsar ni de expandir', () => {
    angosta.set(true);
    const { el } = crear();

    expect(el.querySelectorAll('.sidebar__header button').length).toBe(0);
  });

  it('al volver a pantalla ancha vuelve el boton y respeta el colapsado', () => {
    angosta.set(true);
    const { fixture, el, boton } = crear();

    fixture.componentInstance.toggleCollapsed();
    angosta.set(false);
    fixture.detectChanges();

    expect(el.querySelector('.sidebar')?.classList).toContain('sidebar--collapsed');
    expect(boton('Expandir menu')).not.toBeNull();
  });
});
