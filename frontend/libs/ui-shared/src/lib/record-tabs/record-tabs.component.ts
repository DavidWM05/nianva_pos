import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ContentChildren, ElementRef, Input, QueryList, TemplateRef, inject, signal } from '@angular/core';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';

export interface RecordTabConfig {
  label: string;
  icon?: string;
}

/**
 * Patron de vista de registro con pestanas (ej. General / Relacionado /
 * Auditoria) -- reutilizable por cualquier modulo futuro, en vez de que
 * cada uno reconstruya su propio TabView. El contenido de cada pestana se
 * pasa por content projection, un <ng-template> por cada entrada de
 * `tabs`, en el MISMO orden:
 *
 *   <nucleo-record-tabs [tabs]="[{label:'General'},{label:'Auditoria'}]">
 *     <ng-template>...contenido general...</ng-template>
 *     <ng-template>
 *       @defer (on viewport) {
 *         <nucleo-audit-log-viewer [tabla]="'ventas'" [registroId]="1" />
 *       } @placeholder { <p>Cargando auditoria...</p> }
 *     </ng-template>
 *   </nucleo-record-tabs>
 *
 * El @defer va en el USO del componente (ver apps/pos demo), no
 * aqui -- este componente solo decide CUANDO renderiza cada
 * ng-template (al cambiar de pestana), el @defer decideademas cuando se
 * descarga el codigo de lo que hay dentro.
 */
@Component({
  selector: 'nucleo-record-tabs',
  standalone: true,
  imports: [CommonModule, MatTabNav, MatTabLink, MatTabNavPanel],
  templateUrl: './record-tabs.component.html',
  styleUrl: './record-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordTabsComponent {
  @Input({ required: true }) tabs: RecordTabConfig[] = [];

  @ContentChildren(TemplateRef) templates!: QueryList<TemplateRef<unknown>>;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly activa = signal(0);

  /**
   * El ng-template de la pestana `indice`. La consulta de contenido tambien
   * devuelve los TemplateRef que crea un @if/@for en la raiz de una pestana
   * ya pintada, y eso corria el indice de las siguientes (50g). Esos viven
   * dentro de este componente; los ng-template hijos directos no se pintan
   * en su sitio (no hay <ng-content>), asi que su ancla queda fuera.
   */
  protected plantilla(indice: number): TemplateRef<unknown> | null {
    const propias = this.templates.filter(
      (plantilla) => !this.host.nativeElement.contains(plantilla.elementRef.nativeElement as Node),
    );

    return propias[indice] ?? null;
  }

  protected seleccionar(indice: number): void {
    this.activa.set(indice);
  }

  protected trackByLabel(_index: number, tab: RecordTabConfig): string {
    return tab.label;
  }
}
