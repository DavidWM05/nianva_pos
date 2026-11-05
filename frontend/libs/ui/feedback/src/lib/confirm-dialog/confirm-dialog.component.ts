import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  header: string;
  message: string;
  acceptLabel: string;
  rejectLabel: string;
  severity: 'danger' | 'info';
}

@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.header }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button data-cancelar [mat-dialog-close]="false">{{ data.rejectLabel }}</button>
      <button
        mat-flat-button
        [class.ui-confirm-dialog__aceptar--peligro]="data.severity === 'danger'"
        [mat-dialog-close]="true"
      >
        {{ data.acceptLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styleUrl: './confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
