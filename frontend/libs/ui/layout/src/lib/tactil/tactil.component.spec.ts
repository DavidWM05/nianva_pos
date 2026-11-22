import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TactilComponent } from './tactil.component';

@Component({
  standalone: true,
  imports: [TactilComponent],
  template: `
    <div uiTactil>
      <input id="nativo" type="number" />
      <input id="material" class="mat-mdc-input-element" type="text" />
    </div>
  `,
})
class HostComponent {}

// Fase 4, B1 (UI-04): el TPV es tactil. Dentro de uiTactil, botones y controles nativos miden al
// menos 44 px de alto; los inputs de Material conservan el alto de su mat-form-field.
describe('TactilComponent', () => {
  async function crear(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('marca el contenedor como tactil', async () => {
    const raiz = await crear();

    expect(raiz.querySelector('[uiTactil]')?.classList).toContain('ui-tactil');
  });

  it('da alto tactil a los controles nativos y no a los inputs de Material', async () => {
    const raiz = await crear();

    expect(getComputedStyle(raiz.querySelector('#nativo') as HTMLElement).minHeight).toBe('var(--ui-alto-tactil)');
    expect(getComputedStyle(raiz.querySelector('#material') as HTMLElement).minHeight).not.toBe('var(--ui-alto-tactil)');
  });
});
