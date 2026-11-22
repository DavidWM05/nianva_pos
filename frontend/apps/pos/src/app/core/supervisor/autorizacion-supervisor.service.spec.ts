import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom, of, throwError, toArray } from 'rxjs';

import { IntentoOperacion } from '../operaciones/intento-operacion';
import { AutorizacionSupervisorService, SolicitudSupervisor } from './autorizacion-supervisor.service';

// SEG-05 (F4-7): el servidor decide cuando hace falta un supervisor (umbral de descuento y de
// descuadre, que el frontend no conoce) y responde 403 supervisor_requerido. La pantalla pide el
// PIN y reintenta el mismo cuerpo con la misma llave (API-07) y el token.

function rechazo(codigo: string, status = 403): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { error_code: codigo, message: 'rechazo' } });
}

const solicitud: SolicitudSupervisor = {
  accion: 'ventas.anular',
  recurso: '01J00000000000000000000000',
  datos: { motivo: 'Error de captura' },
  descripcion: 'Anular la venta #12',
};

describe('AutorizacionSupervisorService.ejecutar', () => {
  let servicio: AutorizacionSupervisorService;
  let llamadas: { llave: string; token: string | undefined }[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(AutorizacionSupervisorService);
    llamadas = [];
  });

  /** Una operacion que responde con `respuestas` en orden y anota llave y token. */
  function operacion(...respuestas: (() => Observable<string>)[]) {
    return (llave: string, token?: string) => {
      llamadas.push({ llave, token });
      return (respuestas.shift() ?? (() => of('ok')))();
    };
  }

  it('sin supervisor: una sola llamada, sin dialogo, y la siguiente operacion lleva llave nueva', async () => {
    const intento = new IntentoOperacion();

    await firstValueFrom(servicio.ejecutar(intento, solicitud, operacion()));
    await firstValueFrom(servicio.ejecutar(intento, solicitud, operacion()));

    expect(servicio.pendiente()).toBeNull();
    expect(llamadas.map((llamada) => llamada.token)).toEqual([undefined, undefined]);
    expect(llamadas[1].llave).not.toBe(llamadas[0].llave);
  });

  it('con supervisor: pide la autorizacion y reintenta con la misma llave y el token', async () => {
    const intento = new IntentoOperacion();
    const resultado = firstValueFrom(
      servicio.ejecutar(intento, solicitud, operacion(() => throwError(() => rechazo('supervisor_requerido')))),
    );

    expect(servicio.pendiente()?.solicitud).toBe(solicitud);
    servicio.pendiente()?.resolver('token-1');

    await expect(resultado).resolves.toBe('ok');
    expect(llamadas).toEqual([
      { llave: llamadas[0].llave, token: undefined },
      { llave: llamadas[0].llave, token: 'token-1' },
    ]);
    expect(servicio.pendiente()).toBeNull();
  });

  it('si se cancela el dialogo, termina sin emitir y sin reintentar', async () => {
    const intento = new IntentoOperacion();
    const emitidos = firstValueFrom(
      servicio
        .ejecutar(intento, solicitud, operacion(() => throwError(() => rechazo('supervisor_requerido'))))
        .pipe(toArray()),
    );

    servicio.pendiente()?.resolver(null);

    await expect(emitidos).resolves.toEqual([]);
    expect(llamadas).toHaveLength(1);
  });

  it('un reintento incierto del mismo cuerpo reusa llave y token; si el cuerpo cambia, llave nueva y sin token', async () => {
    const intento = new IntentoOperacion();
    const caida = () => throwError(() => new HttpErrorResponse({ status: 0 }));

    const primero = firstValueFrom(
      servicio.ejecutar(intento, solicitud, operacion(() => throwError(() => rechazo('supervisor_requerido')), caida)),
    );
    servicio.pendiente()?.resolver('token-1');
    await expect(primero).rejects.toBeInstanceOf(HttpErrorResponse);

    await firstValueFrom(servicio.ejecutar(intento, solicitud, operacion(caida)).pipe(toArray())).catch(() => undefined);
    const otroCuerpo = { ...solicitud, datos: { motivo: 'Otro motivo' } };
    await firstValueFrom(servicio.ejecutar(intento, otroCuerpo, operacion()));

    expect(llamadas[2]).toEqual({ llave: llamadas[0].llave, token: 'token-1' });
    expect(llamadas[3].llave).not.toBe(llamadas[0].llave);
    expect(llamadas[3].token).toBeUndefined();
  });

  it('otro rechazo se propaga sin abrir el dialogo', async () => {
    const intento = new IntentoOperacion();

    await expect(
      firstValueFrom(servicio.ejecutar(intento, solicitud, operacion(() => throwError(() => rechazo('venta_ya_anulada', 422))))),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(servicio.pendiente()).toBeNull();
  });
});
