let baseApiUrl = '';

/**
 * Fija la base del backend una sola vez al arrancar. `config.json` puede
 * traer una URL absoluta en desarrollo o una cadena vacia para usar el
 * mismo origen (escritorio/LAN, donde Laravel sirve la SPA).
 */
export function configurarBaseApi(base: string): void {
  baseApiUrl = base.trim().replace(/\/+$/, '');
}

export function urlApi(ruta: string): string {
  return `${baseApiUrl}/api/v1${ruta}`;
}

export function urlSesion(ruta: string): string {
  return `${baseApiUrl}${ruta}`;
}

/**
 * True solo para URLs de nuestro backend. Con base vacia, nuestro backend
 * es el mismo origen, asi que solo se aceptan URLs relativas a la raiz
 * (`//host/...` es relativa al protocolo y apunta a otro origen).
 */
export function esUrlBackend(url: string): boolean {
  if (baseApiUrl === '') {
    return url.startsWith('/') && !url.startsWith('//');
  }

  return url === baseApiUrl || url.startsWith(`${baseApiUrl}/`);
}

export function baseApiActual(): string {
  return baseApiUrl;
}
