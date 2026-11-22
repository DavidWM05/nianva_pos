import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { CampoComponent, InputPinComponent } from '@nianva/ui-forms';
import { FormActionsComponent, PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { DrawerComponent, ModalComponent, PantallaBloqueoComponent, TamanoOverlay } from '@nianva/ui-overlays';

@Component({
  selector: 'cat-overlays-page',
  standalone: true,
  imports: [
    CampoComponent,
    DrawerComponent,
    FormActionsComponent,
    FormsModule,
    InputPinComponent,
    MatButton,
    ModalComponent,
    PageHeaderComponent,
    PantallaBloqueoComponent,
    SectionComponent,
  ],
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

    <ui-section titulo="Pantalla de bloqueo">
      <p>
        <button matButton="outlined" type="button" (click)="bloqueada.set(true)">Mostrar pantalla de bloqueo</button>
      </p>
    </ui-section>

    @if (bloqueada()) {
      <ui-pantalla-bloqueo titulo="Sesión bloqueada">
        <p>Ingresa tu PIN de caja para continuar.</p>
        <ui-campo etiqueta="PIN de caja"><ui-input-pin [longitud]="6" [(ngModel)]="pin" /></ui-campo>
        <ui-form-actions>
          <button matButton="outlined" type="button" (click)="bloqueada.set(false)">Cerrar sesión</button>
          <button matButton="filled" type="button" (click)="bloqueada.set(false)">Desbloquear</button>
        </ui-form-actions>
      </ui-pantalla-bloqueo>
    }

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
  protected readonly bloqueada = signal(false);
  protected pin = '';

  protected abrirModal(tamano: TamanoOverlay): void {
    this.tamanoModal.set(tamano);
    this.modalVisible.set(true);
  }

  protected abrirDrawer(tamano: TamanoOverlay): void {
    this.tamanoDrawer.set(tamano);
    this.drawerVisible.set(true);
  }
}
