import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { BotonCrearComponent, BotonExportarComponent, RowActionsComponent } from '@nianva/ui-actions';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';

@Component({
  selector: 'cat-actions-page',
  standalone: true,
  imports: [BotonCrearComponent, BotonExportarComponent, MatButton, PageHeaderComponent, RowActionsComponent, SectionComponent],
  template: `
    <ui-page-header clave="catalogo-actions" subtitulo="Acciones de página y de fila" />

    <ui-section titulo="Crear">
      <p><ui-btn-crear objeto="producto" (crear)="ultima.set('Nuevo producto')" /></p>
      <p><ui-btn-crear objeto="orden" genero="f" ruta="/" (crear)="ultima.set('Nueva orden')" /></p>
      <p><ui-btn-crear objeto="cliente" [ruta]="'/'" /></p>
    </ui-section>

    <ui-section titulo="Exportar">
      <p><ui-btn-exportar [exportando]="exportando()" (exportar)="exportando.set(true)" /></p>
      <p><button matButton="outlined" type="button" (click)="exportando.set(false)">Terminar exportación</button></p>
    </ui-section>

    <ui-section titulo="Acciones de fila">
      <p><ui-row-actions [acciones]="basicas" (accion)="ultima.set($event.tipo)" /></p>
      <p><ui-row-actions [acciones]="conEstado" (accion)="ultima.set($event.tipo)" /></p>
      <p><ui-row-actions [acciones]="conMenu" (accion)="ultima.set($event.tipo)" /></p>
      <p><ui-row-actions [acciones]="deshabilitada" (accion)="ultima.set($event.tipo)" /></p>
      @if (ultima()) {
        <p>Última acción: {{ ultima() }}</p>
      }
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsPage {
  protected readonly exportando = signal(false);
  protected readonly ultima = signal('');
  protected readonly basicas = [
    { tipo: 'ver' as const },
    { tipo: 'editar' as const },
    { tipo: 'imprimir' as const },
    { tipo: 'eliminar' as const },
  ];
  protected readonly conEstado = [
    { tipo: 'ver' as const },
    { tipo: 'estado' as const, activo: true },
    { tipo: 'estado' as const, activo: false },
  ];
  protected readonly conMenu = [
    { tipo: 'ver' as const },
    { tipo: 'editar' as const },
    { tipo: 'historial' as const },
    { tipo: 'custom' as const, id: 'pdf', icono: 'pi pi-file-pdf', descripcion: 'Exportar PDF' },
    { tipo: 'eliminar' as const },
  ];
  protected readonly deshabilitada = [
    { tipo: 'ver' as const },
    { tipo: 'editar' as const, motivoDeshabilitada: 'Solo lectura' },
    { tipo: 'eliminar' as const, motivoDeshabilitada: 'Documento protegido' },
  ];
}
