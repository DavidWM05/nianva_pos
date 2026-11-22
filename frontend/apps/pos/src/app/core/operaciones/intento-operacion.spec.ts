import { firstValueFrom, of, throwError } from 'rxjs';

import { IntentoOperacion } from './intento-operacion';

// API-07: la misma llave en un reintento incierto y una llave nueva tras confirmar. SEG-05: el
// token del supervisor vale solo para el cuerpo que autorizo.

describe('IntentoOperacion', () => {
  it('reusa la llave mientras el cuerpo no cambie y no se haya confirmado', () => {
    const intento = new IntentoOperacion();

    const primera = intento.preparar({ total: 10, items: [{ id: 1 }] });
    const reintento = intento.preparar({ items: [{ id: 1 }], total: 10 });

    expect(primera).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(reintento).toBe(primera);
  });

  it('da una llave nueva si el cuerpo cambia', () => {
    const intento = new IntentoOperacion();

    const primera = intento.preparar({ total: 10 });
    const otra = intento.preparar({ total: 11 });

    expect(otra).not.toBe(primera);
  });

  it('da una llave nueva tras confirmar, aunque el cuerpo sea el mismo', () => {
    const intento = new IntentoOperacion();

    const primera = intento.preparar({ total: 10 });
    intento.confirmar();

    expect(intento.preparar({ total: 10 })).not.toBe(primera);
  });

  it('conserva el token del supervisor solo para el mismo cuerpo', () => {
    const intento = new IntentoOperacion();

    intento.preparar({ total: 10 });
    intento.autorizar('token-1');
    intento.preparar({ total: 10 });
    expect(intento.token).toBe('token-1');

    intento.preparar({ total: 12 });
    expect(intento.token).toBeUndefined();
  });

  it('ejecutar() manda la llave del cuerpo, la conserva si falla y la descarta al confirmar', async () => {
    const intento = new IntentoOperacion();
    const llaves: string[] = [];
    const fallaUnaVez = vi
      .fn()
      .mockImplementationOnce((llave: string) => {
        llaves.push(llave);
        return throwError(() => new Error('sin respuesta'));
      })
      .mockImplementation((llave: string) => {
        llaves.push(llave);
        return of('ok');
      });

    await expect(firstValueFrom(intento.ejecutar({ total: 10 }, fallaUnaVez))).rejects.toThrow('sin respuesta');
    await firstValueFrom(intento.ejecutar({ total: 10 }, fallaUnaVez));
    await firstValueFrom(intento.ejecutar({ total: 10 }, fallaUnaVez));

    expect(llaves[1]).toBe(llaves[0]);
    expect(llaves[2]).not.toBe(llaves[1]);
  });
});
