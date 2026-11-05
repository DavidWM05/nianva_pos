import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from './toast/toast.service';

describe('ToastService comportamiento visible', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  function renderizar(): ToastService {
    return TestBed.inject(ToastService);
  }

  it('muestra el detalle del mensaje y descarta el duplicado inmediato', async () => {
    const toast = renderizar();

    toast.success('Venta registrada.');
    toast.success('Venta registrada.');
    await Promise.resolve();

    expect(document.body.textContent).toContain('Venta registrada.');
    expect((document.body.textContent?.match(/Venta registrada\./g) ?? []).length).toBe(1);
  });

  it('muestra el texto tecnico con el codigo de soporte', async () => {
    const toast = renderizar();

    toast.errorTecnico('Fallo interno.', 'abc-123');
    await Promise.resolve();

    expect(document.body.textContent).toContain('Fallo interno. Código de soporte: abc-123');
  });
});
