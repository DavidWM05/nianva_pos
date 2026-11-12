import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { BUSCADOR_CLIENTE } from '../../core/buscadores-entidad.tokens';
import { proveedoresDePantalla } from '../../testing/proveedores-pantalla';
import { CuentasCobrarListComponent } from '../cuentas-cobrar/pages/cuentas-cobrar-list/cuentas-cobrar-list.component';
import { CuentaCobrarService } from '../cuentas-cobrar/cuenta-cobrar.service';
import { CuentasPagarListComponent } from '../cuentas-pagar/pages/cuentas-pagar-list/cuentas-pagar-list.component';
import { CuentaPagarService } from '../cuentas-pagar/cuenta-pagar.service';
import { GiftCardsListComponent } from '../gift-cards/pages/gift-cards-list/gift-cards-list.component';
import { GiftCardService } from '../gift-cards/gift-card.service';
import { NotasCreditoListComponent } from '../notas-credito/pages/notas-credito-list/notas-credito-list.component';
import { NotaCreditoService } from '../notas-credito/nota-credito.service';
import { PlanesPagoListComponent } from '../ventas-plazos/pages/planes-pago-list/planes-pago-list.component';
import { PlanPagoService } from '../ventas-plazos/plan-pago.service';

const pantallas = [
  {
    nombre: 'cuentas-cobrar',
    componente: CuentasCobrarListComponent,
    servicio: CuentaCobrarService,
  },
  {
    nombre: 'cuentas-pagar',
    componente: CuentasPagarListComponent,
    servicio: CuentaPagarService,
  },
  {
    nombre: 'gift-cards',
    componente: GiftCardsListComponent,
    servicio: GiftCardService,
  },
  {
    nombre: 'notas-credito',
    componente: NotasCreditoListComponent,
    servicio: NotaCreditoService,
  },
  {
    nombre: 'ventas-plazos',
    componente: PlanesPagoListComponent,
    servicio: PlanPagoService,
  },
];

for (const pantalla of pantallas) {
  describe('50h ' + pantalla.nombre, () => {
    async function crear() {
      const listar = vi
        .fn()
        .mockReturnValue(
          of({ data: [], total: 100, permisos: { crear: true } }),
        );
      await TestBed.configureTestingModule({
        imports: [pantalla.componente],
        providers: [
          ...proveedoresDePantalla(),
          { provide: pantalla.servicio, useValue: { listar } },
          {
            provide: BUSCADOR_CLIENTE,
            useValue: {
              buscar: () => of([]),
              obtener: (id: number) => of({ id, nombre: 'Cliente' }),
            },
          },
        ],
      }).compileComponents();
      const fixture = TestBed.createComponent(
        pantalla.componente as Type<object>,
      );
      fixture.detectChanges();
      return { fixture, listar };
    }

    it('meta refleja la página solicitada aunque el total no cambie', async () => {
      const { fixture } = await crear();
      Reflect.get(fixture.componentInstance, 'onLazyLoad').call(
        fixture.componentInstance,
        { first: 25, rows: 25, sortField: null, sortOrder: null, filters: {} },
      );
      expect(Reflect.get(fixture.componentInstance, 'meta')().page).toBe(2);
    });

    it('un error conserva Reintentar y recupera el listado', async () => {
      const { fixture, listar } = await crear();
      listar.mockReturnValueOnce(throwError(() => new Error('Sin conexión')));
      Reflect.get(fixture.componentInstance, 'onLazyLoad').call(
        fixture.componentInstance,
        { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} },
      );
      fixture.detectChanges();
      const botones = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      ];
      const reintentar = botones.find((boton) =>
        boton.textContent?.includes('Reintentar'),
      );
      expect(reintentar).toBeDefined();
      reintentar?.click();
      fixture.detectChanges();
      expect(Reflect.get(fixture.componentInstance, 'estado')()).toBe('listo');
      expect(listar).toHaveBeenCalledTimes(3);
    });

    if (pantalla.nombre !== 'ventas-plazos') {
      it('Limpiar restablece los filtros y vuelve a la primera página', async () => {
        const { fixture, listar } = await crear();
        const componente = fixture.componentInstance;
        const notas = pantalla.nombre === 'notas-credito';
        Reflect.get(
          componente,
          notas ? 'onClienteSeleccionado' : 'onEstadoCambio',
        ).call(
          componente,
          notas ? 9 : pantalla.nombre === 'gift-cards' ? 'activa' : 'pendiente',
        );
        fixture.detectChanges();
        const boton = [
          ...(
            fixture.nativeElement as HTMLElement
          ).querySelectorAll<HTMLButtonElement>('ui-filter-bar button'),
        ].find((b) => b.textContent?.includes('Limpiar'));
        expect(boton).toBeDefined();
        boton?.click();
        fixture.detectChanges();
        expect(
          Reflect.get(componente, notas ? 'clienteFiltroId' : 'estadoFiltro')(),
        ).toBeNull();
        expect(Reflect.get(componente, 'meta')().page).toBe(1);
        expect(listar).toHaveBeenCalledTimes(3);
      });
    }

    it('el único h1 pertenece al encabezado compartido', async () => {
      const { fixture } = await crear();
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          'ui-page-header h1',
        ),
      ).toHaveLength(1);
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll('h1'),
      ).toHaveLength(1);
    });
  });
}
