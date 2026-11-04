import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent, SectionComponent } from '@nianva/ui-layout';
import { breakpoints } from '@nianva/ui-tokens';

@Component({
  selector: 'cat-tokens-page',
  standalone: true,
  imports: [PageHeaderComponent, SectionComponent],
  template: `
    <ui-page-header clave="catalogo-tokens" subtitulo="Colores, tipografía, espaciado y breakpoints" />

    <ui-section titulo="Breakpoints">
      <ul>
        <li>sm: {{ breakpoints.sm }} px</li>
        <li>md: {{ breakpoints.md }} px</li>
        <li>lg: {{ breakpoints.lg }} px</li>
        <li>xl: {{ breakpoints.xl }} px</li>
      </ul>
    </ui-section>

    <ui-section titulo="Colores semánticos">
      <ul>
        <li>--nv-primario: #2563eb</li>
        <li>--nv-texto: #0f172a</li>
        <li>--nv-texto-suave: #475569</li>
        <li>--nv-peligro: #dc2626</li>
        <li>--nv-exito: #16a34a</li>
        <li>--nv-advertencia: #d97706</li>
        <li>--nv-info: #0891b2</li>
      </ul>
    </ui-section>

    <ui-section titulo="Tipografía y radios">
      <p>Fuente: Inter, system-ui, Segoe UI, sans-serif.</p>
      <p>Escala: xs 0.75rem, sm 0.8125rem, base 0.875rem, md 1rem, lg 1.125rem, xl 1.25rem, 2xl 1.5rem.</p>
      <p>Radios: sm 0.25rem, md 0.375rem, lg 0.5rem, xl 0.75rem, full 9999px.</p>
    </ui-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokensPage {
  protected readonly breakpoints = breakpoints;
}
