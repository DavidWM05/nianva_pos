import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { ButtonDirective } from 'primeng/button';
import { SelectFiltroComponent } from '@nianva/ui-forms';

import { CambioReporte, SucursalReporte, fechaComoIso } from '../reporte.types';

@Component({
  selector: 'ui-report-filtros',
  standalone: true,
  imports: [ButtonDirective, DatePicker, FormsModule, SelectFiltroComponent],
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

  protected readonly rango = signal<Date[] | null>(null);
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

  protected alCambiarFechas(valor: Date | Date[] | null): void {
    const rango = Array.isArray(valor) ? valor : valor instanceof Date ? [valor] : null;

    this.rango.set(rango);
    this.emitir();
  }

  protected alCambiarSucursal(valor: unknown): void {
    this.sucursalId.set(typeof valor === 'number' ? valor : null);
    this.emitir();
  }

  protected limpiarFiltros(): void {
    this.rango.set(null);
    this.sucursalId.set(null);
    this.emitir();
    this.limpiar.emit();
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
