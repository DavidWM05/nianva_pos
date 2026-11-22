import { DOCUMENT } from '@angular/common';
import { EnvironmentInjector, Injectable, createComponent, inject } from '@angular/core';

import { ESTILOS_IMPRESO } from './estilos-impreso';
import { ImpresoComponent } from './impreso/impreso.component';
import { FormatoImpreso, Impreso } from './impreso.types';

/**
 * El único servicio de impresión (UI-12, F4-2): pinta la foto del documento con `ui-impreso` en
 * un iframe oculto y abre el diálogo de impresión del navegador.
 *
 * - No hace peticiones: imprimir otra vez no vuelve a cobrar ni depende del token CSRF, que en
 *   Lite rotaba en cada POST y rompía la segunda impresión en iframe (L-11, SEG-06).
 * - Un solo iframe, reutilizado: cada impresión reemplaza el documento anterior.
 * - El documento lleva sus propios estilos (blanco y negro, fuente del sistema), sin recursos de
 *   red ni el tema de la app.
 */
@Injectable({ providedIn: 'root' })
export class ImpresionService {
  static readonly ID_MARCO = 'ui-impresion';

  private readonly documento = inject(DOCUMENT);
  private readonly entorno = inject(EnvironmentInjector);

  imprimir(impreso: Impreso, formato: FormatoImpreso): void {
    const marco = this.marco();
    const destino = marco.contentDocument;
    if (!destino) {
      return;
    }

    const titulo = escaparHtml(`${impreso.titulo} ${impreso.encabezado.folio}`);
    destino.open();
    destino.write(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>` +
        `<style>${ESTILOS_IMPRESO}</style></head><body>${this.renderizar(impreso, formato)}</body></html>`,
    );
    destino.close();

    marco.contentWindow?.focus();
    marco.contentWindow?.print();
  }

  /** El HTML de `ui-impreso` con sus pipes ya aplicados (formato regional de la app). */
  private renderizar(impreso: Impreso, formato: FormatoImpreso): string {
    const referencia = createComponent(ImpresoComponent, { environmentInjector: this.entorno });
    referencia.setInput('impreso', impreso);
    referencia.setInput('formato', formato);
    referencia.changeDetectorRef.detectChanges();
    const html = (referencia.location.nativeElement as HTMLElement).innerHTML;
    referencia.destroy();

    return html;
  }

  private marco(): HTMLIFrameElement {
    const existente = this.documento.getElementById(ImpresionService.ID_MARCO);
    if (existente instanceof HTMLIFrameElement) {
      return existente;
    }

    const marco = this.documento.createElement('iframe');
    marco.id = ImpresionService.ID_MARCO;
    marco.title = 'Impresión';
    marco.setAttribute('aria-hidden', 'true');
    marco.tabIndex = -1;
    // Fuera de la vista pero con tamaño: algunos navegadores no imprimen un iframe de 0 x 0.
    Object.assign(marco.style, { position: 'fixed', right: '0', bottom: '0', width: '1px', height: '1px', border: '0', opacity: '0' });
    this.documento.body.appendChild(marco);

    return marco;
  }
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
