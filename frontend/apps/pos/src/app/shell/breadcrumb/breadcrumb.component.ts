import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { filter, startWith } from 'rxjs';

/**
 * Breadcrumbs automaticos: se reconstruyen leyendo `data.breadcrumb` de
 * cada nivel de la ruta activa -- ningun modulo tiene que renderizar su
 * propio breadcrumb, solo declarar `data: { breadcrumb: '...' }` en su
 * ruta (ver app.routes.ts).
 */
@Component({
  selector: 'nucleo-breadcrumb',
  standalone: true,
  imports: [Breadcrumb],
  template: `<p-breadcrumb [model]="items()" [home]="home" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  protected readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  protected readonly items = signal<MenuItem[]>([]);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.items.set(this.buildBreadcrumb(this.activatedRoute.root));
      });
  }

  private buildBreadcrumb(route: ActivatedRoute, url = '', breadcrumbs: MenuItem[] = []): MenuItem[] {
    const [child] = route.children;
    if (!child) {
      return breadcrumbs;
    }

    const routeUrl = child.snapshot.url.map((segment) => segment.path).join('/');
    const nextUrl = routeUrl ? `${url}/${routeUrl}` : url;
    const label = child.snapshot.data['breadcrumb'] as string | undefined;

    if (label) {
      breadcrumbs.push({ label, routerLink: nextUrl });
    }

    return this.buildBreadcrumb(child, nextUrl, breadcrumbs);
  }
}
