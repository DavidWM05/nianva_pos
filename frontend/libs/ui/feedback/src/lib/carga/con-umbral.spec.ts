import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UMBRAL_INDICADOR_MS, conUmbral } from './con-umbral';

describe('conUmbral', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function preparar() {
    const fuente = signal(false);
    const visible = runInInjectionContext(TestBed.inject(Injector), () => conUmbral(fuente));
    TestBed.tick();

    return { fuente, visible };
  }

  it('no se enciende antes del umbral', () => {
    const { fuente, visible } = preparar();

    fuente.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS - 1);

    expect(visible()).toBe(false);
  });

  it('se enciende al cumplirse el umbral', () => {
    const { fuente, visible } = preparar();

    fuente.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS);

    expect(visible()).toBe(true);
  });

  it('una respuesta rapida nunca llega a encenderlo', () => {
    const { fuente, visible } = preparar();

    fuente.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS / 2);
    fuente.set(false);
    TestBed.tick();
    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS * 2);

    expect(visible()).toBe(false);
  });

  it('se apaga en el acto cuando termina la carga', () => {
    const { fuente, visible } = preparar();

    fuente.set(true);
    TestBed.tick();
    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS);
    fuente.set(false);
    TestBed.tick();

    expect(visible()).toBe(false);
  });
});
