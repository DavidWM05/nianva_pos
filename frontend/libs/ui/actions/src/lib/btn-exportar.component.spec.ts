import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UMBRAL_INDICADOR_MS } from '@nianva/ui-feedback';
import { BotonExportarComponent } from './btn-exportar.component';

describe('BotonExportarComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [BotonExportarComponent] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tiene etiqueta, icono y aria-label', () => {
    const fixture = TestBed.createComponent(BotonExportarComponent);
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector('button');
    expect(boton?.textContent).toContain('Exportar');
    expect(boton?.querySelector('.pi-download')).not.toBeNull();
    expect(boton?.getAttribute('aria-label')).toBe('Exportar');
  });

  it('se deshabilita y muestra el indicador pasado el umbral', () => {
    const fixture = TestBed.createComponent(BotonExportarComponent);
    fixture.componentRef.setInput('exportando', true);
    fixture.detectChanges();
    TestBed.tick();
    vi.advanceTimersByTime(UMBRAL_INDICADOR_MS);
    fixture.detectChanges();

    const componente = fixture.componentInstance as unknown as { indicadorVisible: () => boolean };
    expect(componente.indicadorVisible()).toBe(true);
    expect(fixture.nativeElement.querySelector('button')?.disabled).toBe(true);
  });

  it('emite exportar', () => {
    const fixture = TestBed.createComponent(BotonExportarComponent);
    const emitir = vi.fn();
    fixture.componentInstance.exportar.subscribe(emitir);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button')?.click();

    expect(emitir).toHaveBeenCalledOnce();
  });
});
