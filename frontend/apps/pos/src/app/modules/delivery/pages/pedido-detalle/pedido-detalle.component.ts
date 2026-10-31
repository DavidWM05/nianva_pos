import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuditLogViewerComponent, EntidadSelectorComponent, RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService, mensajeError } from '@nianva/ui-shared';
import { Button } from 'primeng/button';

import { BUSCADOR_USUARIO } from '../../../../core/buscadores-entidad.tokens';
import { PedidoService } from '../../pedido.service';
import { EstadoPedido, Pedido, TRANSICIONES_PEDIDO } from '../../pedido.types';

const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'Pendiente',
  preparando: 'Preparando',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

/**
 * Vista de registro (RecordTabsComponent, obligatorio -- CLAUDE.md §4).
 * Sin permisos de gating: mismo criterio que el resto de módulos nuevos
 * (permisosDe() no encaja con el catálogo real de Pedidos -- ver
 * ver/crear/cambiar_estado/asignar_repartidor en NucleoRolesPermisosSeeder).
 * Se muestran las acciones siempre y el 403 real se ve como toast.
 */
@Component({
  selector: 'nucleo-pedido-detalle',
  standalone: true,
  imports: [DatePipe, RecordTabsComponent, AuditLogViewerComponent, StatusBadgeComponent, EntidadSelectorComponent, Button],
  templateUrl: './pedido-detalle.component.html',
  styleUrl: './pedido-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pedidoService = inject(PedidoService);
  private readonly toast = inject(ToastService);

  protected readonly buscadorRepartidor = inject(BUSCADOR_USUARIO);
  protected readonly etiquetasEstado = ETIQUETAS_ESTADO;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Pedido', icon: 'pi pi-truck' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];

  protected readonly cargando = signal(true);
  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly cambiandoEstado = signal(false);
  protected readonly asignandoRepartidor = signal(false);

  protected readonly transicionesDisponibles = computed<EstadoPedido[]>(() => {
    const p = this.pedido();

    return p ? TRANSICIONES_PEDIDO[p.estado] : [];
  });

  protected readonly puedeAsignarRepartidor = computed(() => {
    const estado = this.pedido()?.estado;

    return estado !== undefined && estado !== 'entregado' && estado !== 'cancelado';
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.cargar(id);
  }

  cambiarEstado(nuevoEstado: EstadoPedido): void {
    const pedido = this.pedido();
    if (!pedido) return;

    this.cambiandoEstado.set(true);

    this.pedidoService.cambiarEstado(pedido.id, nuevoEstado).subscribe({
      next: (actualizado) => {
        this.cambiandoEstado.set(false);
        this.pedido.set(actualizado);
        this.toast.success(`Pedido marcado como "${ETIQUETAS_ESTADO[nuevoEstado]}".`);
      },
      error: (error: HttpErrorResponse) => {
        this.cambiandoEstado.set(false);
        this.toast.error(mensajeError(error, 'No se pudo cambiar el estado del pedido.'));
      },
    });
  }

  asignarRepartidor(repartidorId: number | null): void {
    const pedido = this.pedido();
    if (!pedido || repartidorId === null) return;

    this.asignandoRepartidor.set(true);

    this.pedidoService.asignarRepartidor(pedido.id, repartidorId).subscribe({
      next: (actualizado) => {
        this.asignandoRepartidor.set(false);
        this.pedido.set(actualizado);
        this.toast.success('Repartidor asignado.');
      },
      error: (error: HttpErrorResponse) => {
        this.asignandoRepartidor.set(false);
        this.toast.error(mensajeError(error, 'No se pudo asignar el repartidor.'));
      },
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.pedidoService.obtener(id).subscribe({
      next: (pedido) => {
        this.pedido.set(pedido);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

}
