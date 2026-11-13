import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormActionsComponent, PantallaService } from '@nianva/ui-layout';

import { claseOverlay, TamanoOverlay } from '../overlay.types';

@Component({
  selector: 'ui-modal',
  standalone: true,
  imports: [FormActionsComponent, MatIconButton],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss', '../overlays.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'alEscape($event)',
  },
})
export class ModalComponent {
  readonly visible = model(false);
  readonly titulo = input('');
  readonly tamano = input<TamanoOverlay>('md');
  readonly cerrado = output<void>();

  protected readonly pantalla = inject(PantallaService);
  protected readonly clase = computed(() => claseOverlay('ui-modal', this.tamano(), this.pantalla.angosta()));
  private readonly plantilla = viewChild.required<TemplateRef<unknown>>('plantilla');
  private readonly dialog = inject(MatDialog);
  private dialogRef: MatDialogRef<unknown> | null = null;
  private cerrandoPorUsuario = false;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.abrir();
      } else {
        this.dialogRef?.close();
      }
    });
  }

  protected alEscape(evento: Event): void {
    // Un overlay abierto dentro del modal (matDatepicker, mat-select) atiende Escape antes y
    // marca el evento con preventDefault: ese Escape es suyo y no debe cerrar el formulario.
    if (evento.defaultPrevented) {
      return;
    }

    this.cerrar();
  }

  protected cerrar(): void {
    const ref = this.dialogRef;

    if (!ref) {
      return;
    }

    this.cerrandoPorUsuario = true;
    this.visible.set(false);
    this.cerrado.emit();
    ref.close();
  }

  private abrir(): void {
    if (this.dialogRef) {
      return;
    }

    this.dialogRef = this.dialog.open(this.plantilla(), {
      ariaLabel: this.titulo() || 'Diálogo',
      autoFocus: 'first-tabbable',
      maxWidth: '100vw',
      panelClass: this.clase().split(' '),
      restoreFocus: true,
    });

    this.dialogRef.afterClosed().subscribe(() => {
      const emitirCerrado = !this.cerrandoPorUsuario;
      this.dialogRef = null;
      this.cerrandoPorUsuario = false;
      if (this.visible()) {
        this.visible.set(false);
      }
      if (emitirCerrado) {
        this.cerrado.emit();
      }
    });
  }
}
