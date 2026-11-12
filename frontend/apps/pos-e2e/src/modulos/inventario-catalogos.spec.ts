import { expect, test } from '@playwright/test';
import { capturarPantalla50k } from '../soporte/capturas-50k';
import { abrirPantalla, sinErrores, vigilarErrores } from '../soporte/humo';
import { iniciarSesion } from '../soporte/sesion';

for (const entidad of [
  { ruta: 'categorias', singular: 'categoría', crear: 'Nueva categoría' },
  {
    ruta: 'departamentos',
    singular: 'departamento',
    crear: 'Nuevo departamento',
  },
]) {
  test(
    'catálogos: crear, editar y consultar auditoría diferida de ' +
      entidad.singular,
    async ({ page }) => {
      test.setTimeout(180000);
      await iniciarSesion(page, 'vendedor@abarrotes.test');
      const errores = vigilarErrores(page);
      let consultasAuditoria = 0;
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.includes('/auditoria'))
          consultasAuditoria++;
      });
      await abrirPantalla(page, '/inventario/' + entidad.ruta);
      await capturarPantalla50k(page, entidad.ruta + '-listado');
      const nombre = 'Catálogo 50k ' + entidad.ruta + ' ' + Date.now();
      await page
        .getByRole('button', { name: new RegExp(entidad.crear + '$') })
        .click();
      await expect(page).toHaveURL(
        new RegExp('/inventario/' + entidad.ruta + '/nuevo$'),
      );
      await capturarPantalla50k(page, entidad.ruta + '-crear');
      await page.getByRole('textbox', { name: /^Nombre/ }).fill(nombre);
      await page
        .getByRole('textbox', { name: 'Descripción', exact: true })
        .fill('Descripción inicial 50k');
      await capturarPantalla50k(page, entidad.ruta + '-formulario');
      await page
        .getByRole('button', { name: 'Crear ' + entidad.singular, exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp('/inventario/' + entidad.ruta + '/[0-9]+$'),
      );
      await expect(page.getByRole('textbox', { name: /^Nombre/ })).toHaveValue(
        nombre,
      );
      expect(consultasAuditoria).toBe(0);
      await expect(page.locator('nucleo-audit-log-viewer')).toHaveCount(0);
      await capturarPantalla50k(page, entidad.ruta + '-detalle-general');
      await page
        .getByRole('textbox', { name: 'Descripción', exact: true })
        .fill('Descripción editada 50k');
      const guardada = page.waitForResponse(
        (r) =>
          r.request().method() === 'PUT' &&
          new URL(r.url()).pathname.includes('/' + entidad.ruta + '/'),
      );
      await page
        .getByRole('button', { name: 'Guardar cambios', exact: true })
        .click();
      expect((await guardada).ok()).toBe(true);
      await page.reload();
      await expect(
        page.getByRole('textbox', { name: 'Descripción', exact: true }),
      ).toHaveValue('Descripción editada 50k');
      expect(consultasAuditoria).toBe(0);
      await capturarPantalla50k(page, entidad.ruta + '-detalle-editado');
      await page.getByRole('tab', { name: /Auditoría/ }).click();
      await expect(page.locator('nucleo-audit-log-viewer')).toBeVisible();
      await expect.poll(() => consultasAuditoria).toBeGreaterThan(0);
      await capturarPantalla50k(page, entidad.ruta + '-detalle-auditoria');
      await abrirPantalla(page, '/inventario/' + entidad.ruta);
      const filtrada = page.waitForResponse(
        (r) => new URL(r.url()).searchParams.get('filtro_nombre') === nombre,
      );
      await page.getByPlaceholder('Buscar por nombre...').fill(nombre);
      expect((await filtrada).ok()).toBe(true);
      const fila = page
        .getByRole('row')
        .filter({ has: page.getByRole('cell', { name: nombre, exact: true }) });
      await expect(fila).toBeVisible();
      await capturarPantalla50k(page, entidad.ruta + '-filtrado');
      await fila.getByRole('button', { name: 'Editar', exact: true }).click();
      await expect(
        page.getByRole('textbox', { name: 'Descripción', exact: true }),
      ).toHaveValue('Descripción editada 50k');
      await abrirPantalla(page, '/inventario/' + entidad.ruta);
      const filtroModal = page.waitForResponse(
        (r) => new URL(r.url()).searchParams.get('filtro_nombre') === nombre,
      );
      await page.getByPlaceholder('Buscar por nombre...').fill(nombre);
      await filtroModal;
      await page
        .getByRole('row')
        .filter({ has: page.getByRole('cell', { name: nombre, exact: true }) })
        .getByRole('button', { name: 'Desactivar', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await capturarPantalla50k(page, entidad.ruta + '-modal-desactivar');
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await page
        .getByPlaceholder('Buscar por nombre...')
        .fill('CATALOGO-INEXISTENTE-50K');
      await expect(page.locator('ui-empty')).toBeVisible();
      await capturarPantalla50k(page, entidad.ruta + '-vacio');
      // El 404 solicitado verifica el estado de error y su botón de reintento.
      await page.goto('/inventario/' + entidad.ruta + '/2147483647');
      await expect(
        page.getByRole('button', { name: 'Reintentar', exact: true }),
      ).toBeVisible();
      await capturarPantalla50k(page, entidad.ruta + '-404');
      sinErrores(errores, entidad.ruta, [
        'GET /api/v1/' + entidad.ruta + '/2147483647 -> 404',
      ]);
    },
  );
}
