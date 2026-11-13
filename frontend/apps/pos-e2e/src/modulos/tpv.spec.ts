import { expect, test, type Page } from '@playwright/test';

import { asegurarCajaAbierta } from '../soporte/api';
import { usuarioConPermisosExtra } from '../soporte/backend';
import { capturarPantalla50n } from '../soporte/capturas-50n';
import { agregarAgua50f, pagarMixto50f } from '../soporte/flujo-50f';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

// 50n-a: el flujo de caja y venta de punto a punto, antes y despues de migrar tpv y reportes a
// libs/ui. Corre con un vendedor que ademas ve el reporte de ventas (reportes.ver): el rol admin
// exige 2FA y el vendedor del escenario no tiene ese permiso.
const USUARIO = 'tpv-e2e@abarrotes.test';

async function cerrarCaja(page: Page, montoFisico: string): Promise<void> {
  await page.getByLabel('Monto físico contado').fill(montoFisico);
  await page.getByRole('button', { name: 'Cerrar caja' }).click();
  await expect(page.getByRole('heading', { name: 'Caja cerrada', exact: true })).toBeVisible({ timeout: 20000 });
}

async function abrirCaja(page: Page): Promise<void> {
  await page.getByLabel('Monto de apertura').fill('500');
  await page.getByRole('button', { name: 'Abrir caja' }).click();
  await expect(page.getByRole('heading', { name: 'Caja abierta', exact: true })).toBeVisible({ timeout: 20000 });
}

/** yyyy-mm-dd del dia de `fecha` desplazado `dias`, en UTC como la guarda el backend. */
function dia(fecha: string, dias: number): string {
  const instante = new Date(fecha);
  instante.setUTCDate(instante.getUTCDate() + dias);

  return instante.toISOString().slice(0, 10);
}

test.afterEach(async ({ page }) => {
  await asegurarCajaAbierta(page);
});

test('tpv: abrir caja, cobrar con pago mixto, ver el detalle y el listado, cerrar caja y filtrar el reporte', async ({ page }) => {
  test.setTimeout(240000);
  usuarioConPermisosExtra('vendedor@abarrotes.test', USUARIO, 'Reportes e2e', ['reportes.ver']);
  await iniciarSesion(page, USUARIO);
  const errores = vigilarErrores(page);

  // El escenario deja la caja abierta: se cierra primero para probar la apertura.
  await abrirPantalla(page, '/tpv/caja');
  // Puede haber mas de una abierta: Venta::factory() (soporte/saldos-50h.ts) crea su propia
  // CajaSesion abierta en la misma sucursal. Se cierran todas. isVisible() no espera, asi que antes
  // se espera a que la pantalla muestre alguno de los dos estados.
  const cajaAbierta = page.getByRole('heading', { name: 'Caja abierta', exact: true });
  const sinCaja = page.getByRole('heading', { name: 'No hay caja abierta', exact: true });
  for (let intento = 0; intento < 5; intento++) {
    await expect(cajaAbierta.or(sinCaja)).toBeVisible({ timeout: 20000 });
    if (!(await cajaAbierta.isVisible())) {
      break;
    }
    await cerrarCaja(page, '0');
    await page.getByRole('button', { name: 'Continuar' }).click();
  }
  await expect(page.getByRole('heading', { name: 'No hay caja abierta', exact: true })).toBeVisible();
  await capturarPantalla50n(page, 'caja-cerrada');
  await abrirCaja(page);
  await capturarPantalla50n(page, 'caja-abierta');

  // Venta con dos lineas y pago mixto (efectivo + tarjeta).
  await abrirPantalla(page, '/tpv/venta');
  await expect(page.getByRole('heading', { name: 'Nueva venta', exact: true })).toBeVisible();
  await capturarPantalla50n(page, 'venta-vacia');
  await agregarAgua50f(page);
  await agregarAgua50f(page, 'Refresco 600ml');
  await capturarPantalla50n(page, 'venta-con-lineas');
  await pagarMixto50f(page, '20');
  await expect(page.getByRole('button', { name: /Registrar venta$/ })).toBeEnabled({ timeout: 20000 });
  await capturarPantalla50n(page, 'venta-cobro');
  const ventaCreada = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/ventas');
  await page.getByRole('button', { name: /Registrar venta$/ }).click();
  const respuesta = await ventaCreada;
  expect(respuesta.status()).toBe(201);
  const venta: { data: { id: number; fecha: string } } = await respuesta.json();
  await expect(page.getByRole('heading', { name: `Venta #${venta.data.id} registrada`, exact: true })).toBeVisible();
  await capturarPantalla50n(page, 'venta-registrada');

  // Detalle: resumen con el pago mixto y las dos lineas.
  await abrirPantalla(page, `/tpv/ventas/${venta.data.id}`);
  await expect(page.getByRole('heading', { name: `Venta #${venta.data.id}`, exact: true })).toBeVisible();
  await expect(page.getByText('Efectivo + Tarjeta', { exact: true })).toBeVisible();
  await capturarPantalla50n(page, 'venta-detalle-general');
  await page.getByRole('tab', { name: /L.neas/ }).click();
  await expect(page.getByRole('cell', { name: /Agua 1L/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Refresco 600ml/ })).toBeVisible();
  await capturarPantalla50n(page, 'venta-detalle-lineas');

  // Listado: la venta recien cobrada es la primera (orden por fecha descendente) y abre su detalle.
  await abrirPantalla(page, '/tpv/ventas');
  const primeraFila = page.locator('tbody tr').first();
  await expect(primeraFila).toContainText('Efectivo + Tarjeta');
  await capturarPantalla50n(page, 'ventas-lista');
  // Por atributo y no por rol: en PrimeNG el aria-label queda en <p-button>, no en su <button>.
  await primeraFila.locator('[aria-label^="Ver"]').first().click();
  await expect(page).toHaveURL(new RegExp(`/tpv/ventas/${venta.data.id}$`));
  await abrirPantalla(page, '/tpv/ventas');
  const busqueda = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/v1/ventas' && new URL(r.url()).searchParams.has('filtro_cliente'));
  await page.getByPlaceholder('Buscar por cliente...').fill('sin-ventas-e2e');
  await busqueda;
  await expect(page.getByText('No hay ventas registradas todavía.')).toBeVisible();
  await capturarPantalla50n(page, 'ventas-lista-vacia');

  // Cierre: el resultado muestra la venta en el total del sistema.
  await abrirPantalla(page, '/tpv/caja');
  await expect(page.getByRole('heading', { name: 'Caja abierta', exact: true })).toBeVisible();
  await cerrarCaja(page, '540');
  await capturarPantalla50n(page, 'caja-resultado-cierre');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'No hay caja abierta', exact: true })).toBeVisible();
  // La venta queda bloqueada sin caja.
  await abrirPantalla(page, '/tpv/venta');
  await expect(page.getByRole('heading', { name: 'No se puede vender todavía', exact: true })).toBeVisible();
  await capturarPantalla50n(page, 'venta-sin-caja');
  await abrirPantalla(page, '/tpv/caja');
  await abrirCaja(page);

  // Reporte de ventas filtrado alrededor del dia de la venta.
  await abrirPantalla(page, '/reportes/ventas');
  await page.getByLabel('Desde').fill(dia(venta.data.fecha, -1));
  await page.getByLabel('Hasta').fill(dia(venta.data.fecha, 1));
  const reporte = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/v1/ventas/reporte' && new URL(r.url()).searchParams.get('fecha_desde') === dia(venta.data.fecha, -1),
  );
  await page.getByRole('button', { name: 'Filtrar' }).click();
  expect((await reporte).status()).toBe(200);
  await expect(page.getByRole('cell', { name: 'Efectivo', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Tarjeta/ }).first()).toBeVisible();
  await capturarPantalla50n(page, 'reporte-ventas');

  sinErrores(errores, '/tpv');
});
