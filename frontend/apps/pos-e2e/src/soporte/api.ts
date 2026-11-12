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

export function crearUnidadMedida(page: Page, nombre: string): Promise<{ id: number }> {
  return crear(page, '/unidades-medida', { nombre, abreviatura: 'e2e', tipo: 'entero', activo: true });
}
