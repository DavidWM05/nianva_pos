import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogHostComponent, ToastHostComponent } from '@nianva/ui-shared';

/**
 * Raiz de la app -- deliberadamente NO conoce el sidebar/breadcrumb (ver
 * ShellLayoutComponent): el shell de navegacion solo se monta detras de
 * authGuard, para que nunca se vea antes de confirmar la sesion. Login,
 * 2FA y reset de password son paginas de pantalla completa, hermanas del
 * shell, no hijas de el.
 */
@Component({
  selector: 'nucleo-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialogHostComponent, ToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
