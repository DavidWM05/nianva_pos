import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { FormatoImpreso, IMPRESO_DE_EJEMPLO, ImpresionService, ImpresoComponent } from '@nianva/ui-print';

@Component({
  selector: 'cat-print-page',
  standalone: true,
  imports: [ImpresoComponent, MatButton, PageHeaderComponent, SectionComponent],
  template: `
    <ui-page-header clave="catalogo-print" subtitulo="Ticket de 58 y 80 mm y carta, sin tema" />

    @for (formato of formatos; track formato.valor) {
      <ui-section [titulo]="formato.titulo">
        <p>
          <button matButton="outlined" type="button" (click)="imprimir(formato.valor)">Imprimir {{ formato.titulo }}</button>
        </p>
        <ui-impreso [impreso]="impreso" [formato]="formato.valor" />
      </ui-section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintPage {
  private readonly impresion = inject(ImpresionService);

  protected readonly impreso = IMPRESO_DE_EJEMPLO;
  protected readonly formatos: { valor: FormatoImpreso; titulo: string }[] = [
    { valor: 'ticket-58', titulo: 'Ticket 58 mm' },
    { valor: 'ticket-80', titulo: 'Ticket 80 mm' },
    { valor: 'carta', titulo: 'Carta' },
  ];

  protected imprimir(formato: FormatoImpreso): void {
    this.impresion.imprimir(this.impreso, formato);
  }
}
