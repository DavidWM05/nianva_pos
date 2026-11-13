import type { Page } from '@playwright/test';

const API = 'http://127.0.0.1:' + (process.env['POS_E2E_BACKEND_PORT'] ?? '8100') + '/api/v1';

interface RespuestaApi<T> {
  status: number;
  cuerpo: { data?: T; message?: string; error_code?: string };
}

async function crear<T>(page: Page, ruta: string, payload: Record<string, unknown>): Promise<T> {
  const resultado = await page.evaluate(
    async ({ url, datos }) => {
      const coincidencia = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
      const token = coincidencia ? decodeURIComponent(coincidencia[1]) : '';
      const respuesta = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': token,
        },
        body: JSON.stringify(datos),
      });

      return {
        status: respuesta.status,
        cuerpo: await respuesta.json(),
      };
    },
    { url: `${API}${ruta}`, datos: payload },
  ) as RespuestaApi<T>;

  if (resultado.status !== 201 || resultado.cuerpo.data === undefined) {
    throw new Error(`No se pudo crear ${ruta}: ${JSON.stringify(resultado)}`);
  }

  return resultado.cuerpo.data;
}

export function crearProducto(page: Page, nombre: string): Promise<{ id: number }> {
  return crear(page, '/productos', { nombre, precio_venta: 10 });
}

export function crearCliente(page: Page, nombre: string): Promise<{ id: number }> {
  return crear(page, '/clientes', { nombre });
}

/**
 * 50n-a: deja abierta la caja de la sucursal, como la siembra el escenario. El e2e de tpv la
 * cierra y la vuelve a abrir; si falla a la mitad, los specs que venden despues no dependen de el.
 */
export async function asegurarCajaAbierta(page: Page): Promise<void> {
  const resultado = await page.evaluate(async (api) => {
    const coincidencia = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    const token = coincidencia ? decodeURIComponent(coincidencia[1]) : '';
    const cabeceras = { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': token };
    const actual = await fetch(`${api}/caja/actual`, { credentials: 'include', headers: cabeceras });
    const cuerpo = await actual.json();

    if (cuerpo.data !== null) {
      return actual.status;
    }

    const apertura = await fetch(`${api}/caja/abrir`, {
      method: 'POST',
      credentials: 'include',
      headers: cabeceras,
      body: JSON.stringify({ monto_apertura: 500 }),
    });

    return apertura.status;
  }, API);

  if (resultado !== 200 && resultado !== 201) {
    throw new Error(`No se pudo dejar la caja abierta: ${resultado}`);
  }
}

export function crearUnidadMedida(page: Page, nombre: string): Promise<{ id: number }> {
  return crear(page, '/unidades-medida', { nombre, abreviatura: 'e2e', tipo: 'entero', activo: true });
}
