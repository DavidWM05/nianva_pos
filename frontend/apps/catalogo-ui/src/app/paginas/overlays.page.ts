import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { DrawerComponent, ModalComponent, TamanoOverlay } from '@nianva/ui-overlays';

@Component({
  selector: 'cat-overlays-page',
  standalone: true,
  imports: [Button, DrawerComponent, ModalComponent, PageHeaderComponent, SectionComponent],
  template: `
    <ui-page-header clave="catalogo-overlays" subtitulo="Modal y drawer abiertos" />

    <ui-section titulo="Abrir overlays">
      <p-button label="Modal sm" (onClick)="abrirModal('sm')" />
      <p-button label="Modal md" (onClick)="abrirModal('md')" />
      <p-button label="Modal lg" (onClick)="abrirModal('lg')" />
      <p-button label="Drawer sm" severity="secondary" (onClick)="abrirDrawer('sm')" />
      <p-button label="Drawer md" severity="secondary" (onClick)="abrirDrawer('md')" />
      <p-button label="Drawer lg" severity="secondary" (onClick)="abrirDrawer('lg')" />
    </ui-section>

    <ui-modal
      [visible]="modalVisible()"
      (visibleChange)="modalVisible.set($event)"
      titulo="Editar producto"
      [tamano]="tamanoModal()"
    >
      <p>Contenido del modal con sus acciones.</p>
      <p-button acciones label="Guardar" />
    </ui-modal>

    <ui-drawer
      [visible]="drawerVisible()"
      (visibleChange)="drawerVisible.set($event)"
      titulo="Detalle de venta"
      [tamano]="tamanoDrawer()"
    >
      <p>Contenido del drawer de detalle.</p>
      <p-button acciones label="Cerrar detalle" severity="secondary" />
    </ui-drawer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlaysPage {
  protected readonly modalVisible = signal(true);
  protected readonly drawerVisible = signal(true);
  protected readonly tamanoModal = signal<TamanoOverlay>('md');
  protected readonly tamanoDrawer = signal<TamanoOverlay>('lg');

  protected abrirModal(tamano: TamanoOverlay): void {
    this.tamanoModal.set(tamano);
    this.modalVisible.set(true);
  }

  protected abrirDrawer(tamano: TamanoOverlay): void {
    this.tamanoDrawer.set(tamano);
    this.drawerVisible.set(true);
  }
}
