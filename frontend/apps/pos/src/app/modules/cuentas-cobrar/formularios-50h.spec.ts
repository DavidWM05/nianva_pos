import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ToastService } from '@nianva/ui-shared';
import { vi } from 'vitest';
import { of as observableDe } from 'rxjs';
import { describe, expect, it } from 'vitest';
import {
  BUSCADOR_CLIENTE,
  BUSCADOR_VENTA,
} from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { GiftCardFormComponent } from '../gift-cards/pages/gift-card-form/gift-card-form.component';
import { GiftCardService } from '../gift-cards/gift-card.service';
import { PlanPagoFormComponent } from '../ventas-plazos/pages/plan-pago-form/plan-pago-form.component';
import { PlanPagoService } from '../ventas-plazos/plan-pago.service';

for (const pantalla of [
  {
    nombre: 'gift card',
    componente: GiftCardFormComponent,
    servicio: GiftCardService,
    token: BUSCADOR_CLIENTE,
    guardar: 'emitir',
  },
  {
    nombre: 'plan de pago',
    componente: PlanPagoFormComponent,
    servicio: PlanPagoService,
    token: BUSCADOR_VENTA,
    guardar: 'crearPlan',
  },
]) {
  describe('50h formulario ' + pantalla.nombre, () => {
    it('muestra un h1 y deshabilita el envío inválido o en curso', async () => {
      const guardar = vi.fn();
      await TestBed.configureTestingModule({
        imports: [pantalla.componente],
        providers: [
          ...proveedoresDePantalla(),
          {
            provide: pantalla.servicio,
            useValue: { [pantalla.guardar]: guardar },
          },
          {
            provide: pantalla.token,
            useValue: {
              buscar: () => observableDe([]),
              obtener: (id: number) => observableDe({ id, nombre: 'Venta' }),
            },
          },
          {
            provide: ToastService,
            useValue: { warn: vi.fn(), error: vi.fn(), success: vi.fn() },
          },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(
        pantalla.componente as Type<object>,
      );
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const boton = host.querySelector<HTMLButtonElement>(
        'ui-btn-enviar button',
      );
      expect(boton).not.toBeNull();
      expect(host.querySelectorAll('h1')).toHaveLength(1);
      expect(boton?.disabled).toBe(true);
      boton?.click();
      expect(guardar).not.toHaveBeenCalled();
      const componente = fixture.componentInstance;
      Reflect.get(
        componente,
        pantalla.nombre === 'gift card' ? 'monto' : 'ventaId',
      ).set(10);
      fixture.detectChanges();
      expect(boton?.disabled).toBe(false);
      Reflect.get(componente, 'guardando').set(true);
      fixture.detectChanges();
      expect(boton?.disabled).toBe(true);
      expect(boton?.getAttribute('aria-busy')).toBe('true');
    });
  });
}
