import { expect, test, type Locator, type Page } from '@playwright/test';

import { asegurarCajaAbierta } from '../soporte/api';
import { abrirPantalla, sinErrores, sinViolacionesSerias, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';
import { prepararProductoLargoB1 } from '../soporte/tpv-b1';

// Fase 4, B1 (UI-04 y UI-17): la pantalla de venta a 375 px, operada solo con teclado y sin
// violaciones serias de axe. Corre contra el backend real con el vendedor del escenario, que
// tiene la caja de su sucursal abierta.
const VENDEDOR = 'vendedor@abarrotes.test';
const PRODUCTO_LARGO = 'Detergente líquido concentrado aroma lavanda presentación familiar 5 litros';

test.afterEach(async ({ page }) => {
  await asegurarCajaAbierta(page);
});

/** Ni la página ni `<main>` se desbordan a lo ancho, y ningún elemento de la venta sale de `<main>`. */
async function sinDesborde(page: Page, estado: string): Promise<void> {
  const medidas = await page.evaluate(() => {
    const main = document.querySelector('main');
    const borde = main?.getBoundingClientRect().right ?? window.innerWidth;
    const fuera = [...document.querySelectorAll('main *')]
      .filter((elemento) => {
        const caja = elemento.getBoundingClientRect();

        return caja.width > 0 && caja.right > borde + 0.5;
      })
      .slice(0, 5)
      .map((elemento) => `${elemento.tagName.toLowerCase()}.${[...elemento.classList].join('.')}`);

    return {
      pagina: document.documentElement.scrollWidth,
      ventana: window.innerWidth,
      mainScroll: main?.scrollWidth ?? 0,
      mainCliente: main?.clientWidth ?? 0,
      fuera,
    };
  });

  expect(medidas.pagina, `${estado}: la página mide ${medidas.pagina}px`).toBeLessThanOrEqual(medidas.ventana);
  expect(medidas.mainScroll, `${estado}: main ${medidas.mainScroll}px > ${medidas.mainCliente}px`).toBeLessThanOrEqual(
    medidas.mainCliente,
  );
  expect(medidas.fuera, `${estado}: elementos fuera de main`).toEqual([]);
}

/** Alto mínimo de un control táctil (WCAG 2.5.5, 44 px). */
async function esTactil(control: Locator, nombre: string): Promise<void> {
  const caja = await control.boundingBox();
  expect(caja, `${nombre} no está a la vista`).not.toBeNull();
  expect(caja?.height ?? 0, `${nombre} mide ${caja?.height}px de alto`).toBeGreaterThanOrEqual(44);
}

/** Tab hasta que `destino` tenga el foco; falla si no llega en `maximo` pulsaciones. */
async function tabHasta(page: Page, destino: Locator, maximo = 12): Promise<void> {
  for (let pulsacion = 0; pulsacion < maximo; pulsacion++) {
    if (await destino.evaluate((elemento) => elemento === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(destino).toBeFocused();
}

/** El total ya cotizado por el backend (mientras cotiza, la pantalla muestra $0.00). */
async function totalVisible(page: Page): Promise<string> {
  const total = page.locator('.venta__total');
  await expect(total).not.toHaveText(/\$0\.00$/);

  return (await total.innerText()).replace(/[^0-9.]/g, '');
}

test('tpv a 375 px: venta completa con nombre largo y montos de cinco cifras, sin desborde y con controles táctiles', async ({ page }) => {
  test.setTimeout(120000);
  prepararProductoLargoB1(PRODUCTO_LARGO, '12345.50', 50);
  await page.setViewportSize({ width: 375, height: 812 });
  await iniciarSesion(page, VENDEDOR);
  const errores = vigilarErrores(page);

  await abrirPantalla(page, '/tpv/venta');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible();
  await sinDesborde(page, 'venta vacía');

  // Búsqueda y variante.
  await page.locator('input[placeholder="Buscar producto por nombre..."]').fill('Detergente líquido');
  await page.getByRole('option', { name: PRODUCTO_LARGO, exact: true }).click();
  await page.getByRole('combobox', { name: 'Variante' }).click();
  await page.getByRole('option').first().click();
  await sinDesborde(page, 'búsqueda');

  // Cantidad y carrito.
  await page.getByLabel('Cantidad', { exact: true }).fill('3');
  await esTactil(page.getByRole('button', { name: /Agregar línea$/ }), 'Agregar línea');
  await page.getByRole('button', { name: /Agregar línea$/ }).click();
  const cantidadEnCarrito = page.getByRole('spinbutton', { name: `Cantidad de ${PRODUCTO_LARGO}`, exact: false });
  await expect(cantidadEnCarrito).toHaveValue('3');
  await expect(page.locator('.venta__total')).toContainText('$37,036.50');
  await sinDesborde(page, 'carrito');
  await esTactil(cantidadEnCarrito, 'cantidad en el carrito');
  await esTactil(page.getByRole('button', { name: `Quitar ${PRODUCTO_LARGO}`, exact: false }), 'quitar línea');

  // Pago y totales.
  const pagos = page.locator('nucleo-lineas-pago');
  await pagos.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
  await pagos.getByLabel('Monto', { exact: true }).fill(await totalVisible(page));
  const registrar = page.getByRole('button', { name: /Registrar venta$/ });
  await expect(registrar).toBeEnabled();
  await esTactil(registrar, 'Registrar venta');
  await sinDesborde(page, 'cobro');

  // Confirmación y detalle.
  const ventaCreada = page.waitForResponse(
    (respuesta) => respuesta.request().method() === 'POST' && new URL(respuesta.url()).pathname === '/api/v1/ventas',
  );
  await registrar.click();
  const respuesta = await ventaCreada;
  expect(respuesta.status()).toBe(201);
  const venta: { data: { id: string; numero: number } } = await respuesta.json();
  await expect(page.getByRole('heading', { name: `Venta #${venta.data.numero} registrada`, exact: true })).toBeVisible();
  await sinDesborde(page, 'confirmación');
  await esTactil(page.getByRole('button', { name: /Nueva venta$/ }), 'Nueva venta');

  await page.getByRole('link', { name: /Ver venta$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/tpv/ventas/${venta.data.id}$`));
  await expect(page.getByRole('heading', { name: `Venta #${venta.data.numero}`, exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await sinDesborde(page, 'detalle de la venta');

  sinErrores(errores, '/tpv/venta a 375 px');
});

test('tpv con teclado: cada etiqueta apunta a su control y el bloqueo se anuncia', async ({ page }) => {
  await iniciarSesion(page, VENDEDOR);
  await abrirPantalla(page, '/tpv/venta');

  await expect(page.getByLabel('Cliente', { exact: true })).toHaveAttribute('placeholder', 'Buscar cliente por nombre...');
  await expect(page.getByLabel('Producto', { exact: true })).toHaveAttribute('placeholder', 'Buscar producto por nombre...');
  await expect(page.getByLabel('Código de barras', { exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Agrega al menos un producto al carrito.' })).toBeVisible();
  // Los atajos están documentados en pantalla.
  const atajos = page.getByRole('list', { name: 'Atajos de teclado' });
  await expect(atajos).toContainText('F2');
  await expect(atajos).toContainText('F4');
  await expect(atajos).toContainText('Esc');
});

test('tpv solo con teclado: buscar, variante, cantidad, cobrar con F4 y foco restaurado', async ({ page }) => {
  test.setTimeout(120000);
  await iniciarSesion(page, VENDEDOR);
  const errores = vigilarErrores(page);
  await abrirPantalla(page, '/tpv/venta');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible();

  // F2 lleva a la búsqueda de producto; la sugerencia se elige con flechas y Enter.
  const buscador = page.locator('input[placeholder="Buscar producto por nombre..."]');
  await page.locator('body').press('F2');
  await expect(buscador).toBeFocused();
  await page.keyboard.type('Agua 1L');
  await expect(page.getByRole('option', { name: 'Agua 1L', exact: true })).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(buscador).toHaveValue('Agua 1L');

  // Esc cierra la lista de variantes sin descartar el producto elegido: el atajo no le gana al
  // overlay abierto.
  const variante = page.getByRole('combobox', { name: 'Variante' });
  await tabHasta(page, variante);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(buscador).toHaveValue('Agua 1L');
  await expect(variante).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toHaveCount(0);

  const cantidad = page.getByLabel('Cantidad', { exact: true });
  await tabHasta(page, cantidad);
  await page.keyboard.press('Control+A');
  await page.keyboard.type('2');
  const agregar = page.getByRole('button', { name: /Agregar línea$/ });
  await tabHasta(page, agregar);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('spinbutton', { name: /Cantidad de Agua 1L/ })).toHaveValue('2');
  // Tras agregar, el foco vuelve a la búsqueda para el siguiente producto (o el escáner).
  await expect(buscador).toBeFocused();

  // F4 sin pago avisa en lugar de cobrar.
  await page.keyboard.press('F4');
  await expect(page.getByText('El pago todavía no cuadra con el total.').first()).toBeVisible();

  // Pago con teclado.
  const pagos = page.locator('nucleo-lineas-pago');
  const metodo = pagos.getByRole('combobox').first();
  await tabHasta(page, metodo, 20);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.type('Efectivo');
  await page.keyboard.press('Enter');
  await expect(metodo).toContainText('Efectivo');
  const monto = pagos.getByLabel('Monto', { exact: true });
  await tabHasta(page, monto);
  await page.keyboard.type(await totalVisible(page));

  // F4 cobra; el foco pasa al encabezado de la confirmación.
  const ventaCreada = page.waitForResponse(
    (respuesta) => respuesta.request().method() === 'POST' && new URL(respuesta.url()).pathname === '/api/v1/ventas',
  );
  await page.keyboard.press('F4');
  expect((await ventaCreada).status()).toBe(201);
  const confirmacion = page.getByRole('heading', { name: /^Venta #\d+ registrada$/ });
  await expect(confirmacion).toBeFocused();

  // "Nueva venta" con Enter regresa a la captura con el foco en la búsqueda.
  await tabHasta(page, page.getByRole('button', { name: /Nueva venta$/ }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible();
  await expect(buscador).toBeFocused();

  sinErrores(errores, '/tpv/venta con teclado');
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`axe en tema ${tema}, a 1280 y 390 px: venta vacía, sugerencias, carrito con pago y confirmación`, async ({ page }) => {
    test.setTimeout(150000);
    await page.addInitScript((valor) => localStorage.setItem('nv-tema', valor), tema);
    await iniciarSesion(page, VENDEDOR);
    await abrirPantalla(page, '/tpv/venta');
    await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.classList.contains('nv-tema-oscuro'))).toBe(tema === 'oscuro');

    const enDosAnchos = async (accion: () => Promise<void> = async () => undefined): Promise<void> => {
      for (const ancho of [1280, 390]) {
        await page.setViewportSize({ width: ancho, height: 900 });
        await accion();
        await sinViolacionesSerias(page);
      }
      await page.setViewportSize({ width: 1280, height: 900 });
    };

    await enDosAnchos();

    // Con la lista de sugerencias abierta.
    const buscador = page.locator('input[placeholder="Buscar producto por nombre..."]');
    await enDosAnchos(async () => {
      await buscador.fill('');
      await buscador.fill('Agua');
      await expect(page.getByRole('option', { name: 'Agua 1L', exact: true })).toBeVisible();
    });
    await page.getByRole('option', { name: 'Agua 1L', exact: true }).click();
    await page.getByRole('combobox', { name: 'Variante' }).click();
    await page.getByRole('option').first().click();
    await page.getByRole('button', { name: /Agregar línea$/ }).click();
    await expect(page.getByRole('spinbutton', { name: /Cantidad de Agua 1L/ })).toBeVisible();

    const pagos = page.locator('nucleo-lineas-pago');
    await pagos.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Efectivo', exact: true }).click();
    await pagos.getByLabel('Monto', { exact: true }).fill(await totalVisible(page));
    await expect(page.getByRole('button', { name: /Registrar venta$/ })).toBeEnabled();
    await enDosAnchos();

    await page.getByRole('button', { name: /Registrar venta$/ }).click();
    await expect(page.getByRole('heading', { name: /^Venta #\d+ registrada$/ })).toBeVisible();
    await enDosAnchos();
  });
}
