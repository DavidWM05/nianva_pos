import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { limitesDe } from '@nianva/api-contrato';
import { describe, expect, it } from 'vitest';

import { CategoriaFormComponent } from './modules/inventario/categoria-form/categoria-form.component';
import { CuponFormComponent } from './modules/precios/cupon-form/cupon-form.component';

/**
 * UI-11b: `maxlength`, `min`, `max`, requerido y decimales de un formulario salen del contrato
 * (`limitesDe()` de @nianva/api-contrato), no de números escritos a mano.
 */
const RAIZ = join(process.cwd(), 'apps', 'pos', 'src', 'app');

/** Límites literales: `maxlength="50"`, `maxLength: 120`, `Validators.min(0)`... */
const LITERALES = [
  /\bmaxlength\]?="\d+"/i,
  /\bmaxLength:\s*\d+/,
  /Validators\.(maxLength|min|max)\(\s*-?[\d.]+\s*\)/,
];

/**
 * Archivos que aún escriben límites a mano. Solo baja; vacía desde UI-11b: las líneas de venta,
 * cotización, compra y devolución leen sus límites del segundo nivel (`items.elemento`).
 */
const PENDIENTES: string[] = [];

/** Archivos fuera de la regla, cada uno con su razón. */
const EXENTOS: Record<string, string> = {
  'auth/pages/login/login.component.ts': 'el login va a una ruta de sesión (urlSesion), fuera del contrato',
  'auth/pages/forgot-password/forgot-password.component.ts': 'ruta de sesión (urlSesion), fuera del contrato',
  'modules/crm/pages/campana-form/campana-form.component.html': 'CrmAvanzado está congelado (ARQ-10)',
  'modules/delivery/pages/pedido-form/pedido-form.component.html': 'Delivery está congelado (ARQ-10)',
  'modules/payroll/pages/empleados-list/empleados-list.component.html': 'Payroll está congelado (ARQ-10)',
};

function archivosDeFormulario(): string[] {
  return readdirSync(RAIZ, { recursive: true, encoding: 'utf8' })
    .filter((ruta) => /\.(ts|html)$/.test(ruta) && !ruta.endsWith('.spec.ts'))
    .map((ruta) => relative(RAIZ, join(RAIZ, ruta)).split(sep).join('/'))
    .sort();
}

function tieneLiterales(ruta: string): boolean {
  const contenido = readFileSync(join(RAIZ, ruta), 'utf8');

  return LITERALES.some((patron) => patron.test(contenido));
}

describe('límites de formulario desde el contrato (UI-11b)', () => {
  it('ningún formulario fuera de PENDIENTES y EXENTOS escribe límites a mano', () => {
    const conLiterales = archivosDeFormulario().filter(
      (ruta) => !PENDIENTES.includes(ruta) && !(ruta in EXENTOS) && tieneLiterales(ruta),
    );

    expect(conLiterales).toEqual([]);
  });

  it('PENDIENTES solo baja: cada archivo de la lista todavía tiene límites a mano', () => {
    const yaMigrados = PENDIENTES.filter((ruta) => !tieneLiterales(ruta));

    expect(yaMigrados).toEqual([]);
  });

  it('las listas están ordenadas y no se cruzan', () => {
    expect([...PENDIENTES].sort()).toEqual(PENDIENTES);
    expect(PENDIENTES.filter((ruta) => ruta in EXENTOS)).toEqual([]);
  });

  it('el nombre de categoría pinta el maxlength y el asterisco del contrato', async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriaFormComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
    const fixture = TestBed.createComponent(CategoriaFormComponent);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const contrato = limitesDe('/categorias', 'post').nombre;

    expect(raiz.querySelector('#nombre')?.getAttribute('maxlength')).toBe(String(contrato.maxLength));
    expect(contrato.requerido).toBe(true);
    expect(raiz.querySelector('label[for="nombre"]')?.textContent).toContain('*');
  });

  it('el porcentaje del cupón pinta el mínimo, el máximo y los decimales del contrato', async () => {
    await TestBed.configureTestingModule({
      imports: [CuponFormComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
    const fixture = TestBed.createComponent(CuponFormComponent);
    fixture.componentInstance.ngOnChanges();
    fixture.detectChanges();
    const porcentaje = (fixture.nativeElement as HTMLElement).querySelector('#porcentaje');
    const contrato = limitesDe('/cupones', 'post').porcentaje;

    expect(porcentaje?.getAttribute('min')).toBe(String(contrato.minimum));
    expect(porcentaje?.getAttribute('max')).toBe(String(contrato.maximum));
    expect(porcentaje?.getAttribute('step')).toBe(`0.${'0'.repeat(contrato.decimales - 1)}1`);
  });
});
