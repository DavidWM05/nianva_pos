import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { expect, it, vi, afterEach } from 'vitest';
import { ToastService } from '@nianva/ui-shared';
import { proveedoresDePantalla } from '../../../../testing/proveedores-pantalla';
import { BUSCADOR_UNIDAD_MEDIDA } from '../../../../core/buscadores-entidad.tokens';
import { InsumoService } from '../../insumo.service';
import { InsumoFormComponent } from './insumo-form.component';

afterEach(() => TestBed.resetTestingModule());
async function preparar() {
  const respuesta = new Subject<{ id: number }>();
  const api = { crear: vi.fn().mockReturnValue(respuesta) };
  const toast = { success: vi.fn(), error: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [InsumoFormComponent],
    providers: [
      ...proveedoresDePantalla(),
      provideRouter([{ path: 'produccion/insumos', children: [] }]),
      { provide: InsumoService, useValue: api },
      { provide: ToastService, useValue: toast },
      {
        provide: BUSCADOR_UNIDAD_MEDIDA,
        useValue: {
          buscar: () => of([]),
          obtener: () => of({ id: 1, nombre: 'Catálogo' }),
        },
      },
    ],
  }).compileComponents();
  const f = TestBed.createComponent(InsumoFormComponent);
  f.detectChanges();
  f.componentInstance['nombre'].set('Harina');
  f.componentInstance['unidadMedidaId'].set(1);
  f.detectChanges();
  const button = (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('ui-btn-enviar button');
  if (!button) throw new Error('Falta el botón de envío');
  return { f, api, toast, respuesta, button };
}
it('deshabilita el envío pendiente y vuelve al listado con confirmación al guardar', async () => {
  const { f, api, toast, respuesta, button } = await preparar();
  button.click();
  f.detectChanges();
  expect(button.disabled).toBe(true);
  expect(button.getAttribute('aria-busy')).toBe('true');
  button.click();
  expect(api.crear).toHaveBeenCalledTimes(1);
  respuesta.next({ id: 2 });
  respuesta.complete();
  await f.whenStable();
  expect(TestBed.inject(Router).url).toBe('/produccion/insumos');
  expect(toast.success).toHaveBeenCalled();
});
it('recupera el botón y conserva la captura si falla el servidor', async () => {
  const { f, toast, respuesta, button } = await preparar();
  button.click();
  f.detectChanges();
  respuesta.error({ error: { message: 'Error de prueba' } });
  f.detectChanges();
  expect(button.disabled).toBe(false);
  expect(button.getAttribute('aria-busy')).toBe('false');
  expect(toast.error).toHaveBeenCalled();
  expect(f.componentInstance['nombre']()).toBe('Harina');
});
