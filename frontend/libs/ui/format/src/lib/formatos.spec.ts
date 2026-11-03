import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { CantidadPipe } from './cantidad.pipe';
import { DineroPipe } from './dinero.pipe';
import { FechaHoraPipe } from './fecha-hora.pipe';
import { FechaPipe } from './fecha.pipe';
import { provideFormatoRegional } from './formato-regional';
import { PorcentajePipe } from './porcentaje.pipe';

function crear<T>(pipe: new () => T): T {
  return TestBed.runInInjectionContext(() => new pipe());
}

describe('pipes de formato', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFormatoRegional()] });
  });

  describe('dinero', () => {
    it('formatea numero y cadena con dos decimales y simbolo', () => {
      const pipe = crear(DineroPipe);

      expect(pipe.transform(1250.5)).toBe('$1,250.50');
      expect(pipe.transform('1250.50')).toBe('$1,250.50');
      expect(pipe.transform(-80)).toBe('-$80.00');
    });

    it('muestra raya para valores vacios o no numericos', () => {
      const pipe = crear(DineroPipe);

      expect(pipe.transform(null)).toBe('—');
      expect(pipe.transform(undefined)).toBe('—');
      expect(pipe.transform('')).toBe('—');
      expect(pipe.transform('abc')).toBe('—');
    });

    it('usa la moneda configurada', () => {
      TestBed.configureTestingModule({ providers: [provideFormatoRegional({ moneda: 'USD' })] });

      expect(crear(DineroPipe).transform(1250.5)).toBe('USD1,250.50');
    });
  });

  describe('cantidad', () => {
    it('formatea hasta tres decimales y agrega la unidad', () => {
      const pipe = crear(CantidadPipe);

      expect(pipe.transform('1.000', 'pza')).toBe('1 pza');
      expect(pipe.transform(0.5, 'kg')).toBe('0.5 kg');
      expect(pipe.transform(1234.5678)).toBe('1,234.568');
    });

    it('deja el cero solo', () => {
      expect(crear(CantidadPipe).transform(0, 'pza')).toBe('0');
    });

    it('muestra raya para valores invalidos', () => {
      expect(crear(CantidadPipe).transform('no-es-numero', 'kg')).toBe('—');
    });
  });

  describe('porcentaje', () => {
    it('interpreta puntos y quita ceros sobrantes', () => {
      const pipe = crear(PorcentajePipe);

      expect(pipe.transform(16)).toBe('16%');
      expect(pipe.transform('7.50')).toBe('7.5%');
    });

    it('muestra raya para valores invalidos', () => {
      const pipe = crear(PorcentajePipe);

      expect(pipe.transform(null)).toBe('—');
      expect(pipe.transform('abc')).toBe('—');
    });
  });

  describe('fechas', () => {
    it('convierte un instante a la zona del tenant', () => {
      expect(crear(FechaPipe).transform('2026-11-02T03:00:00.000000Z')).toBe('01/11/2026');
      expect(crear(FechaHoraPipe).transform('2026-11-02T03:00:00.000000Z')).toBe('01/11/2026 21:00');
    });

    it('no desplaza una fecha sola', () => {
      expect(crear(FechaPipe).transform('2026-11-02')).toBe('02/11/2026');
    });

    it('muestra raya para fechas invalidas o vacias', () => {
      expect(crear(FechaPipe).transform(null)).toBe('—');
      expect(crear(FechaPipe).transform('')).toBe('—');
      expect(crear(FechaPipe).transform('no-es-fecha')).toBe('—');
      expect(crear(FechaHoraPipe).transform('no-es-fecha')).toBe('—');
    });
  });
});
