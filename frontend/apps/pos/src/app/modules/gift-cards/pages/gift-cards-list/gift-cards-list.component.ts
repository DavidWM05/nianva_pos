import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
  DataTableLazyEvent,
  EntidadSelectorComponent,
  StatusBadgeComponent,
} from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Subject, debounceTime } from 'rxjs';

import { BUSCADOR_CLIENTE } from '../../../../core/buscadores-entidad.tokens';
import { GiftCardService } from '../../gift-card.service';
import { EstadoGiftCard, GiftCard } from '../../gift-card.types';

const ESTADOS: { label: string; value: EstadoGiftCard | null }[] = [
  { label: 'Todas', value: null },
  { label: 'Activas', value: 'activa' },
  { label: 'Usadas', value: 'usada' },
  { label: 'Expiradas', value: 'expirada' },
  { label: 'Canceladas', value: 'cancelada' },
];

@Component({
  selector: 'nucleo-gift-cards-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    DataTableComponent,
    DataTableCellDirective,
    EntidadSelectorComponent,
    StatusBadgeComponent,
    Button,
    InputText,
    Select,
  ],
  templateUrl: './gift-cards-list.component.html',
  styleUrl: './gift-cards-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GiftCardsListComponent {
  private readonly giftCardService = inject(GiftCardService);
  private readonly router = inject(Router);

  protected readonly buscadorCliente = inject(BUSCADOR_CLIENTE);
  protected readonly estados = ESTADOS;

  protected readonly columns: DataTableColumn[] = [
    { field: 'codigo', header: 'Código' },
    { field: 'cliente', header: 'Cliente' },
    { field: 'saldo_actual', header: 'Saldo actual' },
    { field: 'estado', header: 'Estado' },
    { field: 'fecha_expiracion', header: 'Vence' },
    { field: 'acciones', header: '' },
  ];

  protected readonly giftCards = signal<GiftCard[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly estadoFiltro = signal<EstadoGiftCard | null>(null);
  protected readonly clienteFiltroId = signal<number | null>(null);
  protected readonly codigoFiltro = signal('');

  private ultimoEvento: DataTableLazyEvent = { first: 0, rows: 25, sortField: null, sortOrder: null, filters: {} };
  private readonly codigoSubject = new Subject<string>();

  constructor() {
    this.codigoSubject.pipe(debounceTime(300)).subscribe((codigo) => {
      this.codigoFiltro.set(codigo);
      this.cargar({ ...this.ultimoEvento, first: 0 });
    });
  }

  onCodigoInput(codigo: string): void {
    this.codigoSubject.next(codigo);
  }

  onEstadoCambio(estado: EstadoGiftCard | null): void {
    this.estadoFiltro.set(estado);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onClienteSeleccionado(clienteId: number | null): void {
    this.clienteFiltroId.set(clienteId);
    this.cargar({ ...this.ultimoEvento, first: 0 });
  }

  onLazyLoad(evento: DataTableLazyEvent): void {
    this.cargar(evento);
  }

  irADetalle(giftCard: GiftCard): void {
    this.router.navigate(['/gift-cards', giftCard.id]);
  }

  private cargar(evento: DataTableLazyEvent): void {
    this.ultimoEvento = evento;
    this.loading.set(true);

    this.giftCardService
      .listar(evento, { clienteId: this.clienteFiltroId(), estado: this.estadoFiltro(), codigo: this.codigoFiltro() })
      .subscribe({
        next: (respuesta) => {
          this.giftCards.set(respuesta.data);
          this.total.set(respuesta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
