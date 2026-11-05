import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

type TonoToast = 'success' | 'error' | 'warn' | 'info';

export interface ToastContentData {
  severity: TonoToast;
  summary: string;
  detail: string;
}

@Component({
  selector: 'ui-toast-content',
  standalone: true,
  template: `
    <strong class="ui-toast__summary">{{ data.summary }}</strong>
    <span class="ui-toast__detail">{{ data.detail }}</span>
  `,
  styleUrl: './toast-content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': "data.severity === 'error' ? 'alert' : 'status'",
    '[attr.aria-live]': "data.severity === 'error' ? 'assertive' : 'polite'",
    '[class]': '"ui-toast ui-toast--" + data.severity',
  },
})
export class ToastContentComponent {
  protected readonly data = inject<ToastContentData>(MAT_SNACK_BAR_DATA);
}
