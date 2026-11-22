import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { PreferenciaTicketService } from './preferencia-ticket.service';

// UI-12: el ancho del ticket depende de la impresora de cada terminal (58 u 80 mm). Se recuerda en
// el dispositivo; sin preferencia, 80 mm.

describe('PreferenciaTicketService', () => {
  afterEach(() => localStorage.removeItem('nv-ancho-ticket'));

  it('sin preferencia guardada, el ticket es de 80 mm', () => {
    expect(TestBed.inject(PreferenciaTicketService).ancho()).toBe('ticket-80');
  });

  it('recuerda el ancho elegido en el dispositivo', () => {
    TestBed.inject(PreferenciaTicketService).establecer('ticket-58');
    TestBed.resetTestingModule();

    expect(TestBed.inject(PreferenciaTicketService).ancho()).toBe('ticket-58');
  });

  it('un valor desconocido en el almacenamiento vuelve a 80 mm', () => {
    localStorage.setItem('nv-ancho-ticket', 'carta');

    expect(TestBed.inject(PreferenciaTicketService).ancho()).toBe('ticket-80');
  });
});
