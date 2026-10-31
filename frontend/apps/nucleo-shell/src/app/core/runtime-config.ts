import { configurarBaseApi } from './api-config';

/**
 * Lee `config.json` antes del bootstrap. Si no existe, no responde o no
 * trae `apiBaseUrl`, usa el mismo origen (''). El instalador escribira este
 * archivo en la Fase 8.
 */
export async function cargarBaseApi(fetchImpl: typeof fetch = fetch): Promise<string> {
  try {
    const respuesta = await fetchImpl('config.json', { cache: 'no-store' });

    if (!respuesta.ok) {
      configurarBaseApi('');

      return '';
    }

    const config = await respuesta.json();
    const base = typeof config === 'object' && config !== null && 'apiBaseUrl' in config
      && typeof (config as { apiBaseUrl?: unknown }).apiBaseUrl === 'string'
      ? (config as { apiBaseUrl: string }).apiBaseUrl
      : '';

    configurarBaseApi(base);

    return base;
  } catch {
    configurarBaseApi('');

    return '';
  }
}
