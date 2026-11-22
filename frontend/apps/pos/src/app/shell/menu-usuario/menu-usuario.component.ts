import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { ToastService, esErrorNegocio } from '@nianva/ui-shared';

import { AuthService } from '../../auth/auth.service';
import { AuthStateService } from '../../auth/auth-state.service';
import { BloqueoSesionService } from '../../auth/bloqueo-sesion.service';
import { TemaPreferido, TemaService } from '../../core/tema.service';

interface OpcionTema {
  readonly valor: TemaPreferido;
  readonly etiqueta: string;
}

/**
 * Menu de usuario del shell (50i), proyectado en el hueco `acciones` del encabezado de ui-shell:
 * el tema (claro, oscuro o el del sistema), Preferencias y Cerrar sesion. Vive en pos porque
 * conoce al usuario y al tema; ui-shell solo le da el lugar.
 *
 * El panel es un mat-menu: abre y cierra con teclado, y Escape devuelve el foco al boton. El
 * tema va como opciones de radio (`menuitemradio` con `aria-checked`) dentro de un grupo.
 */
@Component({
  selector: 'nucleo-menu-usuario',
  standalone: true,
  imports: [MatButton, MatDivider, MatMenu, MatMenuItem, MatMenuTrigger, RouterLink],
  templateUrl: './menu-usuario.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuUsuarioComponent {
  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly bloqueo = inject(BloqueoSesionService);
  private readonly toast = inject(ToastService);
  protected readonly tema = inject(TemaService);

  protected readonly opcionesTema: readonly OpcionTema[] = [
    { valor: 'claro', etiqueta: 'Tema claro' },
    { valor: 'oscuro', etiqueta: 'Tema oscuro' },
    { valor: 'sistema', etiqueta: 'Tema del sistema' },
  ];

  protected readonly nombre = computed(() => {
    const usuario = this.authState.usuario();

    return usuario ? [usuario.nombre, usuario.apellido].filter(Boolean).join(' ') : '';
  });

  protected elegirTema(valor: TemaPreferido): void {
    this.tema.establecer(valor);
  }

  /**
   * SEG-12: bloquea la terminal sin cerrar la sesion; se desbloquea con el PIN de caja del mismo
   * usuario. Sin PIN configurado el servidor responde 409 y se dice donde configurarlo.
   */
  protected bloquearSesion(): void {
    this.auth.bloquearSesion().subscribe({
      next: () => this.bloqueo.activar(),
      error: (error: unknown) => {
        if (esErrorNegocio(error, 'pin_caja_no_configurado')) {
          this.toast.error('Configura tu PIN de caja en Preferencias antes de bloquear la sesión.', 'Sin PIN de caja');
        }
      },
    });
  }

  /**
   * Sin confirmacion: salir no destruye datos. Con exito, AuthService.logout ya cierra la sesion
   * en las demas pestanas (SesionEntrePestanasService) y lleva a /login. Si el backend falla, la
   * sesion local se limpia igual: en una terminal compartida, el boton siempre saca al usuario.
   */
  protected cerrarSesion(): void {
    this.auth.logout().subscribe({
      error: () => {
        this.authState.clear();
        void this.router.navigate(['/login']);
      },
    });
  }
}
