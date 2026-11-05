import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ui-btn-crear',
  standalone: true,
  imports: [MatButton, RouterLink],
  template: `
    <button
      matButton="filled"
      type="button"
      [routerLink]="ruta() ?? null"
      (click)="onClick()"
    >
      <i class="pi pi-plus ui-btn-crear__icono" matButtonIcon aria-hidden="true"></i>
      <span>{{ etiqueta() }}</span>
    </button>
  `,
  styles: `
    .ui-btn-crear__icono {
      margin-inline-end: var(--nv-spacing-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotonCrearComponent {
  readonly objeto = input.required<string>();
  readonly genero = input<'m' | 'f'>('m');
  readonly ruta = input<string | readonly unknown[] | undefined>(undefined);
  readonly crear = output<void>();

  protected readonly etiqueta = computed(() => `${this.genero() === 'f' ? 'Nueva' : 'Nuevo'} ${this.objeto()}`);

  protected onClick(): void {
    if (this.ruta() === undefined) {
      this.crear.emit();
    }
  }
}
