import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { PantallaService } from '@nianva/ui-layout';

import { SesionActualService } from '../../auth/sesion-actual.service';
import { NUCLEO_ITEM_INICIO, NUCLEO_NAV_GROUPS } from '../../modules/modules.config';

/**
 * Sidebar persistente (no overlay) y colapsable: al colapsar solo quedan
 * los iconos, el contenido de la app no se mueve encima. Organizado en
 * secciones colapsables (NUCLEO_NAV_GROUPS) -- patron NavGroup[] de Angara
 * Dental, ver el reporte del analisis de UX.
 */
@Component({
  selector: 'nucleo-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconButton],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly router = inject(Router);

  private readonly sesionActual = inject(SesionActualService);

  protected readonly itemInicio = NUCLEO_ITEM_INICIO;
  protected readonly groups = NUCLEO_NAV_GROUPS;
  /**
   * El menu segun GET /sesion (API-09): sin las entradas que el usuario no tiene permiso de
   * ver o cuyo modulo esta apagado, y sin los grupos que se quedan vacios. Solo oculta; la
   * autoridad sigue siendo el backend.
   */
  protected readonly gruposVisibles = computed(() =>
    this.groups
      .map((grupo) => ({
        ...grupo,
        items: grupo.items.filter((item) => this.sesionActual.visible(item.permiso, item.modulo)),
      }))
      .filter((grupo) => grupo.items.length > 0),
  );
  protected readonly collapsed = signal(false);
  /** En pantalla angosta el menu es un panel de ui-shell: se ve siempre completo y sin colapsar. */
  protected readonly angosta = inject(PantallaService).angosta;
  protected readonly colapsado = computed(() => this.collapsed() && !this.angosta());

  /**
   * El grupo que contiene la ruta activa arranca expandido -- el resto
   * arranca colapsado, para que la lista no sea mas larga que la version
   * plana anterior en la carga inicial. Un Set (no un solo id) porque el
   * usuario puede tener varios grupos abiertos a la vez.
   */
  protected readonly expandedGroups = signal<Set<string>>(this.grupoInicialExpandido());

  private grupoInicialExpandido(): Set<string> {
    const url = this.router.url;
    const grupoActivo = this.groups.find((grupo) => grupo.items.some((item) => url.includes(`/${item.path}`)));

    return new Set(grupoActivo ? [grupoActivo.key] : []);
  }

  toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
  }

  toggleGroup(key: string): void {
    this.expandedGroups.update((actuales) => {
      const nuevo = new Set(actuales);
      if (nuevo.has(key)) {
        nuevo.delete(key);
      } else {
        nuevo.add(key);
      }

      return nuevo;
    });
  }

  protected grupoExpandido(key: string): boolean {
    return this.expandedGroups().has(key);
  }
}
