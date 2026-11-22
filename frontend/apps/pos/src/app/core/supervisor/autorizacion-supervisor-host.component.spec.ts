import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthApiService } from '@nianva/domain-sesion';
import { Observable, of, throwError } from 'rxjs';

import { AutorizacionSupervisorHostComponent } from './autorizacion-supervisor-host.component';
import { AutorizacionSupervisorService, SolicitudSupervisor } from './autorizacion-supervisor.service';

// SEG-05: el dialogo elige al supervisor, pide su PIN y pide el token para el cuerpo exacto de la
// operacion. Un PIN incorrecto no cierra el dialogo; agotar los intentos no deja seguir.

const solicitud: SolicitudSupervisor = {
  accion: 'ventas.anular',
  recurso: '01J00000000000000000000000',
  datos: { motivo: 'Error de captura' },
  descripcion: 'Anular la venta #12',
};

function rechazo(codigo: string, status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { error_code: codigo, message: 'rechazo' } });
}

describe('AutorizacionSupervisorHostComponent', () => {
  let fixture: ComponentFixture<AutorizacionSupervisorHostComponent>;
  let servicio: AutorizacionSupervisorService;
  let supervisores: { id: number; nombre: string }[];
  let listarSupervisores: ReturnType<typeof vi.fn>;
  let solicitarAutorizacionSupervisor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    supervisores = [{ id: 3, nombre: 'Ana Supervisora' }];
    solicitarAutorizacionSupervisor = vi.fn((): Observable<unknown> => of({ token: 'token-1', vence_en: '2026-11-21T12:02:00Z' }));
    listarSupervisores = vi.fn(() => of(supervisores));
    TestBed.configureTestingModule({
      imports: [AutorizacionSupervisorHostComponent],
      providers: [
        { provide: AuthApiService, useValue: { solicitarAutorizacionSupervisor, listarSupervisores } },
      ],
    });
    fixture = TestBed.createComponent(AutorizacionSupervisorHostComponent);
    servicio = TestBed.inject(AutorizacionSupervisorService);
    fixture.detectChanges();
  });

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((contenedor) => (contenedor.innerHTML = '')));

  async function abrir(): Promise<{ token: () => string | null | undefined }> {
    let token: string | null | undefined;
    servicio.pedir(solicitud).subscribe((valor) => (token = valor));
    // Dos vueltas: abrir el dialogo y, luego, el valor del select que ngModel escribe asincrono.
    for (let vuelta = 0; vuelta < 2; vuelta += 1) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    fixture.detectChanges();

    return { token: () => token };
  }

  const dialogo = () => document.querySelector<HTMLElement>('.cdk-overlay-container .ui-modal');

  async function escribirPin(pin: string): Promise<void> {
    const entrada = dialogo()!.querySelector<HTMLInputElement>('.ui-input-pin__entrada')!;
    for (const digito of pin) {
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: digito, bubbles: true, cancelable: true }));
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function autorizar(): Promise<void> {
    dialogo()!.querySelector<HTMLFormElement>('form')!.requestSubmit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('pide a GET /supervisores los elegibles para la accion y el documento', async () => {
    await abrir();

    expect(listarSupervisores).toHaveBeenCalledWith('ventas.anular', '01J00000000000000000000000');
  });

  it('muestra que se autoriza y, con un solo supervisor, lo deja elegido', async () => {
    await abrir();

    expect(dialogo()?.textContent).toContain('Anular la venta #12 requiere la autorización de un supervisor.');
    expect(dialogo()?.textContent).toContain('Ana Supervisora');
  });

  it('pide el token con el supervisor, el PIN y el cuerpo exacto, y lo entrega', async () => {
    const { token } = await abrir();

    await escribirPin('2468');
    await autorizar();

    expect(solicitarAutorizacionSupervisor).toHaveBeenCalledWith({
      supervisor_id: 3,
      pin: '2468',
      accion: 'ventas.anular',
      recurso: '01J00000000000000000000000',
      datos: { motivo: 'Error de captura' },
    });
    expect(token()).toBe('token-1');
    expect(servicio.pendiente()).toBeNull();
  });

  it('un PIN incorrecto deja el dialogo abierto, avisa y limpia el PIN', async () => {
    solicitarAutorizacionSupervisor.mockReturnValueOnce(throwError(() => rechazo('supervisor_invalido', 403)));
    const { token } = await abrir();

    await escribirPin('1357');
    await autorizar();

    expect(token()).toBeUndefined();
    expect(dialogo()?.querySelector('[role="alert"]')?.textContent).toContain('El supervisor o el PIN no son válidos.');
    expect(dialogo()?.querySelector<HTMLInputElement>('.ui-input-pin__entrada')?.value).toBe('');
  });

  it('agotados los intentos, avisa y no deja volver a autorizar', async () => {
    solicitarAutorizacionSupervisor.mockReturnValueOnce(throwError(() => rechazo('supervisor_intentos_agotados', 429)));
    await abrir();

    await escribirPin('1357');
    await autorizar();
    await escribirPin('2468');
    await autorizar();

    expect(dialogo()?.querySelector('[role="alert"]')?.textContent).toContain('Se agotaron los intentos');
    expect(solicitarAutorizacionSupervisor).toHaveBeenCalledOnce();
  });

  it('sin supervisores elegibles, lo dice y no deja autorizar', async () => {
    supervisores = [];
    await abrir();

    await escribirPin('2468');
    await autorizar();

    expect(dialogo()?.querySelector('[role="alert"]')?.textContent).toContain('No hay supervisores');
    expect(solicitarAutorizacionSupervisor).not.toHaveBeenCalled();
  });

  it('Autorizar no depende de que se refleje el ultimo digito: Enter justo despues del PIN envia', async () => {
    await abrir();

    // Sin detectChanges entre el ultimo digito y el envio, como un Enter inmediato.
    const entrada = dialogo()!.querySelector<HTMLInputElement>('.ui-input-pin__entrada')!;
    for (const digito of '2468') {
      entrada.dispatchEvent(new KeyboardEvent('keydown', { key: digito, bubbles: true, cancelable: true }));
    }

    expect(dialogo()!.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('con menos de 4 digitos no pide el token y pide el PIN completo', async () => {
    await abrir();

    await escribirPin('24');
    await autorizar();

    expect(solicitarAutorizacionSupervisor).not.toHaveBeenCalled();
    expect(dialogo()?.querySelector('[role="alert"]')?.textContent).toContain('de 4 a 6 dígitos');
  });

  it('Cancelar entrega null', async () => {
    const { token } = await abrir();

    const cancelar = [...dialogo()!.querySelectorAll<HTMLButtonElement>('button')].find((boton) => boton.textContent?.trim() === 'Cancelar');
    cancelar!.click();
    fixture.detectChanges();

    expect(token()).toBeNull();
  });
});
