import { CampoComponent, BtnEnviarComponent } from '@nianva/ui-forms';

import { ModalComponent } from '@nianva/ui-overlays';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { PROVEEDORES_FECHA_ES_MX, fechaComoIso } from '@nianva/ui-report';
import { FechaPipe } from '@nianva/ui-format';
import {
  CambioListado,
  ColumnaListado,
  MetaListado,
  TablaComponent,
} from '@nianva/ui-data';
import { AccionEmitida, AccionFila } from '@nianva/ui-actions';
import { PageComponent } from '@nianva/ui-layout';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DataTableLazyEvent,
  MENSAJE_SUCURSAL_REQUERIDA,
  ToastService,
  esErrorNegocio,
  mensajeError,
} from '@nianva/ui-shared';

import { AuthStateService } from '../../../../auth/auth-state.service';
import { NominaService, NominasPermisos } from '../../nomina.service';
import { Nomina } from '../../nomina.types';

const PERMISOS_VACIOS: NominasPermisos = { crear: false };

function esNumero(valor: unknown): valor is number {
  return typeof valor === 'number';
}

/** "Ver" navega a /payroll/nominas/:id -- "Pagar" vive ahi (ver NominaDetalleComponent), no aqui. */
@Component({
  selector: 'nucleo-nominas-list',
  standalone: true,
  providers: [FechaPipe, ...PROVEEDORES_FECHA_ES_MX],
  imports: [
    TablaComponent,
    PageComponent,
    FormsModule,
    CampoComponent,
    BtnEnviarComponent,
    ModalComponent,
    MatInput,
    MatButton,
    MatDatepickerModule,
  ],
  templateUrl: './nominas-list.component.html',
  styleUrl: './nominas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NominasListComponent {
  private readonly fecha = inject(FechaPipe);
  private readonly nominaService = inject(NominaService);
  private readonly authState = inject(AuthStateService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly columns: ColumnaListado<
    Nomina & { periodoTexto: string }
  >[] = [
    { tipo: 'principal', campo: 'periodoTexto', encabezado: 'Periodo' },
    { tipo: 'dinero', campo: 'total_percepciones', encabezado: 'Percepciones' },
    { tipo: 'dinero', campo: 'total_deducciones', encabezado: 'Deducciones' },
    { tipo: 'dinero', campo: 'total_neto', encabezado: 'Neto' },
    {
      tipo: 'estado',
      campo: 'estado',
      encabezado: 'Estado',
      entidad: 'nomina',
    },
    { tipo: 'acciones', acciones: () => this.acciones() },
  ];

  protected readonly nominas = signal<Nomina[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly permisos = signal<NominasPermisos>(PERMISOS_VACIOS);

  private ultimoEvento: DataTableLazyEvent = {
    first: 0,
    rows: 25,
    sortField: null,
    sortOrder: null,
    filters: {},
  };

  // -- Generar nomina --
  protected readonly mostrarGenerar = signal(false);
  protected readonly periodoInicio = signal<Date | null>(null);
  protected readonly periodoFin = signal<Date | null>(null);
  protected readonly generando = signal(false);

  constructor() {
    this.cargar(this.ultimoEvento);
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(nomina: Nomina): void {
    this.router.navigate(['/payroll/nominas', nomina.id]);
  }

  abrirGenerar(): void {
    this.periodoInicio.set(null);
    this.periodoFin.set(null);
    this.mostrarGenerar.set(true);
  }

  cerrarGenerar(): void {
    this.mostrarGenerar.set(false);
  }

  confirmarGenerar(): void {
    const inicio = fechaComoIso(this.periodoInicio());
    const fin = fechaComoIso(this.periodoFin());
    if (!inicio || !fin) return;

    const sucursalId = this.authState.usuario()?.sucursal_id;
    if (!esNumero(sucursalId)) {
      this.toast.error(
        'No se pudo determinar tu sucursal. Vuelve a iniciar sesión.',
      );

      return;
    }

    this.generando.set(true);

    this.nominaService
      .generar({
        sucursal_id: sucursalId,
        periodo_inicio: inicio,
        periodo_fin: fin,
      })
      .subscribe({
        next: () => {
          this.generando.set(false);
          this.mostrarGenerar.set(false);
          this.toast.success('Nómina generada.');
          this.cargar(this.ultimoEvento);
        },
        error: (error: HttpErrorResponse) => {
          this.generando.set(false);
          this.toast.error(
            esErrorNegocio(error, 'sucursal_requerida')
              ? MENSAJE_SUCURSAL_REQUERIDA
              : mensajeError(error, 'No se pudo generar la nómina.'),
          );
        },
      });
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.errorCarga.set(false);
    this.loading.set(true);

    this.nominaService.listar(evento).subscribe({
      next: (respuesta) => {
        this.nominas.set(respuesta.data);
        this.total.set(respuesta.total);
        this.permisos.set(respuesta.permisos);
        this.primeraCarga.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.primeraCarga.set(false);
        this.loading.set(false);
        this.errorCarga.set(true);
      },
    });
  }
  protected readonly primeraCarga = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly estado = computed(() =>
    this.loading() && this.primeraCarga()
      ? 'cargando'
      : this.errorCarga()
        ? 'error'
        : 'listo',
  );
  protected readonly filas = computed(() =>
    this.nominas().map((f) => ({
      ...f,
      periodoTexto:
        this.fecha.transform(f.periodo_inicio) +
        ' — ' +
        this.fecha.transform(f.periodo_fin),
    })),
  );
  protected get meta(): MetaListado {
    return {
      total: this.total(),
      page: Math.floor(this.ultimoEvento.first / this.ultimoEvento.rows) + 1,
      rows: this.ultimoEvento.rows,
      filtros_aplicados: {},
      permisos: {},
    };
  }
  onCambio(evento: CambioListado): void {
    this.onLazyLoad({
      first: (evento.page - 1) * evento.rows,
      rows: evento.rows,
      sortField: evento.sortField,
      sortOrder:
        evento.sortOrder === 'asc'
          ? 1
          : evento.sortOrder === 'desc'
            ? -1
            : null,
      filters: {},
    });
  }
  reintentar(): void {
    this.cargar(this.ultimoEvento);
  }

  protected acciones(): AccionFila[] {
    return [{ tipo: 'ver' }];
  }
  onAccion(fila: Nomina, accion: AccionEmitida): void {
    if (accion.tipo === 'ver') this.irADetalle(fila);
  }
}
