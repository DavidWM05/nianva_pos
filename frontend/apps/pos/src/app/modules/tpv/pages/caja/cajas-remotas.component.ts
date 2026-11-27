import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { limitesDe, RespuestaDe } from '@nianva/api-contrato';
import { CajaService, CajaSesion } from '@nianva/domain-tpv';
import { SkeletonComponent } from '@nianva/ui-feedback';
import { DineroPipe } from '@nianva/ui-format';
import { CampoComponent } from '@nianva/ui-forms';
import { mensajeError } from '@nianva/ui-shared';
import { finalize } from 'rxjs';

import { IntentoOperacion } from '../../../../core/operaciones/intento-operacion';
import { AutorizacionSupervisorService } from '../../../../core/supervisor/autorizacion-supervisor.service';

type CajasRemotas = RespuestaDe<'/caja/remotas', 'get'>;
type CajaRemota = CajasRemotas['data'][number];

@Component({
  selector: 'nucleo-cajas-remotas',
  standalone: true,
  imports: [FormsModule, RouterLink, MatButton, DineroPipe, CampoComponent, SkeletonComponent],
  templateUrl: './cajas-remotas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CajasRemotasComponent implements OnInit {
  private readonly cajaService = inject(CajaService);
  private readonly supervisor = inject(AutorizacionSupervisorService);
  private readonly intento = new IntentoOperacion();

  protected readonly cajas = signal<CajaRemota[]>([]);
  protected readonly cargando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly confirmacion = signal('');
  protected readonly corte = signal<CajaSesion | null>(null);
  protected readonly cantidades = signal<Record<string, string>>({});
  protected readonly limites = limitesDe('/caja/{cajaSesion}/cerrar', 'patch').conteos.elemento.monto;

  ngOnInit(): void {
    this.consultar();
  }

  protected consultar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.cajaService.remotas().pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: cajas => this.cajas.set(cajas),
      error: error => this.error.set(mensajeError(error, 'No se pudieron consultar las otras cajas.')),
    });
  }

  protected capturar(id: string, valor: string): void {
    this.cantidades.update(cantidades => ({ ...cantidades, [id]: valor }));
  }

  protected conteosValidos(caja: CajaRemota): boolean {
    return caja.metodos.length > 0 && caja.metodos.every(metodo => {
      const valor = this.cantidades()[`${caja.id}-${metodo.metodo_pago_id}`] ?? '';
      return /^\d+(\.\d{1,2})?$/.test(valor) && Number(valor) >= this.limites.minimum && Number(valor) <= this.limites.maximum;
    });
  }

  protected cerrar(caja: CajaRemota): void {
    if (this.enviando() || !this.conteosValidos(caja)) return;

    const conteos = caja.metodos.map(metodo => ({
      metodo_pago_id: metodo.metodo_pago_id,
      monto: Number(this.cantidades()[`${caja.id}-${metodo.metodo_pago_id}`]),
    }));
    this.enviando.set(true);
    this.error.set('');
    this.supervisor.ejecutar(
      this.intento,
      { accion: 'caja.cerrar_remota', recurso: caja.id, datos: { conteos }, descripcion: `Cerrar la caja de ${caja.terminal}` },
      (llave, token) => this.cajaService.cerrar(caja.id, conteos, llave, token),
    ).pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: ({ sesion }) => {
        this.cajas.update(cajas => cajas.filter(actual => actual.id !== caja.id));
        this.corte.set(sesion);
        this.confirmacion.set(sesion.folio ? `Corte ${sesion.folio} registrado.` : 'Caja cerrada.');
      },
      error: error => this.error.set(mensajeError(error, 'No se pudo cerrar la caja.')),
    });
  }
}
