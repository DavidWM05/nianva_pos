import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ToastService } from '@nucleo/ui-shared';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CampanaService } from '../../campana.service';
import { Campana } from '../../campana.types';
import { CampanaFormComponent } from './campana-form.component';

describe('CampanaFormComponent', () => {
  let fixture: ComponentFixture<CampanaFormComponent>;
  let campanaService: { enviar: ReturnType<typeof vi.fn> };
  let toast: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };

  const campanaEnviada: Campana = {
    id: 1,
    asunto: 'Promo de verano',
    segmento: 'todos',
    destinatarios: 42,
    enviado_en: '2026-07-27T10:00:00Z',
    created_at: '2026-07-27T10:00:00Z',
  };

  async function crearComponente(): Promise<void> {
    campanaService = { enviar: vi.fn() };
    toast = { success: vi.fn(), error: vi.fn(), warn: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [CampanaFormComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        { provide: CampanaService, useValue: campanaService },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampanaFormComponent);
    fixture.detectChanges();
  }

  it('enviar() sin asunto o mensaje no llama al backend', async () => {
    await crearComponente();

    fixture.componentInstance.enviar();

    expect(campanaService.enviar).not.toHaveBeenCalled();
    expect(toast.warn).toHaveBeenCalled();
  });

  it('enviar() manda el payload y muestra la confirmacion con destinatarios', async () => {
    await crearComponente();
    campanaService.enviar.mockReturnValue(of(campanaEnviada));

    fixture.componentInstance['asunto'].set('Promo de verano');
    fixture.componentInstance['mensaje'].set('20% de descuento este fin de semana');
    fixture.componentInstance.enviar();

    expect(campanaService.enviar).toHaveBeenCalledWith({
      segmento: 'todos',
      asunto: 'Promo de verano',
      mensaje: '20% de descuento este fin de semana',
    });
    expect(fixture.componentInstance['ultimaEnviada']()).toEqual(campanaEnviada);
    expect(fixture.componentInstance['asunto']()).toBe('');
    expect(toast.success).toHaveBeenCalledWith('Campaña enviada a 42 cliente(s).');
  });
});
