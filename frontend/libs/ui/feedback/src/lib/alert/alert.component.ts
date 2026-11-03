import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TonoAlerta = 'exito' | 'advertencia' | 'peligro' | 'info';

@Component({
  selector: 'ui-alert',
  standalone: true,
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'rol()',
    '[class]': '"ui-alert ui-alert--" + tono()',
  },
})
export class AlertComponent {
  readonly tono = input<TonoAlerta>('info');
  readonly titulo = input<string | null>(null);

  protected readonly rol = computed(() => (this.tono() === 'peligro' || this.tono() === 'advertencia' ? 'alert' : 'status'));
}
