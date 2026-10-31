import { HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configurarBaseApi, urlApi } from '../core/api-config';
import { xsrfInterceptor } from './xsrf.interceptor';

describe('xsrfInterceptor', () => {
  beforeEach(() => {
    configurarBaseApi('http://x');
    document.cookie = 'XSRF-TOKEN=token%20uno; path=/';
  });

  afterEach(() => {
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
  });

  function interceptar(url: string): HttpRequest<unknown> {
    const request = new HttpRequest('POST', url, {});
    const next = vi.fn<HttpHandlerFn>(() => of(new HttpResponse({ status: 200 })));

    xsrfInterceptor(request, next).subscribe();

    return next.mock.calls[0][0];
  }

  it('manda el header a nuestro backend', () => {
    const request = interceptar(urlApi('/ventas'));

    expect(request.headers.get('X-XSRF-TOKEN')).toBe('token uno');
  });

  it('no manda el header a un dominio ajeno', () => {
    const request = interceptar('https://otro.test/api/v1/ventas');

    expect(request.headers.has('X-XSRF-TOKEN')).toBe(false);
  });

  it('con base vacia, no manda el header a una URL relativa al protocolo de otro origen', () => {
    configurarBaseApi('');

    expect(interceptar('/api/v1/ventas').headers.get('X-XSRF-TOKEN')).toBe('token uno');
    expect(interceptar('//otro.test/api/v1/ventas').headers.has('X-XSRF-TOKEN')).toBe(false);
  });
});
