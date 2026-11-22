import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ESTILOS_IMPRESO } from './estilos-impreso';
import { IMPRESO_DE_EJEMPLO as IMPRESO_DE_PRUEBA } from './impreso-de-ejemplo';
import { ImpresionService } from './impresion.service';

// UI-12 y SEG-06: un solo servicio imprime todos los documentos en un iframe oculto, con los
// estilos del impreso y sin recursos de red. No hace peticiones: imprimir dos veces seguidas no
// vuelve a cobrar ni depende del token CSRF de la sesion (L-11).

describe('ImpresionService', () => {
  afterEach(() => document.getElementById(ImpresionService.ID_MARCO)?.remove());

  function imprimirCon(folio: string, formato: 'ticket-58' | 'ticket-80' | 'carta' = 'ticket-80') {
    const servicio = TestBed.inject(ImpresionService);
    const impreso = { ...IMPRESO_DE_PRUEBA, encabezado: { ...IMPRESO_DE_PRUEBA.encabezado, folio } };
    servicio.imprimir(impreso, formato);

    return document.getElementById(ImpresionService.ID_MARCO) as HTMLIFrameElement | null;
  }

  it('pinta el impreso en un iframe oculto con sus estilos y abre la impresion una vez', () => {
    const print = vi.fn();
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({ focus: vi.fn(), print } as unknown as Window);
    const marco = imprimirCon('V-1-23');
    vi.restoreAllMocks();

    const documento = marco!.contentDocument!;
    expect(marco!.getAttribute('aria-hidden')).toBe('true');
    expect(documento.querySelector('style')?.textContent).toContain(ESTILOS_IMPRESO.trim().slice(0, 40));
    expect(documento.body.textContent).toContain('V-1-23');
    expect(documento.body.textContent).toContain('Sucursal Centro');
    expect(documento.querySelector('.ui-impreso--ticket-80')).not.toBeNull();
    expect(print).toHaveBeenCalledOnce();
  });

  it('dos impresiones seguidas reusan el mismo iframe y la segunda reemplaza a la primera', () => {
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({ focus: vi.fn(), print: vi.fn() } as unknown as Window);
    imprimirCon('V-1-23');
    const marco = imprimirCon('V-1-24', 'carta');
    vi.restoreAllMocks();

    expect(document.querySelectorAll(`#${ImpresionService.ID_MARCO}`)).toHaveLength(1);
    expect(marco!.contentDocument!.body.textContent).toContain('V-1-24');
    expect(marco!.contentDocument!.body.textContent).not.toContain('V-1-23');
    expect(marco!.contentDocument!.querySelector('.ui-impreso--carta')).not.toBeNull();
  });

  it('el titulo del documento (nombre del archivo al guardar en PDF) lleva el folio, escapado', () => {
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue({ focus: vi.fn(), print: vi.fn() } as unknown as Window);
    const marco = imprimirCon('V-1-<23>');
    vi.restoreAllMocks();

    expect(marco!.contentDocument!.title).toBe('Ticket de venta V-1-<23>');
    expect(marco!.contentDocument!.querySelector('title')?.innerHTML).toBe('Ticket de venta V-1-&lt;23&gt;');
  });
});
