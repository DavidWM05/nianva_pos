import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '@nianva/ui-shared';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';

import { CampanaService } from '../../campana.service';
import { Campana, SegmentoCampana } from '../../campana.types';

const SEGMENTOS: { label: string; value: SegmentoCampana }[] = [
  { label: 'Todos los clientes', value: 'todos' },
  { label: 'Clientes nuevos', value: 'nuevo' },
  { label: 'Clientes frecuentes', value: 'frecuente' },
  { label: 'Clientes VIP', value: 'vip' },
  { label: 'Clientes inactivos', value: 'inactivo' },
];

/**
 * Solo envio -- no hay index() (ver CampanaService). Tras enviar se
 * muestra la confirmacion inline en esta misma pantalla, mismo criterio
 * que TransformacionFormComponent.
 */
@Component({
  selector: 'nucleo-campana-form',
  standalone: true,
  imports: [FormsModule, Button, InputText, Select, Textarea],
  templateUrl: './campana-form.component.html',
  styleUrl: './campana-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampanaFormComponent {
  private readonly campanaService = inject(CampanaService);
  private readonly toast = inject(ToastService);

  protected readonly segmentos = SEGMENTOS;

  protected readonly segmento = signal<SegmentoCampana>('todos');
  protected readonly asunto = signal('');
  protected readonly mensaje = signal('');
  protected readonly enviando = signal(false);
  protected readonly ultimaEnviada = signal<Campana | null>(null);

  enviar(): void {
    const asunto = this.asunto().trim();
    const mensaje = this.mensaje().trim();
    if (!asunto || !mensaje) {
      this.toast.warn('Completa el asunto y el mensaje.');

      return;
    }

    this.enviando.set(true);

    this.campanaService.enviar({ segmento: this.segmento(), asunto, mensaje }).subscribe({
      next: (campana) => {
        this.enviando.set(false);
        this.ultimaEnviada.set(campana);
        this.toast.success(`Campaña enviada a ${campana.destinatarios} cliente(s).`);
        this.asunto.set('');
        this.mensaje.set('');
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        const cuerpo = error.error as { message?: string } | undefined;
        this.toast.error(cuerpo?.message ?? 'No se pudo enviar la campaña.');
      },
    });
  }
}
