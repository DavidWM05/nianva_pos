import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Response } from '@playwright/test';

/**
 * Pruebas de humo de pantallas (50a): abrir una pantalla real contra el backend y comprobar que
 * carga sin errores. Es la red de seguridad de la serie 50: el e2e de cada modulo pasa antes de
 * migrarlo y despues.
 */
export interface ErroresDePantalla {
  /** Respuestas de la API con status >= 400, como "METODO ruta -> status". */
  api: string[];
  /** Excepciones sin capturar y `console.error` de la pagina. */
  consola: string[];
}

/** Empieza a registrar los errores de la pagina. Llamalo antes de navegar. */
export function vigilarErrores(page: Page): ErroresDePantalla {
  const errores: ErroresDePantalla = { api: [], consola: [] };

  page.on('response', (respuesta: Response) => {
    const url = new URL(respuesta.url());
    if (url.pathname.startsWith('/api/') && respuesta.status() >= 400) {
      errores.api.push(`${respuesta.request().method()} ${url.pathname} -> ${respuesta.status()}`);
    }
  });
  page.on('pageerror', (error) => errores.consola.push(error.message));
  page.on('console', (mensaje) => {
    // "Failed to load resource" es el aviso del navegador por una respuesta 4xx/5xx; esas ya se
    // registran (y se filtran por pantalla) en `api`.
    if (mensaje.type() === 'error' && !mensaje.text().startsWith('Failed to load resource')) {
      errores.consola.push(mensaje.text());
    }
  });

  return errores;
}

/**
 * Abre `ruta` y espera a que la pantalla termine de cargar: sin peticiones pendientes, con su
 * contenido dentro del layout y sin el estado de error de `ui-page` ("No se pudo cargar").
 */
export async function abrirPantalla(page: Page, ruta: string): Promise<void> {
  await page.goto(ruta.startsWith('/') ? ruta : `/${ruta}`);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator('nucleo-pos-layout')).toBeVisible();
  await expect(page.getByText('No se pudo cargar', { exact: false })).toHaveCount(0);
}

/**
 * Falla si la pantalla registro errores de API o de consola. `apiEsperada` lista las respuestas
 * que la pantalla maneja a proposito (por ejemplo, un 404 que oculta una seccion); cada una
 * debe ir con su razon donde se declara.
 */
export function sinErrores(errores: ErroresDePantalla, ruta: string, apiEsperada: readonly string[] = []): void {
  expect(errores.api.filter((error) => !apiEsperada.includes(error)), `errores de API en ${ruta}`).toEqual([]);
  expect(errores.consola, `errores de consola en ${ruta}`).toEqual([]);
}

/**
 * axe (WCAG 2 A y AA) sin violaciones serias ni criticas, como en el catalogo. Solo para
 * pantallas ya migradas a `libs/ui`: las de PrimeNG todavia no lo cumplen.
 */
export async function sinViolacionesSerias(page: Page): Promise<void> {
  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serias = resultado.violations
    .filter((violacion) => violacion.impact === 'serious' || violacion.impact === 'critical')
    .map((violacion) => `${violacion.id}: ${violacion.nodes.length} nodo(s)`);

  expect(serias).toEqual([]);
}
