import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { AuthStateService } from '../../auth/auth-state.service';
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
