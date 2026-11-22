import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ESTILOS_IMPRESO } from '../estilos-impreso';
import { IMPRESO_DE_EJEMPLO as IMPRESO_DE_PRUEBA } from '../impreso-de-ejemplo';
import { Impreso } from '../impreso.types';
import { ImpresoComponent } from './impreso.component';

// UI-12: un solo encabezado y pie para todos los impresos (empresa, sucursal DEL DOCUMENTO, folio,
// fecha y usuario), con los datos de la foto del documento y sin recalcular; blanco y negro, sin
// tema; tres anchos.


describe('ImpresoComponent', () => {
  function montar(impreso: Impreso = IMPRESO_DE_PRUEBA, formato: 'ticket-58' | 'ticket-80' | 'carta' = 'ticket-80'): ComponentFixture<ImpresoComponent> {
    TestBed.configureTestingModule({ imports: [ImpresoComponent] });
    const fixture = TestBed.createComponent(ImpresoComponent);
    fixture.componentRef.setInput('impreso', impreso);
    fixture.componentRef.setInput('formato', formato);
    fixture.detectChanges();

    return fixture;
  }

  const texto = (fixture: ComponentFixture<ImpresoComponent>) => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  it('el encabezado lleva empresa, sucursal del documento, folio, fecha y usuario', () => {
    const contenido = texto(montar());

    for (const dato of ['Abarrotes La Esquina', 'AES010101AAA', 'Sucursal Centro', 'V-1-23', 'Vendedor Escenario', 'Ticket de venta']) {
      expect(contenido).toContain(dato);
    }
    expect(contenido).toMatch(/22\/11\/2026/);
  });

  it('pinta las lineas con su unidad, los totales y los pagos tal como vienen, sin recalcular', () => {
    const contenido = texto(montar());

    expect(contenido).toContain('Agua 1L');
    expect(contenido).toMatch(/2 pza/);
    expect(contenido).toMatch(/0\.5 kg/);
    expect(contenido).toContain('$90.00');
    expect(contenido).toContain('$18.00');
    expect(contenido).toContain('Efectivo');
    expect(contenido).toContain('Gracias por su compra');
  });

  it('el total destacado va resaltado', () => {
    const destacado = (montar().nativeElement as HTMLElement).querySelector('.ui-impreso__destacado');

    expect(destacado?.textContent).toContain('Total');
  });

  it.each(['ticket-58', 'ticket-80', 'carta'] as const)('el formato %s pone su clase de ancho', (formato) => {
    const raiz = (montar(IMPRESO_DE_PRUEBA, formato).nativeElement as HTMLElement).querySelector('.ui-impreso');

    expect(raiz?.classList.contains(`ui-impreso--${formato}`)).toBe(true);
  });

  it('sin RFC, telefono, fecha, usuario ni pie no deja huecos; sin folio lo dice', () => {
    const impreso: Impreso = {
      ...IMPRESO_DE_PRUEBA,
      encabezado: { empresa: 'Tienda', rfc: null, telefono: null, sucursal: 'Norte', folio: null, fecha: null, usuario: null },
      pie: null,
    };
    const raiz = montar(impreso).nativeElement as HTMLElement;

    expect(raiz.querySelectorAll('.ui-impreso__dato')).toHaveLength(2);
    expect(raiz.textContent).toContain('Folio sin folio');
    expect(raiz.textContent).not.toContain('Atendió');
    expect(raiz.querySelector('.ui-impreso__pie p')).toBeNull();
  });

  it('sin tabla (el comprobante de abono) solo muestra totales y pagos', () => {
    const raiz = montar({ ...IMPRESO_DE_PRUEBA, tabla: null }).nativeElement as HTMLElement;

    expect(raiz.querySelector('.ui-impreso__tabla')).toBeNull();
    expect(raiz.querySelector('.ui-impreso__totales')?.textContent).toContain('Total');
  });

  it('las columnas numericas van a la derecha', () => {
    const encabezados = [...(montar().nativeElement as HTMLElement).querySelectorAll('.ui-impreso__tabla th')];

    expect(encabezados.map((th) => th.classList.contains('ui-impreso__num'))).toEqual([false, true, true]);
  });

  it('los estilos son de blanco y negro, sin tokens del tema ni recursos de red', () => {
    expect(ESTILOS_IMPRESO).not.toContain('var(--');
    expect(ESTILOS_IMPRESO).not.toMatch(/url\(|@import|https?:/);
    expect(ESTILOS_IMPRESO).toContain('font-family: system-ui');
  });
});
