import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MetodoPagoService } from '../metodo-pago.service';
import { LineasPagoCambio, LineasPagoComponent } from './lineas-pago.component';

describe('LineasPagoComponent', () => {
  let fixture: ComponentFixture<LineasPagoComponent>;

  async function crearComponente(montoObjetivo: number): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [LineasPagoComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        {
          provide: MetodoPagoService,
          useValue: { listar: vi.fn().mockReturnValue(of([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }, { id: 2, nombre: 'Tarjeta', tipo: 'tarjeta' }])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LineasPagoComponent);
    fixture.componentInstance.montoObjetivo = montoObjetivo;
    // ngOnChanges no se dispara solo -- normalmente lo llama Angular cuando
    // el binding [montoObjetivo] cambia desde una plantilla host; aqui no
    // hay plantilla host, asi que se llama a mano (mismo patron ya usado
    // en configuracion-seguridad-form.component.spec.ts).
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
  }

  it('un pago mixto que cuadra exactamente con montoObjetivo emite cuadra=true', async () => {
    await crearComponente(200);

    let emitido: LineasPagoCambio | undefined;
    fixture.componentInstance.cambio.subscribe((c) => (emitido = c));

    fixture.componentInstance.actualizarMetodoPago(0, 1);
    fixture.componentInstance.actualizarMontoPago(0, 120);
    fixture.componentInstance.agregarLineaPago();
    fixture.componentInstance.actualizarMetodoPago(1, 2);
    fixture.componentInstance.actualizarMontoPago(1, 80);

    expect(emitido).toEqual({
      pagos: [
        { metodo_pago_id: 1, monto: 120 },
        { metodo_pago_id: 2, monto: 80 },
      ],
      cuadra: true,
      suma: 200,
    });
  });

  it('un pago que no alcanza montoObjetivo emite cuadra=false', async () => {
    await crearComponente(200);

    let emitido: LineasPagoCambio | undefined;
    fixture.componentInstance.cambio.subscribe((c) => (emitido = c));

    fixture.componentInstance.actualizarMetodoPago(0, 1);
    fixture.componentInstance.actualizarMontoPago(0, 150);

    expect(emitido?.cuadra).toBe(false);
  });

  it('cambiar montoObjetivo re-evalua si los pagos ya capturados siguen cuadrando', async () => {
    await crearComponente(200);
    fixture.componentInstance.actualizarMetodoPago(0, 1);
    fixture.componentInstance.actualizarMontoPago(0, 200);

    let emitido: LineasPagoCambio | undefined;
    fixture.componentInstance.cambio.subscribe((c) => (emitido = c));

    fixture.componentInstance.montoObjetivo = 250;
    fixture.componentInstance.ngOnChanges();

    expect(emitido?.cuadra).toBe(false);
  });

  it('quitar una linea de pago recalcula la suma', async () => {
    await crearComponente(100);
    fixture.componentInstance.actualizarMetodoPago(0, 1);
    fixture.componentInstance.actualizarMontoPago(0, 60);
    fixture.componentInstance.agregarLineaPago();
    fixture.componentInstance.actualizarMetodoPago(1, 2);
    fixture.componentInstance.actualizarMontoPago(1, 40);

    let emitido: LineasPagoCambio | undefined;
    fixture.componentInstance.cambio.subscribe((c) => (emitido = c));

    fixture.componentInstance.quitarLineaPago(1);

    expect(emitido).toEqual({ pagos: [{ metodo_pago_id: 1, monto: 60 }], cuadra: false, suma: 60 });
  });

  it('reiniciar() vuelve a una sola linea vacia', async () => {
    await crearComponente(100);
    fixture.componentInstance.actualizarMetodoPago(0, 1);
    fixture.componentInstance.actualizarMontoPago(0, 100);

    fixture.componentInstance.reiniciar();

    expect(fixture.componentInstance['pagos']()).toEqual([{ metodo_pago_id: null, monto: null }]);
  });

  it('excluye Gift Card y Nota de Crédito del selector generico -- VentaController::store() los procesa aparte via gift_card_codigo/nota_credito_id, no como un metodo_pago_id mas', async () => {
    await TestBed.configureTestingModule({
      imports: [LineasPagoComponent],
      providers: [
        provideAnimationsAsync(),
        providePrimeNG(),
        {
          provide: MetodoPagoService,
          useValue: {
            listar: vi.fn().mockReturnValue(
              of([
                { id: 1, nombre: 'Efectivo', tipo: 'efectivo' },
                { id: 4, nombre: 'Gift Card', tipo: 'digital' },
                { id: 5, nombre: 'Nota de Crédito', tipo: 'digital' },
              ]),
            ),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LineasPagoComponent);
    fixture.componentInstance.montoObjetivo = 100;
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();

    expect(fixture.componentInstance['metodosPago']()).toEqual([{ id: 1, nombre: 'Efectivo', tipo: 'efectivo' }]);
  });
});
