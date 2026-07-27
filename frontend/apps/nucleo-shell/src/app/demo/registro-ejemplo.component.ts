import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuditLogViewerComponent, RecordTabConfig, RecordTabsComponent } from '@nucleo/ui-shared';

/**
 * Demo de scaffolding, NO una pantalla de negocio: muestra como se usa
 * RecordTabsComponent (patron General/Relacionado/Auditoria) y como se
 * difiere la carga de la pestana de Auditoria con @defer (on viewport) --
 * su codigo (y el de AuditLogViewerComponent) no se descarga hasta que el
 * usuario efectivamente hace click en esa pestana y el bloque entra en
 * el viewport. Se elimina/reemplaza cuando el primer modulo real
 * (ej. Tpv) construya su propia vista de registro con este mismo patron.
 */
@Component({
  selector: 'nucleo-registro-ejemplo',
  standalone: true,
  imports: [RecordTabsComponent, AuditLogViewerComponent],
  templateUrl: './registro-ejemplo.component.html',
  styleUrl: './registro-ejemplo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroEjemploComponent {
  protected readonly tabs: RecordTabConfig[] = [
    { label: 'General', icon: 'pi pi-file' },
    { label: 'Relacionado', icon: 'pi pi-link' },
    { label: 'Auditoría', icon: 'pi pi-history' },
  ];
}
