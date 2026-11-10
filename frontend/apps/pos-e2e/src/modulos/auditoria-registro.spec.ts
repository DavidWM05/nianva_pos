import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { crearProducto } from '../soporte/api';
import { abrirPantalla } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

// Serie 50d: la pestana de auditoria de un registro (nucleo-record-tabs + nucleo-audit-log-viewer)
// con entradas reales. El detalle de producto aun no esta migrado, asi que axe se limita a las
// pestanas.
test('auditoria de un registro: muestra sus entradas sin violaciones serias de accesibilidad', async ({ page }) => {
  await iniciarSesion(page, 'vendedor@abarrotes.test');
  const producto = await crearProducto(page, `Producto auditado ${Date.now()}`);
  await abrirPantalla(page, `/inventario/productos/${producto.id}`);

  const pestana = page.getByRole('tab', { name: /Auditor/ });
  await pestana.click();
  await expect(pestana).toHaveAttribute('aria-selected', 'true');
  const historial = page.locator('nucleo-audit-log-viewer');
  await expect(historial.getByRole('listitem').first()).toBeVisible();

  const resultado = await new AxeBuilder({ page }).include('nucleo-record-tabs').withTags(['wcag2a', 'wcag2aa']).analyze();
  const serias = resultado.violations
    .filter((violacion) => violacion.impact === 'serious' || violacion.impact === 'critical')
    .map((violacion) => `${violacion.id}: ${violacion.nodes.map((nodo) => nodo.target.join(' ')).join(', ')}`);
  expect(serias).toEqual([]);
});
