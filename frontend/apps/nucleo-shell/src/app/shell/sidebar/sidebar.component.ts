import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Button } from 'primeng/button';

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
  imports: [RouterLink, RouterLinkActive, Button],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly router = inject(Router);

  protected readonly itemInicio = NUCLEO_ITEM_INICIO;
  protected readonly groups = NUCLEO_NAV_GROUPS;
  protected readonly collapsed = signal(false);

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
