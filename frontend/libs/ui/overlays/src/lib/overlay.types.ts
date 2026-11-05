export type TamanoOverlay = 'sm' | 'md' | 'lg';

/**
 * Clases del contenedor de Material (`panelClass`/`class`). El ancho de cada tamano y la
 * pantalla completa en pantalla angosta (UI-04) viven en overlays.scss: sin `[style]`.
 */
export function claseOverlay(base: 'ui-modal' | 'ui-drawer', tamano: TamanoOverlay, angosta: boolean): string {
  return [base, 'ui-overlay', angosta ? 'ui-overlay--completo' : `ui-overlay--${tamano}`].join(' ');
}
