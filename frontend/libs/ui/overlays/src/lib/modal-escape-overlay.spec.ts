import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { PantallaService } from '@nianva/ui-layout';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ModalComponent } from './modal/modal.component';

// 50l: el alta modal de empleados y nominas tiene un matDatepicker. Escape cerraba el calendario
// y tambien el modal, porque ui-modal escucha Escape en todo el documento sin mirar si un
// overlay interno ya lo atendio (preventDefault): se perdia lo escrito en el formulario.
@Component({
  standalone: true,
  imports: [ModalComponent, MatDatepickerModule, MatInputModule],
  template: `
    <ui-modal [visible]="visible()" (visibleChange)="visible.set($event)" titulo="Nuevo empleado">
      <input matInput [matDatepicker]="calendario" aria-label="Fecha de ingreso" />
      <mat-datepicker #calendario />
    </ui-modal>
  `,
})
class HostModalConFechaComponent {
  readonly visible = signal(false);
  readonly calendario = viewChild.required<MatDatepicker<Date>>('calendario');
}

describe('ModalComponent: Escape con un overlay interno abierto', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
    await TestBed.configureTestingModule({
      imports: [HostModalConFechaComponent],
      providers: [
        provideAnimationsAsync(),
        provideNativeDateAdapter(),
        { provide: PantallaService, useValue: { angosta: signal(false).asReadonly() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function estabilizar(fixture: ComponentFixture<HostModalConFechaComponent>): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 250));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function abrirModal(): Promise<ComponentFixture<HostModalConFechaComponent>> {
    const fixture = TestBed.createComponent(HostModalConFechaComponent);
    fixture.componentInstance.visible.set(true);
    await estabilizar(fixture);

    return fixture;
  }

  function escape(): KeyboardEvent {
    const evento = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    Object.defineProperty(evento, 'keyCode', { value: 27 });
    Object.defineProperty(evento, 'which', { value: 27 });

    return evento;
  }

  it('Escape cierra el calendario abierto y deja el modal abierto', async () => {
    const fixture = await abrirModal();
    const calendario = fixture.componentInstance.calendario();
    calendario.open();
    await estabilizar(fixture);
    expect(calendario.opened).toBe(true);

    ((document.activeElement as HTMLElement | null) ?? document.body).dispatchEvent(escape());
    await estabilizar(fixture);

    expect(calendario.opened).toBe(false);
    expect(fixture.componentInstance.visible()).toBe(true);
  });

  it('sin overlay interno abierto, Escape sigue cerrando el modal', async () => {
    const fixture = await abrirModal();

    ((document.activeElement as HTMLElement | null) ?? document.body).dispatchEvent(escape());
    await estabilizar(fixture);

    expect(fixture.componentInstance.visible()).toBe(false);
  });
});
