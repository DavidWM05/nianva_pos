import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ToastService } from '@nianva/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// jsdom no implementa ResizeObserver -- lo usa PrimeNG's TabList detras de
// RecordTabsComponent (ver el mismo stub en usuario-detalle.component.spec.ts).
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { ConfiguracionService } from '../../configuracion.service';
import { ConfiguracionSeguridad, ConfiguracionTenant, LicenciaLocal } from '../../configuracion.types';
import { ConfiguracionComponent } from './configuracion.component';

describe('ConfiguracionComponent', () => {
  let fixture: ComponentFixture<ConfiguracionComponent>;
  let configuracionService: {
    obtener: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    obtenerSeguridad: ReturnType<typeof vi.fn>;
    actualizarSeguridad: ReturnType<typeof vi.fn>;
    obtenerLicencia: ReturnType<typeof vi.fn>;
  };
  let toastService: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  const configuracion: ConfiguracionTenant = {
    moneda: '$',
    mensaje_ticket: 'Gracias por su compra',
    logo_url: null,
    mostrar_rfc: true,
    mostrar_telefono: true,
    mostrar_correo: true,
    backup_auto: false,
    backup_frecuencia: 'semanal',
    backup_ultimo: null,
    codigo_barras_automatico: false,
  };

  const configuracionSeguridad: ConfiguracionSeguridad = { dias_dispositivo_normal: 30, dias_dispositivo_admin: 14 };

  const licenciaActiva: LicenciaLocal = {
    estado: 'activa',
    tipo: 'saas',
    fecha_expiracion: '2027-01-01',
    ultima_validacion: '2026-07-25T00:00:00Z',
    dias_desde_ultima_validacion: 0,
    en_periodo_gracia: false,
  };

  async function crearComponente(
    respuesta: 'ok' | 'sin-permiso',
    respuestaSeguridad: 'ok' | 'sin-permiso' = 'ok',
    respuestaLicencia: 'ok' | 'sin-licencia' | LicenciaLocal = 'ok',
  ): Promise<void> {
    configuracionService = {
      obtener:
        respuesta === 'ok'
          ? vi.fn().mockReturnValue(of(configuracion))
          : vi.fn().mockReturnValue(throwError(() => ({ status: 403 }))),
      actualizar: vi.fn(),
      obtenerSeguridad:
        respuestaSeguridad === 'ok'
          ? vi.fn().mockReturnValue(of(configuracionSeguridad))
          : vi.fn().mockReturnValue(throwError(() => ({ status: 403 }))),
      actualizarSeguridad: vi.fn(),
      obtenerLicencia:
        respuestaLicencia === 'sin-licencia'
          ? vi.fn().mockReturnValue(throwError(() => ({ status: 404 })))
          : vi.fn().mockReturnValue(of(respuestaLicencia === 'ok' ? licenciaActiva : respuestaLicencia)),
    };
    toastService = { success: vi.fn(), error: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: ConfiguracionService, useValue: configuracionService },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();
  }

  it('renderiza los tabs Empresa y Licencia, con los valores de Empresa precargados', async () => {
    await crearComponente('ok');

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Empresa');
    expect(texto).toContain('Licencia');
    expect(fixture.nativeElement.querySelector('#moneda')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#mensaje_ticket')).not.toBeNull();
  });

  it('el tab Empresa tambien precarga los dias de dispositivo confiable', async () => {
    await crearComponente('ok');

    expect(fixture.nativeElement.querySelector('#dias_dispositivo_normal')).not.toBeNull();
  });

  it('guarda la configuracion del tenant y refleja la respuesta del backend', async () => {
    await crearComponente('ok');
    const actualizada = { ...configuracion, moneda: 'USD' };
    configuracionService.actualizar.mockReturnValue(of(actualizada));

    fixture.componentInstance.onGuardar({
      moneda: 'USD',
      mensaje_ticket: 'Gracias por su compra',
      logo_url: null,
      mostrar_rfc: true,
      mostrar_telefono: true,
      mostrar_correo: true,
      backup_auto: false,
      backup_frecuencia: 'semanal',
      codigo_barras_automatico: false,
    });
    fixture.detectChanges();

    expect(configuracionService.actualizar).toHaveBeenCalled();
    expect(toastService.success).toHaveBeenCalledWith('Configuración guardada.');
  });

  it('guarda los dias de dispositivo confiable de forma independiente', async () => {
    await crearComponente('ok');
    const actualizada = { ...configuracionSeguridad, dias_dispositivo_normal: 45 };
    configuracionService.actualizarSeguridad.mockReturnValue(of(actualizada));

    fixture.componentInstance.onGuardarSeguridad(actualizada);
    fixture.detectChanges();

    expect(configuracionService.actualizarSeguridad).toHaveBeenCalledWith(actualizada);
    expect(toastService.success).toHaveBeenCalledWith('Configuración guardada.');
  });

  it('sin permiso configuracion.editar, oculta solo la seccion de Empresa (no los dias, gateados aparte)', async () => {
    await crearComponente('sin-permiso', 'ok');

    expect(fixture.nativeElement.querySelector('#moneda')).toBeNull();
    expect(fixture.nativeElement.querySelector('#dias_dispositivo_normal')).not.toBeNull();
  });

  it('sin ningun permiso, la pantalla sigue montada (tabs visibles) pero ninguna seccion del tab Empresa', async () => {
    await crearComponente('sin-permiso', 'sin-permiso');

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para ver esta sección.');
    expect(fixture.nativeElement.querySelector('#moneda')).toBeNull();
    expect(fixture.nativeElement.querySelector('#dias_dispositivo_normal')).toBeNull();
  });

  it('el tab Licencia muestra el estado real de la licencia', async () => {
    await crearComponente('ok');

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('activa');
    expect(texto).toContain('saas');
    expect(fixture.nativeElement.querySelector('nucleo-status-badge')).not.toBeNull();
  });

  it('el tab Licencia muestra un aviso claro cuando esta en periodo de gracia', async () => {
    await crearComponente('ok', 'ok', { ...licenciaActiva, en_periodo_gracia: true, dias_desde_ultima_validacion: 3 });

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Última validación exitosa hace 3');
    expect(texto).toContain('reintentando conexión');
  });

  it('sin licencia registrada (404), el tab Licencia lo dice explicitamente', async () => {
    await crearComponente('ok', 'ok', 'sin-licencia');

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('todavía no tiene una licencia activada');
  });
});
