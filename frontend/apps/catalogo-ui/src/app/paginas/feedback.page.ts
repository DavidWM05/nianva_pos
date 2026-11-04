import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Button } from 'primeng/button';
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
  imports: [AlertComponent, BadgeComponent, Button, KpiComponent, PageHeaderComponent, SectionComponent, SkeletonComponent],
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
      <p-button label="Simular carga" severity="secondary" (onClick)="simulando.set(!simulando())" />
      <p-button label="Acción en curso" [loading]="indicador()" [disabled]="simulando()" />
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
        <p-button label="Toast éxito" (onClick)="toast.success('Venta registrada.')" />
        <p-button label="Toast error" severity="danger" (onClick)="toast.error('No se pudo guardar.')" />
        <p-button label="Toast aviso" severity="warn" (onClick)="toast.warn('Revisa el inventario.')" />
      </p>
      <p>
        <p-button label="Confirmar" severity="secondary" (onClick)="confirmar()" />
        <p-button label="Eliminar venta" severity="danger" (onClick)="eliminar()" />
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
