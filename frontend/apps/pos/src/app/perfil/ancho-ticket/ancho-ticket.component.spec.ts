import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { PreferenciaTicketService } from '../../core/impresos/preferencia-ticket.service';
import { AnchoTicketComponent } from './ancho-ticket.component';

// UI-12: en Preferencias se elige el ancho del papel de tickets de esta terminal (58 u 80 mm).

describe('AnchoTicketComponent', () => {
  afterEach(() => localStorage.removeItem('nv-ancho-ticket'));

  function montar(): HTMLElement {
    TestBed.configureTestingModule({ imports: [AnchoTicketComponent] });
    const fixture = TestBed.createComponent(AnchoTicketComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('es un grupo con nombre y marca el ancho actual (80 mm sin preferencia)', () => {
    const raiz = montar();
    const marcado = raiz.querySelector<HTMLInputElement>('input[type="radio"]:checked');

    expect(raiz.querySelector('legend')?.textContent).toContain('Ancho del papel de tickets');
    expect(marcado?.labels?.[0]?.textContent).toContain('80 mm');
  });

  it('elegir 58 mm lo guarda como preferencia de esta terminal', () => {
    const raiz = montar();
    const opcion58 = [...raiz.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((radio) => radio.labels?.[0]?.textContent?.includes('58 mm'))!;

    opcion58.click();

    expect(TestBed.inject(PreferenciaTicketService).ancho()).toBe('ticket-58');
    expect(localStorage.getItem('nv-ancho-ticket')).toBe('ticket-58');
  });
});
