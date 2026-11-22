import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthApiService } from '@nianva/domain-sesion';
import { ToastService } from '@nianva/ui-shared';
import { Observable, of, throwError } from 'rxjs';

import { PinCajaFormComponent } from './pin-caja-form.component';

// SEG-12: cada usuario da de alta o cambia su PIN de caja con su contrasena actual. Sin PIN no
// puede bloquear la terminal ni autorizar como supervisor.

describe('PinCajaFormComponent', () => {
  let fixture: ComponentFixture<PinCajaFormComponent>;
  let guardarPinCaja: ReturnType<typeof vi.fn>;
  let toastSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    guardarPinCaja = vi.fn((): Observable<void> => of(undefined));
    toastSuccess = vi.fn();
    TestBed.configureTestingModule({
      imports: [PinCajaFormComponent],
      providers: [
        { provide: AuthApiService, useValue: { guardarPinCaja } },
        { provide: ToastService, useValue: { success: toastSuccess } },
      ],
    });
    fixture = TestBed.createComponent(PinCajaFormComponent);
    fixture.detectChanges();
  });

  const raiz = () => fixture.nativeElement as HTMLElement;

  async function llenar(password: string, pin: string): Promise<void> {
    const entradaPassword = raiz().querySelector<HTMLInputElement>('input[type="password"]')!;
    entradaPassword.value = password;
    entradaPassword.dispatchEvent(new Event('input'));
    const entradaPin = raiz().querySelector<HTMLInputElement>('.ui-input-pin__entrada')!;
    for (const digito of pin) {
      entradaPin.dispatchEvent(new KeyboardEvent('keydown', { key: digito, bubbles: true, cancelable: true }));
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function guardar(): Promise<void> {
    raiz().querySelector<HTMLFormElement>('form')!.requestSubmit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('cada campo tiene su etiqueta', () => {
    expect(raiz().textContent).toContain('Tu contraseña');
    expect(raiz().textContent).toContain('Nuevo PIN de caja');
  });

  it('guarda con la contrasena actual y el PIN, avisa y limpia', async () => {
    await llenar('secreto-123', '2468');

    await guardar();

    expect(guardarPinCaja).toHaveBeenCalledWith('secreto-123', '2468');
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('PIN de caja'), expect.anything());
    expect(raiz().querySelector<HTMLInputElement>('.ui-input-pin__entrada')?.value).toBe('');
  });

  it('no envia con menos de 4 digitos', async () => {
    await llenar('secreto-123', '24');

    await guardar();

    expect(guardarPinCaja).not.toHaveBeenCalled();
  });

  it('muestra en su campo el error del servidor (PIN trivial o contrasena que no coincide)', async () => {
    guardarPinCaja.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { message: 'x', errors: { pin: ['El PIN no puede ser una secuencia o repetición.'] } },
          }),
      ),
    );
    await llenar('secreto-123', '1234');

    await guardar();

    expect(raiz().textContent).toContain('El PIN no puede ser una secuencia o repetición.');
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
