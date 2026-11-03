import { inject, signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

import { UI_CAMPO_CONTEXTO } from './campo-contexto';

export abstract class CampoBase implements ControlValueAccessor {
  protected readonly campo = inject(UI_CAMPO_CONTEXTO, { optional: true });
  protected readonly deshabilitado = signal(false);

  private onChange: (valor: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  registerOnChange(fn: (valor: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(esDeshabilitado: boolean): void {
    this.deshabilitado.set(esDeshabilitado);
  }

  abstract writeValue(valor: unknown): void;

  protected notificar(valor: unknown): void {
    this.onChange(valor);
  }

  protected tocar(): void {
    this.onTouched();
  }

  protected idControl(): string | null {
    return this.campo?.controlId() ?? null;
  }

  protected ariaRequerido(): boolean {
    return this.campo?.requerido() ?? false;
  }

  protected ariaInvalido(): boolean {
    return this.campo?.invalido() ?? false;
  }

  protected descritoPor(): string | null {
    return this.ariaInvalido() ? this.campo?.errorId() ?? null : null;
  }
}
