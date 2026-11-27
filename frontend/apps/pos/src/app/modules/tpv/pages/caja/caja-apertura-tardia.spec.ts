import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { CajaService, GastoService } from '@nianva/domain-tpv';
import { ToastService } from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { CajaComponent } from './caja.component';

describe('Apertura tardía de caja', () => {
  it('pide autorización sobre el original y reintenta con el mismo importe y llave', () => {
    const original = '01M8D5ZK1W9YBV5Q4VSBH0P545';
    const abrir = vi.fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({
        status: 403,
        error: { error_code: 'supervisor_requerido', consolidado_id: original },
      })))
      .mockReturnValueOnce(of({ id: 'caja' }));
    TestBed.configureTestingModule({
      imports: [CajaComponent],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: CajaService, useValue: { abrir, actual: () => of({
          sesion: null, resumen: null, permisos: { abrir: true },
        }) } },
        { provide: GastoService, useValue: { listar: () => of([]) } },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(CajaComponent);
    fixture.detectChanges();
    const monto = fixture.nativeElement.querySelector('#caja-monto-apertura') as HTMLInputElement;
    monto.value = '120';
    monto.dispatchEvent(new Event('input'));
    fixture.componentInstance.abrirCaja();

    const peticion = TestBed.inject(AutorizacionSupervisorService).pendiente();
    expect(peticion?.solicitud).toMatchObject({
      accion: 'caja.abrir_tardia', recurso: original, datos: { monto_apertura: 120 },
    });
    peticion?.resolver('token-apertura');
    expect(abrir.mock.calls[1]).toEqual([120, abrir.mock.calls[0][1], 'token-apertura']);
  });
});
