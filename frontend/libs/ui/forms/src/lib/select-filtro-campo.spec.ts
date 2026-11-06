import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { beforeEach, describe, expect, it } from 'vitest';

import { CampoComponent } from './campo/campo.component';
import { SelectFiltroComponent } from './select-filtro/select-filtro.component';

// 49e: con MatSelect, "Todas" (null) no se mostraba, el nombre accesible no salia de la
// etiqueta de ui-campo, y MatSelect pisaba aria-invalid y aria-describedby con su propio
// estado, que no ve el control de afuera.
@Component({
  standalone: true,
  imports: [CampoComponent, ReactiveFormsModule, SelectFiltroComponent],
  template: `
    <ui-campo etiqueta="Sucursal" [requerido]="true">
      <ui-select-filtro [formControl]="control" [opciones]="opciones" />
    </ui-campo>
  `,
})
class HostCampoComponent {
  readonly control = new FormControl<unknown>(null, Validators.required);
  readonly opciones = [
    { label: 'Centro', value: 1 },
    { label: 'Norte', value: 2 },
  ];
}

describe('SelectFiltroComponent dentro de ui-campo', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostCampoComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(HostCampoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const combo = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLElement;

    return { fixture, combo };
  }

  it('muestra Todas cuando el valor es null', async () => {
    const { combo } = await render();

    expect(combo.textContent?.trim()).toBe('Todas');
  });

  it('toma su nombre accesible de la etiqueta de ui-campo', async () => {
    const { combo } = await render();
    const ids = (combo.getAttribute('aria-labelledby') ?? '').split(' ').filter(Boolean);
    const nombre = ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ');

    expect(combo.getAttribute('aria-label')).toBeNull();
    expect(nombre).toContain('Sucursal');
  });

  it('anuncia el error de ui-campo con aria-invalid y aria-describedby', async () => {
    const { fixture, combo } = await render();

    fixture.componentInstance.control.markAsTouched();
    fixture.componentInstance.control.updateValueAndValidity();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.ui-campo__error') as HTMLElement;
    expect(error?.textContent).toContain('Sucursal es obligatorio.');
    expect(combo.getAttribute('aria-invalid')).toBe('true');
    expect((combo.getAttribute('aria-describedby') ?? '').split(' ')).toContain(error.id);
  });
});
