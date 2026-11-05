import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { DrawerComponent, ModalComponent, TamanoOverlay } from '@nianva/ui-overlays';

@Component({
  selector: 'cat-overlays-page',
  standalone: true,
  imports: [DrawerComponent, MatButton, ModalComponent, PageHeaderComponent, SectionComponent],
  template: `
    <ui-page-header clave="catalogo-overlays" subtitulo="Modal y drawer abiertos" />

    <ui-section titulo="Abrir overlays">
      <p>
        <button matButton="filled" type="button" (click)="abrirModal('sm')">Modal sm</button>
        <button matButton="filled" type="button" (click)="abrirModal('md')">Modal md</button>
        <button matButton="filled" type="button" (click)="abrirModal('lg')">Modal lg</button>
        <button matButton="outlined" type="button" (click)="abrirDrawer('sm')">Drawer sm</button>
        <button matButton="outlined" type="button" (click)="abrirDrawer('md')">Drawer md</button>
        <button matButton="outlined" type="button" (click)="abrirDrawer('lg')">Drawer lg</button>
      </p>
    </ui-section>

    <ui-modal
      [visible]="modalVisible()"
      (visibleChange)="modalVisible.set($event)"
      titulo="Editar producto"
      [tamano]="tamanoModal()"
    >
      <p>Contenido del modal con sus acciones.</p>
      <button matButton="filled" acciones type="button">Guardar</button>
    </ui-modal>

    <ui-drawer
      [visible]="drawerVisible()"
      (visibleChange)="drawerVisible.set($event)"
      titulo="Detalle de venta"
      [tamano]="tamanoDrawer()"
    >
      <p>Contenido del drawer de detalle.</p>
      <button matButton="outlined" acciones type="button">Cerrar detalle</button>
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
