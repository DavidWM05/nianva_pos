import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  AlertComponent,
  BadgeComponent,
  ConfirmDialogService,
  KpiComponent,
  SkeletonComponent,
  ToastService,
  conUmbral,
} from '@nianva/ui-feedback';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';

@Component({
  selector: 'cat-feedback-page',
  standalone: true,
  imports: [AlertComponent, BadgeComponent, KpiComponent, MatButton, PageHeaderComponent, SectionComponent, SkeletonComponent],
  template: `
    <ui-page-header clave="catalogo-feedback" subtitulo="Estados, alertas, KPI y mensajes" />

    <ui-section titulo="Badges por tono">
      <p><ui-badge entidad="apartado" estado="completado" /> Éxito</p>
      <p><ui-badge entidad="cotizacion" estado="vencida" /> Advertencia</p>
      <p><ui-badge entidad="venta" estado="anulada" /> Peligro</p>
      <p><ui-badge entidad="notaCredito" estado="usada_parcial" /> Info</p>
      <p><ui-badge entidad="giftCard" estado="usada" /> Neutro</p>
      <p><ui-badge entidad="venta" estado="completada" /> Estado normal (sin badge)</p>
    </ui-section>

    <ui-section titulo="Skeleton">
      <ui-skeleton forma="texto" [lineas]="3" />
      <ui-skeleton forma="bloque" alto="6rem" />
      <ui-skeleton forma="circulo" />
    </ui-section>

    <ui-section titulo="Indicador con umbral">
      <p><button matButton="outlined" type="button" (click)="simulando.set(!simulando())">Simular carga</button>
      <button matButton="filled" type="button" [showProgress]="indicador()" [disabled]="simulando()">Acción en curso</button></p>
    </ui-section>

    <ui-section titulo="Alertas fijas">
      <ui-alert tono="exito" titulo="Guardado">Los cambios se guardaron correctamente.</ui-alert>
      <ui-alert tono="advertencia" titulo="Revisa los datos">Hay campos pendientes de confirmar.</ui-alert>
      <ui-alert tono="peligro" titulo="No se pudo guardar">Revisa la conexión e inténtalo de nuevo.</ui-alert>
      <ui-alert tono="info">Este aviso no bloquea la operación.</ui-alert>
    </ui-section>

    <ui-section titulo="KPI">
      <ui-kpi etiqueta="Ventas" [valor]="1250.5" formato="dinero" [variacion]="12.5" />
      <ui-kpi etiqueta="Tickets" [valor]="38" formato="cantidad" unidad="ticket" [variacion]="0" />
      <ui-kpi etiqueta="Margen" [valor]="16" formato="porcentaje" [variacion]="-4" />
      <ui-kpi etiqueta="Estado" valor="Sin datos" formato="texto" />
      <ui-kpi etiqueta="Cargando KPI" [valor]="0" formato="dinero" [cargando]="true" />
    </ui-section>

    <ui-section titulo="Toasts y confirmaciones">
      <p>
        <button matButton="filled" type="button" (click)="toast.success('Venta registrada.')">Toast éxito</button>
        <button matButton="filled" class="cat-boton-peligro" type="button" (click)="toast.error('No se pudo guardar.')">Toast error</button>
        <button matButton="outlined" class="cat-boton-aviso" type="button" (click)="toast.warn('Revisa el inventario.')">Toast aviso</button>
      </p>
      <p>
        <button matButton="outlined" type="button" (click)="confirmar()">Confirmar</button>
        <button matButton="filled" class="cat-boton-peligro" type="button" (click)="eliminar()">Eliminar venta</button>
      </p>
      @if (resultado()) {
        <p>Resultado: {{ resultado() }}</p>
      }
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackPage {
  protected readonly toast = inject(ToastService);
  private readonly confirmacion = inject(ConfirmDialogService);
  protected readonly simulando = signal(false);
  protected readonly resultado = signal('');
  protected readonly indicador = conUmbral(this.simulando);

  protected async confirmar(): Promise<void> {
    const aceptado = await this.confirmacion.confirm({ message: '¿Continuar con la operación?', header: 'Confirmar' });
    this.resultado.set(aceptado ? 'aceptado' : 'cancelado');
  }

  protected async eliminar(): Promise<void> {
    const aceptado = await this.confirmacion.confirmarEliminacion({ objeto: 'venta' });
    this.resultado.set(aceptado ? 'anulada' : 'cancelada');
  }
}
