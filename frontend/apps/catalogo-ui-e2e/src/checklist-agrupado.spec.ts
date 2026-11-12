import { expect, test } from '@playwright/test';

// ui-checklist-agrupado (50g) en /forms: foco visible con Tab y los tres estados del catalogo.
// El <input> de mat-checkbox es invisible (opacity 0): lo que se ve al enfocarlo es la capa de
// estado (.mdc-checkbox__ripple), asi que eso es lo que se comprueba en las casillas.
test('ui-checklist-agrupado: Tab recorre el filtro y las casillas con foco visible', async ({ page }) => {
  await page.goto('/forms?tema=claro');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Filtrar permisos', { exact: true }).focus();
  const sinIndicador: string[] = [];

  for (let indice = 0; indice < 8; indice += 1) {
    const elemento = await page.evaluate(() => {
      const activo = document.activeElement as HTMLElement | null;
      if (!activo || activo === document.body) {
        return null;
      }

      const esCasilla = activo.matches('input[type="checkbox"]');
      const capa = esCasilla ? activo.parentElement?.querySelector('.mdc-checkbox__ripple') : null;
      const estilo = getComputedStyle(activo);

      return {
        descripcion: `${activo.tagName.toLowerCase()} ${activo.closest('mat-checkbox')?.textContent?.trim() ?? activo.getAttribute('aria-label') ?? ''}`,
        visible: esCasilla
          ? Number(getComputedStyle(capa as Element).opacity) > 0
          : estilo.outlineStyle !== 'none' && estilo.outlineWidth !== '0px',
      };
    });

    if (elemento && !elemento.visible) {
      sinIndicador.push(elemento.descripcion);
    }
    await page.keyboard.press('Tab');
  }

  expect(sinIndicador).toEqual([]);
});

test('ui-checklist-agrupado: estados normal, filtrado y deshabilitado', async ({ page }) => {
  await page.goto('/forms?tema=claro');
  await page.waitForLoadState('networkidle');

  const normal = page.locator('ui-section', { hasText: /^\s*Checklist agrupado\s*Permisos/ }).locator('ui-checklist-agrupado');
  const filtrado = page.locator('ui-checklist-agrupado').filter({ has: page.getByLabel('Filtrar permisos del rol') });
  const deshabilitado = page.locator('ui-checklist-agrupado').last();

  // Normal: los tres grupos, con su "Seleccionar todos" y su contador.
  await expect(normal.locator('fieldset.ui-checklist__grupo')).toHaveCount(3);
  await expect(normal.getByRole('group', { name: 'Caja' })).toContainText('2 de 3');
  await expect(normal.getByText('Seleccionados: 3 de 8')).toBeVisible();

  // Filtrado ("ver"): solo las opciones "Ver"; lo marcado y oculto sigue en el total.
  await expect(filtrado.getByRole('checkbox', { name: 'Crear' })).toHaveCount(0);
  await expect(filtrado.getByRole('checkbox', { name: 'Ver' })).toHaveCount(3);
  await expect(filtrado.getByText('Seleccionados: 3 de 8')).toBeVisible();

  // Deshabilitado: sin filtro ni "Seleccionar todos", y todas las casillas deshabilitadas.
  await expect(deshabilitado.getByRole('searchbox')).toHaveCount(0);
  await expect(deshabilitado.getByText('Seleccionar todos')).toHaveCount(0);
  for (const casilla of await deshabilitado.getByRole('checkbox').all()) {
    await expect(casilla).toBeDisabled();
  }
});
