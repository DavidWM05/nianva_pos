import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, DynamicFormComponent, ToastService } from '@nucleo/ui-shared';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom (el entorno de estos tests) no implementa ResizeObserver -- lo usa
// PrimeNG's TabList (detras de RecordTabsComponent) en ngAfterViewInit.
// Cualquier spec futuro que renderice RecordTabsComponent va a necesitar
// este mismo stub.
/* eslint-disable @typescript-eslint/no-empty-function */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
/* eslint-enable @typescript-eslint/no-empty-function */

import { ClienteService } from '../../cliente.service';
import { Cliente } from '../../cliente.types';
import { CrmAvanzadoService } from '../../crm-avanzado.service';
import { CrmInteraccion, LoyaltyResumen } from '../../crm-avanzado.types';
import { ClienteDetalleComponent } from './cliente-detalle.component';

describe('ClienteDetalleComponent', () => {
  let fixture: ComponentFixture<ClienteDetalleComponent>;
  let crmAvanzadoService: {
    interacciones: ReturnType<typeof vi.fn>;
    crearInteraccion: ReturnType<typeof vi.fn>;
    loyalty: ReturnType<typeof vi.fn>;
    ajustarPuntos: ReturnType<typeof vi.fn>;
  };

  const cliente: Cliente = {
    id: 7,
    nombre: 'Hugo Mendez',
    documento_fiscal: null,
    telefono: '555-0202',
    correo: 'hugo@test.com',
    direccion: null,
    activo: true,
    es_sistema: false,
    fecha_registro: '2026-07-01T10:00:00Z',
  };

  const loyaltyVacio: LoyaltyResumen = {
    cliente: { id: 7, nombre: 'Hugo Mendez' },
    puntos_loyalty: 0,
    puntos_acumulados: 0,
    historial: [],
  };

  function crearCrmAvanzadoServiceMock() {
    return {
      interacciones: vi.fn().mockReturnValue(of<CrmInteraccion[]>([])),
      crearInteraccion: vi.fn(),
      loyalty: vi.fn().mockReturnValue(of(loyaltyVacio)),
      ajustarPuntos: vi.fn(),
    };
  }

  beforeEach(async () => {
    const clienteService = {
      obtener: vi.fn().mockReturnValue(of({ cliente, permisos: { editar: true, eliminar: true } })),
      ventas: vi.fn().mockReturnValue(of([])),
    };
    crmAvanzadoService = crearCrmAvanzadoServiceMock();

    await TestBed.configureTestingModule({
      imports: [ClienteDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: ClienteService, useValue: clienteService },
        { provide: CrmAvanzadoService, useValue: crmAvanzadoService },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteDetalleComponent);
    fixture.detectChanges();
  });

  it('renderiza las 5 pestañas y el nombre del cliente', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Hugo Mendez');
    expect(texto).toContain('General');
    expect(texto).toContain('Historial de ventas');
    expect(texto).toContain('Interacciones');
    expect(texto).toContain('Loyalty / Puntos');
    expect(texto).toContain('Auditoría');
  });

  it('carga interacciones y loyalty al iniciar, para el cliente correcto', () => {
    expect(crmAvanzadoService.interacciones).toHaveBeenCalledWith(7);
    expect(crmAvanzadoService.loyalty).toHaveBeenCalledWith(7);
  });

  it('registrar una interacción la agrega al principio de la lista y cierra el modal', () => {
    const nueva: CrmInteraccion = {
      id: 99,
      cliente_id: 7,
      tipo: 'llamada',
      observacion: 'Preguntó por su pedido',
      fecha: '2026-07-27T10:00:00Z',
    };
    crmAvanzadoService.crearInteraccion.mockReturnValue(of(nueva));

    fixture.componentInstance.abrirNuevaInteraccion();
    fixture.componentInstance['observacionNuevaInteraccion'].set('Preguntó por su pedido');
    fixture.componentInstance.guardarInteraccion();

    expect(crmAvanzadoService.crearInteraccion).toHaveBeenCalledWith(7, {
      tipo: 'llamada',
      observacion: 'Preguntó por su pedido',
    });
    expect(fixture.componentInstance['interacciones']()).toEqual([nueva]);
    expect(fixture.componentInstance['mostrarNuevaInteraccion']()).toBe(false);
  });

  it('sin observación, no llama al backend para registrar la interacción', () => {
    fixture.componentInstance.abrirNuevaInteraccion();
    fixture.componentInstance.guardarInteraccion();

    expect(crmAvanzadoService.crearInteraccion).not.toHaveBeenCalled();
  });

  it('ajustar puntos, al confirmar, vuelve a pedir el resumen de loyalty (no aplica el delta localmente)', () => {
    crmAvanzadoService.ajustarPuntos.mockReturnValue(
      of({ id: 1, cliente_id: 7, tipo: 'ajuste', puntos: -50, referencia_tabla: 'ajuste', referencia_id: null, expira_en: null, created_at: '2026-07-27T10:00:00Z' }),
    );
    crmAvanzadoService.loyalty.mockReturnValue(of({ ...loyaltyVacio, puntos_loyalty: 50 }));

    fixture.componentInstance.abrirAjustePuntos();
    fixture.componentInstance['puntosAjuste'].set(-50);
    fixture.componentInstance['motivoAjuste'].set('Ajuste por devolución');
    fixture.componentInstance.confirmarAjustePuntos();

    expect(crmAvanzadoService.ajustarPuntos).toHaveBeenCalledWith(7, { puntos: -50, motivo: 'Ajuste por devolución' });
    expect(crmAvanzadoService.loyalty).toHaveBeenCalledTimes(2); // 1 en ngOnInit + 1 tras el ajuste
    expect(fixture.componentInstance['mostrarAjustePuntos']()).toBe(false);
  });

  it('sin puntos o sin motivo, no llama al backend para ajustar puntos', () => {
    fixture.componentInstance.abrirAjustePuntos();
    fixture.componentInstance['motivoAjuste'].set('Motivo sin puntos');
    fixture.componentInstance.confirmarAjustePuntos();

    expect(crmAvanzadoService.ajustarPuntos).not.toHaveBeenCalled();
  });

  it('si el backend rechaza el ajuste (ej. sin permiso o puntos insuficientes), muestra el mensaje real, no uno generico', async () => {
    const toast = { success: vi.fn(), error: vi.fn() };
    const clienteService = {
      obtener: vi.fn().mockReturnValue(of({ cliente, permisos: { editar: true, eliminar: true } })),
      ventas: vi.fn().mockReturnValue(of([])),
    };
    const crmMock = crearCrmAvanzadoServiceMock();
    crmMock.ajustarPuntos.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'No tienes el permiso requerido: loyalty.ajustar' } })),
    );

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClienteDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: ClienteService, useValue: clienteService },
        { provide: CrmAvanzadoService, useValue: crmMock },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
      ],
    }).compileComponents();

    const otroFixture = TestBed.createComponent(ClienteDetalleComponent);
    otroFixture.detectChanges();

    otroFixture.componentInstance.abrirAjustePuntos();
    otroFixture.componentInstance['puntosAjuste'].set(-50);
    otroFixture.componentInstance['motivoAjuste'].set('Ajuste por devolución');
    otroFixture.componentInstance.confirmarAjustePuntos();

    expect(toast.error).toHaveBeenCalledWith('No tienes el permiso requerido: loyalty.ajustar');
  });

  it('el tab de Auditoría no renderiza nucleo-audit-log-viewer hasta que el bloque @defer se activa', async () => {
    // deferBlockBehavior: Manual -- el bloque arranca en @placeholder y NO
    // se dispara solo, hay que activarlo a mano. Esto prueba exactamente lo
    // que pide el encargo: que Auditoria no cargue hasta el trigger real
    // (on viewport, en la app real disparado por scroll/click de pestaña).
    const bloques = await fixture.getDeferBlocks();
    expect(bloques).toHaveLength(1);

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('se carga al hacer scroll');

    await bloques[0].render(DeferBlockState.Complete);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nucleo-audit-log-viewer')).not.toBeNull();
  });

  it('cuando es_sistema es true, muestra el mismo formulario deshabilitado (visualizar), no lo oculta', async () => {
    const clienteSistema: Cliente = { ...cliente, nombre: 'Publico General', es_sistema: true };
    const clienteService = {
      obtener: vi.fn().mockReturnValue(of({ cliente: clienteSistema, permisos: { editar: true, eliminar: true } })),
      ventas: vi.fn().mockReturnValue(of([])),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClienteDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: ClienteService, useValue: clienteService },
        { provide: CrmAvanzadoService, useValue: crearCrmAvanzadoServiceMock() },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
      ],
    }).compileComponents();

    const otroFixture = TestBed.createComponent(ClienteDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('no se puede editar');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });

  it('sin permiso de editar, muestra el mismo formulario deshabilitado (visualizar), no lo oculta', async () => {
    const clienteService = {
      obtener: vi.fn().mockReturnValue(of({ cliente, permisos: { editar: false, eliminar: false } })),
      ventas: vi.fn().mockReturnValue(of([])),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClienteDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: ClienteService, useValue: clienteService },
        { provide: CrmAvanzadoService, useValue: crearCrmAvanzadoServiceMock() },
        { provide: AuditLogSource, useValue: { listar: vi.fn().mockReturnValue(of([])) } },
        { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
      ],
    }).compileComponents();

    const otroFixture = TestBed.createComponent(ClienteDetalleComponent);
    otroFixture.detectChanges();

    const texto = (otroFixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('No tienes permiso para editar clientes');

    const formulario = otroFixture.debugElement.query(By.directive(DynamicFormComponent));
    expect(formulario).not.toBeNull();
    expect(formulario.componentInstance.form.disabled).toBe(true);
  });
});
