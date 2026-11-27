import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { urlApi } from '@nianva/core-http';
import { describe, expect, it } from 'vitest';

import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';
import { CajasRemotasComponent } from './cajas-remotas.component';

describe('CajasRemotasComponent', () => {
  it('omite importes durante el conteo ciego y presenta el resultado confirmado', () => {
    TestBed.configureTestingModule({
      imports: [CajasRemotasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(CajasRemotasComponent);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(urlApi('/caja/remotas')).flush({ data: [{
      id: 'caja-ciega', terminal: 'Caja ciega', fecha_operativa: '2026-11-26',
      metodos: [{ metodo_pago_id: 1, nombre: 'Efectivo' }],
    }] });
    fixture.detectChanges();
    const pantalla = fixture.nativeElement as HTMLElement;
    expect(pantalla.textContent).not.toMatch(/Teórico|Diferencia/);
    const campo = pantalla.querySelector('input');
    if (!campo) throw new Error('Falta el campo de conteo');
    campo.value = '49';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    pantalla.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
    http.expectOne(urlApi('/caja/caja-ciega/cerrar')).flush({ data: {
      folio: 'C-2', total_teorico: '50.00', monto_cierre: '49.00', diferencia: '-1.00',
    }, desglose: {} });
    fixture.detectChanges();
    expect(pantalla.textContent).toMatch(/Teórico.*50.00/);
    expect(pantalla.textContent).toMatch(/Contado.*49.00/);
    expect(pantalla.textContent).toMatch(/Diferencia.*-.*1.00/);
    http.verify();
  });

  it('solicita PIN con los conteos reales, conserva la llave y retira la caja cerrada', () => {
    TestBed.configureTestingModule({
      imports: [CajasRemotasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(CajasRemotasComponent);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne(urlApi('/caja/remotas')).flush({ data: [{
      id: 'caja-a', terminal: 'Caja A', fecha_operativa: '2026-11-26',
      metodos: [{ metodo_pago_id: 1, nombre: 'Efectivo', total_teorico: '50.00' }],
    }] });
    fixture.detectChanges();
    const campo = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    campo.value = '49';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement).click();

    const ruta = urlApi('/caja/caja-a/cerrar');
    const primerEnvio = http.expectOne(ruta);
    expect(primerEnvio.request.method).toBe('PATCH');
    expect(primerEnvio.request.body).toEqual({ conteos: [{ metodo_pago_id: 1, monto: 49 }] });
    primerEnvio.flush({ error_code: 'supervisor_requerido' }, { status: 403, statusText: 'Forbidden' });

    const peticion = TestBed.inject(AutorizacionSupervisorService).pendiente();
    expect(peticion?.solicitud).toMatchObject({ accion: 'caja.cerrar_remota', recurso: 'caja-a', datos: primerEnvio.request.body });
    peticion?.resolver('pin-validado');
    const segundoEnvio = http.expectOne(ruta);
    expect(segundoEnvio.request.headers.get('Idempotency-Key')).toBe(primerEnvio.request.headers.get('Idempotency-Key'));
    expect(segundoEnvio.request.headers.get('X-Autorizacion-Supervisor')).toBe('pin-validado');
    segundoEnvio.flush({ data: { folio: 'C-1' }, desglose: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('C-1');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    http.verify();
  });
});
