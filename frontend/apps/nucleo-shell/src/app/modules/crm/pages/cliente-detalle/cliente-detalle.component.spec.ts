import { ComponentFixture, DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuditLogSource, DynamicFormComponent, ToastService } from '@nucleo/ui-shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom (el entorno de estos tests) no implementa ResizeObserver -- lo usa
// PrimeNG's TabList (detras de RecordTabsComponent) en ngAfterViewInit.
// Cualquier spec futuro que renderice RecordTabsComponent va a necesitar
// este mismo stub.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

import { ClienteService } from '../../cliente.service';
import { Cliente } from '../../cliente.types';
import { ClienteDetalleComponent } from './cliente-detalle.component';

describe('ClienteDetalleComponent', () => {
  let fixture: ComponentFixture<ClienteDetalleComponent>;

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

  beforeEach(async () => {
    const clienteService = {
      obtener: vi.fn().mockReturnValue(of({ cliente, permisos: { editar: true, eliminar: true } })),
      ventas: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ClienteDetalleComponent],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: ClienteService, useValue: clienteService },
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

  it('renderiza las 3 pestañas y el nombre del cliente', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Hugo Mendez');
    expect(texto).toContain('General');
    expect(texto).toContain('Historial de ventas');
    expect(texto).toContain('Auditoría');
  });

  it('el tab de Auditoría no renderiza nucleo-audit-log-viewer hasta que el bloque @defer se activa', async () => {
    // deferBlockBehavior: Manual -- el bloque arranca en @placeholder y NO
    // se dispara solo, hay que activarlo a mano. Esto prueba exactamente lo
    // que pide el encargo: que Auditoria no cargue hasta el trigger real
    // (on viewport, en la app real disparado por scroll/click de pestaña).
    let bloques = await fixture.getDeferBlocks();
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
