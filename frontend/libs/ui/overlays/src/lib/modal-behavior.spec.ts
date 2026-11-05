import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PantallaService } from '@nianva/ui-layout';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ModalComponent } from './modal/modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <button class="abrir" type="button" (click)="visible.set(true)">Abrir</button>
    <ui-modal
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      (cerrado)="cerrado.set(cerrado() + 1)"
      titulo="Editar producto"
      [tamano]="tamano()"
    >
      <p class="contenido">Contenido del modal</p>
      <button class="accion" acciones type="button">Guardar</button>
    </ui-modal>
  `,
})
class HostModalComponent {
  readonly visible = signal(false);
  readonly tamano = signal<'sm' | 'md' | 'lg'>('md');
  readonly cerrado = signal(0);
}

type Interno = {
  clase: () => string;
};

describe('ModalComponent comportamiento', () => {
  const angosta = signal(false);

  beforeEach(async () => {
    angosta.set(false);
    document.body.innerHTML = '';
    await TestBed.configureTestingModule({
      imports: [HostModalComponent],
      providers: [
        provideAnimationsAsync(),        { provide: PantallaService, useValue: { angosta: angosta.asReadonly() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function abrir(): Promise<ComponentFixture<HostModalComponent>> {
    const fixture = TestBed.createComponent(HostModalComponent);
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture;
  }

  async function esperarCierre(fixture: ComponentFixture<HostModalComponent>): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 250));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('abre, proyecta contenido y acciones, y cierra con el boton', async () => {
    const fixture = await abrir();

    expect(document.body.textContent).toContain('Editar producto');
    expect(document.body.textContent).toContain('Contenido del modal');
    expect(document.body.querySelector('ui-form-actions .accion')).not.toBeNull();

    const cerrar = document.body.querySelector('[aria-label="Cerrar"]') as HTMLButtonElement;
    expect(cerrar).not.toBeNull();
    cerrar.click();
    await esperarCierre(fixture);

    expect(fixture.componentInstance.visible()).toBe(false);
    expect(fixture.componentInstance.cerrado()).toBeGreaterThan(0);
  });

  it('cierra con Escape', async () => {
    const fixture = await abrir();

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(escape, 'which', { value: 27 });
    document.dispatchEvent(escape);
    await esperarCierre(fixture);

    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('usa el ancho de cada tamano y pantalla completa cuando angosta', async () => {
    const fixture = TestBed.createComponent(ModalComponent);
    const componente = fixture.componentInstance as unknown as Interno;

    fixture.componentRef.setInput('tamano', 'sm');
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-modal ui-overlay ui-overlay--sm');

    fixture.componentRef.setInput('tamano', 'lg');
    fixture.detectChanges();
    expect(componente.clase()).toContain('ui-overlay--lg');

    angosta.set(true);
    fixture.detectChanges();
    expect(componente.clase()).toBe('ui-modal ui-overlay ui-overlay--completo');

    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('.ui-overlay--completo')).not.toBeNull();
  });

  it('vuelve a enfocar el elemento que lo abrio al cerrar', async () => {
    const fixture = TestBed.createComponent(HostModalComponent);
    const abrir = fixture.nativeElement.querySelector('.abrir') as HTMLButtonElement;
    abrir.focus();
    fixture.componentInstance.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.visible.set(false);
    await esperarCierre(fixture);

    expect(document.activeElement).toBe(abrir);
  });

  it('no requiere style en la plantilla de quien lo usa', () => {
    const fixture = TestBed.createComponent(HostModalComponent);
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('ui-modal') as HTMLElement;

    expect(modal.getAttribute('style')).toBeNull();
  });
});
