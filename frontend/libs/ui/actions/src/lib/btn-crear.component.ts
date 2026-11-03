import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';

@Component({
  selector: 'ui-btn-crear',
  standalone: true,
  imports: [ButtonDirective, RouterLink],
  template: `
    <button
      pButton
      type="button"
      severity="primary"
      [routerLink]="ruta() ?? null"
      (click)="onClick()"
    >
      <i class="pi pi-plus" aria-hidden="true"></i>
      <span>{{ etiqueta() }}</span>
    </button>
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
