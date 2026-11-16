import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ClavePerfilGiro,
  PerfilGiro,
  PerfilGiroService,
} from '@nianva/domain-configuracion';
import {
  ConfirmDialogService,
  SkeletonComponent,
  ToastService,
} from '@nianva/ui-feedback';
import {
  BtnEnviarComponent,
  CampoComponent,
  SelectFiltroComponent,
} from '@nianva/ui-forms';
import { DatosComponent } from '@nianva/ui-layout';
import { mensajeError } from '@nianva/ui-shared';
import { finalize } from 'rxjs';

/**
 * ARQ-07: el giro del negocio es configuración. Elegir un perfil siembra lo que le falte al
 * catálogo (atributos de variante con sus valores, unidades y categorías) y lo deja como el
 * perfil del tenant; nunca borra ni renombra lo que ya existe.
 */
@Component({
  selector: 'nucleo-perfil-giro',
  standalone: true,
  imports: [
    FormsModule,
    CampoComponent,
    SelectFiltroComponent,
    BtnEnviarComponent,
    DatosComponent,
    SkeletonComponent,
  ],
  templateUrl: './perfil-giro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilGiroComponent implements OnInit {
  private readonly servicio = inject(PerfilGiroService);
  private readonly confirmar = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  protected readonly estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  protected readonly perfiles = signal<PerfilGiro[]>([]);
  protected readonly actual = signal<string | null>(null);
  protected readonly elegido = signal<ClavePerfilGiro | null>(null);
  protected readonly aplicando = signal(false);

  protected readonly opciones = computed(() =>
    this.perfiles().map((perfil) => ({ label: perfil.nombre, value: perfil.clave })),
  );
  protected readonly perfilElegido = computed(
    () => this.perfiles().find((perfil) => perfil.clave === this.elegido()) ?? null,
  );
  protected readonly nombreActual = computed(
    () => this.perfiles().find((perfil) => perfil.clave === this.actual())?.nombre ?? null,
  );

  ngOnInit(): void {
    this.cargar();
  }

  protected cargar(): void {
    this.estado.set('cargando');
    this.servicio.catalogo().subscribe({
      next: (r) => {
        this.perfiles.set(r.data);
        this.actual.set(r.meta.actual);
        this.elegido.set(r.meta.actual as ClavePerfilGiro);
        this.estado.set('listo');
      },
      error: () => this.estado.set('error'),
    });
  }

  protected valoresDe(atributo: PerfilGiro['atributos'][number]): string {
    return atributo.valores.join(', ');
  }

  protected async aplicar(): Promise<void> {
    const perfil = this.perfilElegido();
    if (!perfil || this.aplicando()) return;
    const seguir = await this.confirmar.confirm({
      header: 'Aplicar perfil de giro',
      message: `Se agregará al catálogo lo que le falte del perfil «${perfil.nombre}». No se borra ni se renombra nada.`,
      acceptLabel: 'Aplicar perfil',
      severity: 'info',
    });
    if (!seguir) return;
    this.aplicando.set(true);
    this.servicio
      .aplicar(perfil.clave as ClavePerfilGiro)
      .pipe(finalize(() => this.aplicando.set(false)))
      .subscribe({
        next: (r) => {
          this.actual.set(r.meta.actual);
          const c = r.meta.creados;
          this.toast.success(
            `Perfil aplicado: ${c.atributos} atributos, ${c.valores} valores, ${c.categorias} categorías y ${c.unidades} unidades nuevas.`,
          );
        },
        error: (e) => this.toast.error(mensajeError(e, 'No se pudo aplicar el perfil.')),
      });
  }
}
