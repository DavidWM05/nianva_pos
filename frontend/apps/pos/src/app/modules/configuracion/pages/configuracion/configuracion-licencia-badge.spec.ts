import { TestBed } from '@angular/core/testing';
import { ToastService } from '@nianva/ui-shared';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { ConfiguracionService } from '../../configuracion.service';
import { LicenciaLocal } from '../../configuracion.types';
import { ConfiguracionComponent } from './configuracion.component';

// UI-06: el estado de la licencia se pinta con ui-badge y REGISTRO_ESTADOS (entidad "licencia").
describe('ConfiguracionComponent badge de licencia', () => {
  async function crear(estado: LicenciaLocal['estado']): Promise<HTMLElement> {
    const licencia: LicenciaLocal = {
      estado,
      tipo: 'saas',
      fecha_expiracion: '2027-01-01',
      ultima_validacion: '2026-07-25T00:00:00Z',
      dias_desde_ultima_validacion: 0,
      en_periodo_gracia: false,
    };

    await TestBed.configureTestingModule({
      imports: [ConfiguracionComponent],
      providers: [
        ...proveedoresDePantalla(),
        {
          provide: ConfiguracionService,
          useValue: {
            obtener: vi.fn().mockReturnValue(
              of({
                moneda: '$',
                mensaje_ticket: null,
                logo_url: null,
                mostrar_rfc: true,
                mostrar_telefono: true,
                mostrar_correo: true,
                backup_auto: false,
                backup_frecuencia: 'semanal',
                backup_ultimo: null,
                codigo_barras_automatico: false,
              }),
            ),
            actualizar: vi.fn(),
            obtenerSeguridad: vi.fn().mockReturnValue(of({ dias_dispositivo_normal: 30, dias_dispositivo_admin: 14, minutos_inactividad: 30 })),
            actualizarSeguridad: vi.fn(),
            obtenerLicencia: vi.fn().mockReturnValue(of(licencia)),
          },
        },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ConfiguracionComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  for (const [estado, tono, etiqueta] of [
    ['vencida', 'advertencia', 'Vencida'],
    ['revocada', 'peligro', 'Revocada'],
    ['prueba', 'info', 'Prueba'],
  ] as const) {
    it(`una licencia ${estado} pinta ui-badge en tono ${tono}`, async () => {
      const raiz = await crear(estado);
      const badge = raiz.querySelector('ui-badge .ui-badge');

      expect(badge?.classList.contains(`ui-badge--${tono}`)).toBe(true);
      expect(badge?.textContent?.trim()).toBe(etiqueta);
      expect(raiz.querySelector('nucleo-status-badge')).toBeNull();
    });
  }

  it('una licencia activa (estado normal) no pinta badge, pero dice su estado en texto', async () => {
    const raiz = await crear('activa');

    expect(raiz.querySelector('ui-badge')).not.toBeNull();
    expect(raiz.querySelector('ui-badge .ui-badge')).toBeNull();
    expect(raiz.textContent).toContain('Licencia activa');
  });

  it('una licencia no normal no dice "Licencia activa"', async () => {
    const raiz = await crear('vencida');

    expect(raiz.textContent).not.toContain('Licencia activa');
  });
});
