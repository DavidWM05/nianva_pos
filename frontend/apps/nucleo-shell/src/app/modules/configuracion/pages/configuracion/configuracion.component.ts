import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { RecordTabConfig, RecordTabsComponent, StatusBadgeComponent, ToastService } from '@nucleo/ui-shared';

import { ConfiguracionFormComponent } from '../../configuracion-form/configuracion-form.component';
import { ConfiguracionSeguridadFormComponent } from '../../configuracion-seguridad-form/configuracion-seguridad-form.component';
import { ConfiguracionService } from '../../configuracion.service';
import {
  ConfiguracionSeguridad,
  ConfiguracionTenant,
  ConfiguracionTenantFormPayload,
  LicenciaLocal,
} from '../../configuracion.types';

/**
 * "Empresa" (moneda/ticket/logo/backup + dias de dispositivo confiable) y
 * "Licencia" (estado real via LicenciaLocalController, ver el reporte del
 * cliente de licenciamiento) como tabs de una sola pantalla
 * (RecordTabsComponent), en vez de dos rutas separadas -- ver el reporte
 * de reorganizacion del sidebar. Dentro de Empresa, las dos secciones
 * (datos del tenant / dias de dispositivo confiable) se muestran/ocultan
 * de forma INDEPENDIENTE segun la respuesta del backend a cada GET --
 * gateadas por permisos distintos (configuracion.editar vs
 * configuracion.ver/editar), asi que un 403 en una no debe ocultar la otra
 * ni el resto de la pantalla (mismo criterio que antes tenia el perfil de
 * Preferencias con esta misma seccion). El tab Licencia no tiene permiso
 * propio -- cualquier usuario autenticado ve el estado de la licencia de
 * su tenant (ver LicenciaLocalController).
 */
@Component({
  selector: 'nucleo-configuracion',
  standalone: true,
  imports: [RecordTabsComponent, ConfiguracionFormComponent, ConfiguracionSeguridadFormComponent, StatusBadgeComponent, DatePipe],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);

  @ViewChild(ConfiguracionFormComponent) private formulario?: ConfiguracionFormComponent;
  @ViewChild(ConfiguracionSeguridadFormComponent) private formularioSeguridad?: ConfiguracionSeguridadFormComponent;

  protected readonly tabs: RecordTabConfig[] = [
    { label: 'Empresa', icon: 'pi pi-briefcase' },
    { label: 'Licencia', icon: 'pi pi-verified' },
  ];

  protected readonly cargando = signal(true);
  protected readonly visible = signal(false);
  protected readonly configuracion = signal<ConfiguracionTenant | null>(null);
  protected readonly guardando = signal(false);

  protected readonly seguridadVisible = signal(false);
  protected readonly seguridadConfiguracion = signal<ConfiguracionSeguridad | null>(null);
  protected readonly guardandoSeguridad = signal(false);

  protected readonly licenciaCargando = signal(true);
  protected readonly licencia = signal<LicenciaLocal | null>(null);

  ngOnInit(): void {
    this.configuracionService.obtener().subscribe({
      next: (configuracion) => {
        this.configuracion.set(configuracion);
        this.visible.set(true);
        this.cargando.set(false);
      },
      error: () => {
        this.visible.set(false);
        this.cargando.set(false);
      },
    });

    this.configuracionService.obtenerSeguridad().subscribe({
      next: (configuracion) => {
        this.seguridadConfiguracion.set(configuracion);
        this.seguridadVisible.set(true);
      },
      error: () => this.seguridadVisible.set(false),
    });

    this.configuracionService.obtenerLicencia().subscribe({
      next: (licencia) => {
        this.licencia.set(licencia);
        this.licenciaCargando.set(false);
      },
      // 404 (tenant sin licencia registrada) es una respuesta valida, no un
      // error de la pantalla -- se refleja mostrando "sin licencia", nunca
      // ocultando el tab (a diferencia de las secciones gateadas por
      // permiso, aqui no hay nada que ocultar: cualquier usuario
      // autenticado puede ver que no hay licencia).
      error: () => this.licenciaCargando.set(false),
    });
  }

  onGuardar(payload: ConfiguracionTenantFormPayload): void {
    this.guardando.set(true);

    this.configuracionService.actualizar(payload).subscribe({
      next: (configuracion) => {
        this.configuracion.set(configuracion);
        this.guardando.set(false);
        this.toast.success('Configuración guardada.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formulario?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar la configuración.');
        }
      },
    });
  }

  onGuardarSeguridad(payload: ConfiguracionSeguridad): void {
    this.guardandoSeguridad.set(true);

    this.configuracionService.actualizarSeguridad(payload).subscribe({
      next: (configuracion) => {
        this.seguridadConfiguracion.set(configuracion);
        this.guardandoSeguridad.set(false);
        this.toast.success('Configuración guardada.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardandoSeguridad.set(false);

        if (error.status === 422 && error.error?.errors) {
          this.formularioSeguridad?.setServerErrors(error.error.errors);
        } else {
          this.toast.error('No se pudo guardar la configuración.');
        }
      },
    });
  }
}
