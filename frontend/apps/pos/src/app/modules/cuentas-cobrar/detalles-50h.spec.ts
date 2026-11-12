import { Type } from '@angular/core';
import { TestBed, DeferBlockBehavior } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  AuditLogSource,
  ToastService,
  ConfirmDialogService,
} from '@nianva/ui-shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { MetodoPagoService } from '../tpv/metodo-pago.service';
import { CuentaCobrarDetalleComponent } from '../cuentas-cobrar/pages/cuenta-cobrar-detalle/cuenta-cobrar-detalle.component';
import { CuentaCobrarService } from '../cuentas-cobrar/cuenta-cobrar.service';
import { CuentaPagarDetalleComponent } from '../cuentas-pagar/pages/cuenta-pagar-detalle/cuenta-pagar-detalle.component';
import { CuentaPagarService } from '../cuentas-pagar/cuenta-pagar.service';
import { GiftCardDetalleComponent } from '../gift-cards/pages/gift-card-detalle/gift-card-detalle.component';
import { GiftCardService } from '../gift-cards/gift-card.service';
import { NotaCreditoDetalleComponent } from '../notas-credito/pages/nota-credito-detalle/nota-credito-detalle.component';
import { NotaCreditoService } from '../notas-credito/nota-credito.service';
import { PlanPagoDetalleComponent } from '../ventas-plazos/pages/plan-pago-detalle/plan-pago-detalle.component';
import { PlanPagoService } from '../ventas-plazos/plan-pago.service';

const pantallas = [
  {
    nombre: 'cuentas-cobrar',
    componente: CuentaCobrarDetalleComponent,
    servicio: CuentaCobrarService,
  },
  {
    nombre: 'cuentas-pagar',
    componente: CuentaPagarDetalleComponent,
    servicio: CuentaPagarService,
  },
  {
    nombre: 'gift-cards',
    componente: GiftCardDetalleComponent,
    servicio: GiftCardService,
  },
  {
    nombre: 'notas-credito',
    componente: NotaCreditoDetalleComponent,
    servicio: NotaCreditoService,
  },
  {
    nombre: 'ventas-plazos',
    componente: PlanPagoDetalleComponent,
    servicio: PlanPagoService,
  },
];
for (const pantalla of pantallas) {
  describe('50h detalle ' + pantalla.nombre, () => {
    async function crear(falla = false) {
      const obtener = vi.fn().mockReturnValue(
        of({
          id: 5,
          cliente: null,
          proveedor: null,
          estado: 'pendiente',
          codigo: 'GC-E2E',
          created_at: '2026-11-01',
          fecha_inicio: '2026-11-01',
          monto_total: '100.00',
          monto_original: '100.00',
          saldo_pendiente: '100.00',
          saldo_disponible: '100.00',
          saldo_inicial: '100.00',
          saldo_actual: '100.00',
          interes_total: '0.00',
          numero_cuotas: 2,
          periodicidad: 'mensual',
          abonos: [],
          usos: [],
          cuotas: [],
          recargas: [],
        }),
      );
      if (falla)
        obtener.mockReturnValueOnce(throwError(() => new Error('404')));
      await TestBed.configureTestingModule({
        imports: [pantalla.componente],
        deferBlockBehavior: DeferBlockBehavior.Manual,
        providers: [
          ...proveedoresDePantalla(),
          { provide: pantalla.servicio, useValue: { obtener } },
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { paramMap: convertToParamMap({ id: '5' }) },
            },
          },
          { provide: MetodoPagoService, useValue: { listar: () => of([]) } },
          { provide: AuditLogSource, useValue: { listar: () => of([]) } },
          { provide: ConfirmDialogService, useValue: { confirm: vi.fn() } },
          {
            provide: ToastService,
            useValue: { error: vi.fn(), success: vi.fn() },
          },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(
        pantalla.componente as Type<object>,
      );
      fixture.detectChanges();
      return { fixture, obtener };
    }
    it('tiene un encabezado compartido y conserva los dos tabs', async () => {
      const { fixture } = await crear();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelectorAll('ui-page-header h1')).toHaveLength(1);
      expect(host.querySelectorAll('h1')).toHaveLength(1);
      expect(host.querySelectorAll('[role="tab"]')).toHaveLength(2);
    });
    if (pantalla.nombre !== 'notas-credito') {
      it('el envío del modal respeta los datos requeridos y el estado enviando', async () => {
        const { fixture } = await crear();
        const componente = fixture.componentInstance;
        const opciones = {
          'cuentas-cobrar': ['abrirAbono', 'montoAbono', 'abonando'],
          'cuentas-pagar': ['abrirPago', 'montoPago', 'pagando'],
          'gift-cards': ['abrirRecargar', 'montoRecarga', 'recargando'],
          'ventas-plazos': ['abrirPagarCuota', 'montoPago', 'pagando'],
        };
        const [abrir, monto, enviando] =
          opciones[pantalla.nombre as keyof typeof opciones];
        Reflect.get(componente, abrir).call(componente, {
          id: 1,
          numero_cuota: 1,
          monto: '100.00',
          fecha_vencimiento: '2030-01-01',
        });
        Reflect.get(componente, monto).set(0);
        fixture.detectChanges();
        const boton = document.querySelector<HTMLButtonElement>(
          'ui-modal ui-btn-enviar button, .cdk-overlay-container ui-btn-enviar button',
        );
        expect(boton).not.toBeNull();
        expect(boton?.disabled).toBe(true);
        Reflect.get(componente, monto).set(10);
        if (pantalla.nombre.startsWith('cuentas-'))
          Reflect.get(componente, 'metodoPagoElegido').set(1);
        fixture.detectChanges();
        expect(boton?.disabled).toBe(false);
        Reflect.get(componente, enviando).set(true);
        fixture.detectChanges();
        expect(boton?.disabled).toBe(true);
        expect(boton?.getAttribute('aria-busy')).toBe('true');
      });
    }

    it('un fallo ofrece reintento con el mismo id de la ruta', async () => {
      const { fixture, obtener } = await crear(true);
      const boton = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      ].find((b) => b.textContent?.includes('Reintentar'));
      expect(boton).toBeDefined();
      boton?.click();
      fixture.detectChanges();
      expect(obtener).toHaveBeenNthCalledWith(2, 5);
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          'nucleo-record-tabs',
        ),
      ).not.toBeNull();
    });
  });
}
