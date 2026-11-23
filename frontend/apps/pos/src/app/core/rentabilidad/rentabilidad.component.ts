import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { RespuestaDe } from '@nianva/api-contrato';
import { AlertComponent, KpiComponent } from '@nianva/ui-feedback';
import { CantidadPipe } from '@nianva/ui-format';
import { SectionComponent, TarjetaComponent, TarjetasComponent } from '@nianva/ui-layout';

type Rentabilidad = NonNullable<RespuestaDe<'/ventas/reporte', 'get'>['data']['rentabilidad']>;

@Component({
  selector: 'nucleo-rentabilidad',
  imports: [AlertComponent, CantidadPipe, KpiComponent, SectionComponent, TarjetaComponent, TarjetasComponent],
  templateUrl: './rentabilidad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RentabilidadComponent {
  readonly datos = input.required<Rentabilidad>();
  readonly titulo = input.required<string>();
  readonly detallada = input(false);
}
