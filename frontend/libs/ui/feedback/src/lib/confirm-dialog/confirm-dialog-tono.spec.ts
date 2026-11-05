import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConfirmDialogHostComponent } from './confirm-dialog-host.component';
import { ConfirmDialogService } from './confirm-dialog.service';

// Reemplaza a "usa el tono de peligro en el boton de aceptar" de confirm-dialog.service.spec.ts,
// retirado en el 49b porque leia las opciones de ConfirmationService de PrimeNG.
describe('ConfirmDialogService: tono del boton de aceptar', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogHostComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  async function abrir(accion: (servicio: ConfirmDialogService) => void): Promise<HTMLButtonElement> {
    const fixture = TestBed.createComponent(ConfirmDialogHostComponent);
    fixture.detectChanges();
    accion(TestBed.inject(ConfirmDialogService));
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    const aceptar = document.querySelector<HTMLButtonElement>('mat-dialog-actions button:not([data-cancelar])');

    if (aceptar === null) {
      throw new Error('No se encontro el boton de aceptar');
    }

    return aceptar;
  }

  it('confirmarEliminacion siempre usa el tono de peligro', async () => {
    const aceptar = await abrir((servicio) => void servicio.confirmarEliminacion({ objeto: 'producto' }));

    expect(aceptar.classList).toContain('ui-confirm-dialog__aceptar--peligro');
  });

  it('una confirmacion normal no usa el tono de peligro', async () => {
    const aceptar = await abrir((servicio) => void servicio.confirm({ message: 'Continuar' }));

    expect(aceptar.classList).not.toContain('ui-confirm-dialog__aceptar--peligro');
  });
});
