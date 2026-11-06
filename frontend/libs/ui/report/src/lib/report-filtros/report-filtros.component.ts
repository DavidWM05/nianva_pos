import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { SelectFiltroComponent } from '@nianva/ui-forms';

import { CambioReporte, SucursalReporte, fechaComoIso } from '../reporte.types';
import { PROVEEDORES_FECHA_ES_MX } from './fecha-iso.adapter';

let siguienteFiltros = 0;

interface RangoFecha {
  start: Date | null;
  end: Date | null;
}

@Component({
  selector: 'ui-report-filtros',
  standalone: true,
  imports: [FormsModule, MatButton, MatDatepickerModule, MatFormFieldModule, ReactiveFormsModule, SelectFiltroComponent],
  providers: PROVEEDORES_FECHA_ES_MX,
  templateUrl: './report-filtros.component.html',
  styleUrl: './report-filtros.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportFiltrosComponent {
  readonly sucursales = input<readonly SucursalReporte[]>([]);
  readonly puedeElegirSucursal = input(false);
  readonly sucursalUsuario = input<SucursalReporte | null>(null);

  readonly cambio = output<CambioReporte>();
  readonly limpiar = output<void>();

  // Unico por instancia: una pantalla puede tener varios reportes con sus filtros.
  protected readonly idEtiquetaPeriodo = `ui-report-filtros-periodo-${++siguienteFiltros}`;
  protected readonly rango = signal<Date[] | null>(null);
  protected readonly fechas = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });
  protected readonly sucursalId = signal<number | null>(null);
  protected readonly opcionesSucursales = computed(() =>
    this.sucursales().map((sucursal) => ({ label: sucursal.nombre, value: sucursal.id })),
  );
  // SEG-02: sin sucursales.todas la sucursal es la del usuario. Si no se informa, no se
  // adivina con la primera de la lista: se manda null y el backend usa la del usuario
  // (SucursalOperacion::paraFiltro).
  protected readonly sucursalTexto = computed(() => this.sucursalUsuario()?.nombre ?? 'Tu sucursal');
  protected readonly sucursalEfectiva = computed(() => {
    if (this.puedeElegirSucursal()) {
      return this.sucursalId();
    }

    return this.sucursalUsuario()?.id ?? null;
  });

  constructor() {
    this.fechas.valueChanges.subscribe(({ start, end }) => {
      this.alCambiarFechas({ start: start ?? null, end: end ?? null });
    });
  }

  protected alCambiarFechas(valor: Date | Date[] | RangoFecha | null): void {
    const rango = this.aRango(valor);

    this.rango.set(rango);
    this.fechas.setValue({ start: rango?.[0] ?? null, end: rango?.[1] ?? null }, { emitEvent: false });
    this.emitir();
  }

  protected alCambiarSucursal(valor: unknown): void {
    this.sucursalId.set(typeof valor === 'number' ? valor : null);
    this.emitir();
  }

  protected limpiarFiltros(): void {
    this.rango.set(null);
    this.fechas.reset({ start: null, end: null }, { emitEvent: false });
    this.sucursalId.set(null);
    this.emitir();
    this.limpiar.emit();
  }

  private aRango(valor: Date | Date[] | RangoFecha | null): Date[] | null {
    if (valor instanceof Date) {
      return Number.isNaN(valor.getTime()) ? null : [valor];
    }

    if (Array.isArray(valor)) {
      const fechas = valor.filter((fecha): fecha is Date => fecha instanceof Date && !Number.isNaN(fecha.getTime()));

      return fechas.length > 0 ? fechas : null;
    }

    if (valor !== null && typeof valor === 'object') {
      const fechas = [valor.start, valor.end].filter(
        (fecha): fecha is Date => fecha instanceof Date && !Number.isNaN(fecha.getTime()),
      );

      return fechas.length > 0 ? fechas : null;
    }

    return null;
  }

  private emitir(): void {
    const rango = this.rango();

    this.cambio.emit({
      desde: fechaComoIso(rango?.[0]),
      hasta: fechaComoIso(rango?.[1]),
      sucursalId: this.sucursalEfectiva(),
    });
  }
}
