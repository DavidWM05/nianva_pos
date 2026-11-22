import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PuertoCajon } from './puerto-cajon';

// F4-2: el cajon es un puerto sin implementacion real hasta que haya hardware para probar el
// adaptador ESC/POS. Mientras tanto, el driver de la impresora puede abrirlo al imprimir.

describe('PuertoCajon', () => {
  it('sin adaptador, abrir() termina sin hacer nada y avisa que no hay cajon conectado', async () => {
    const cajon = TestBed.inject(PuertoCajon);

    await expect(cajon.abrir()).resolves.toBeUndefined();
    expect(cajon.disponible).toBe(false);
  });

  it('una app puede proveer su adaptador en lugar del de omision', async () => {
    let abierto = false;
    // Con su propio @Injectable(): sin el, heredaria la fabrica del puerto (el de omision).
    @Injectable()
    class CajonDePrueba extends PuertoCajon {
      readonly disponible = true;
      async abrir(): Promise<void> {
        abierto = true;
      }
    }
    TestBed.configureTestingModule({ providers: [{ provide: PuertoCajon, useClass: CajonDePrueba }] });

    await TestBed.inject(PuertoCajon).abrir();

    expect(abierto).toBe(true);
  });
});
