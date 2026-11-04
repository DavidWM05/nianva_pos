import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';

@Component({
  selector: 'cat-indice-page',
  standalone: true,
  imports: [PageHeaderComponent, RouterLink, SectionComponent],
  template: `
    <ui-page-header clave="catalogo" subtitulo="Revisión visual y accesibilidad de la Fase 2" />
    <ui-section titulo="Librerías">
      <ul>
        <li><a routerLink="/tokens">Tokens</a></li>
        <li><a routerLink="/format">Formato</a></li>
        <li><a routerLink="/feedback">Feedback</a></li>
        <li><a routerLink="/actions">Acciones</a></li>
        <li><a routerLink="/layout">Layout</a></li>
        <li><a routerLink="/data">Datos</a></li>
        <li><a routerLink="/forms">Formularios</a></li>
        <li><a routerLink="/overlays">Overlays</a></li>
        <li><a routerLink="/report">Reportes</a></li>
      </ul>
      <p>Usa el botón del encabezado para cambiar el tema o abre una ruta con <code>?tema=oscuro</code>.</p>
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicePage {}
