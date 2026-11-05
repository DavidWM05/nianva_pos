import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConfirmDialogHostComponent } from './confirm-dialog/confirm-dialog-host.component';
import { ConfirmDialogService } from './confirm-dialog/confirm-dialog.service';

describe('ConfirmDialogService comportamiento visible', () => {
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

  function boton(texto: string): HTMLButtonElement {
    const botonEncontrado = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidato) => candidato.textContent?.trim() === texto,
    );

    if (!botonEncontrado) {
      throw new Error(`No se encontro el boton ${texto}`);
    }

    return botonEncontrado;
  }

  it('muestra los textos y resuelve true al aceptar', async () => {
    const fixture = TestBed.createComponent(ConfirmDialogHostComponent);
    const servicio = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();

    const promesa = servicio.confirm({ message: 'Mensaje visible', header: 'Cabecera visible' });
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Mensaje visible');
    boton('Aceptar').click();

    await expect(promesa).resolves.toBe(true);
  });

  it('enfoca Cancelar al abrir el dialogo', async () => {
    const fixture = TestBed.createComponent(ConfirmDialogHostComponent);
    const servicio = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();

    const promesa = servicio.confirm({ message: 'Enfocar cancelar' });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 200));
    fixture.detectChanges();

    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar');

    boton('Cancelar').click();
    await promesa;
  });

  it('resuelve false al cancelar', async () => {
    const fixture = TestBed.createComponent(ConfirmDialogHostComponent);
    const servicio = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();

    const promesa = servicio.confirm({ message: 'Cancelar esta accion' });
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    boton('Cancelar').click();

    await expect(promesa).resolves.toBe(false);
  });

  it('muestra Eliminar objeto y Anular venta segun corresponda', async () => {
    const fixture = TestBed.createComponent(ConfirmDialogHostComponent);
    const servicio = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();

    void servicio.confirmarEliminacion({ objeto: 'producto' });
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Eliminar producto');
    boton('Cancelar').click();

    void servicio.confirmarEliminacion({ objeto: 'venta' });
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Anular venta');
    boton('Cancelar').click();
  });
});
