export type TamanoOverlay = 'sm' | 'md' | 'lg';

/**
 * Clases del contenedor de PrimeNG (`styleClass`). El ancho de cada tamano y la pantalla
 * completa en pantalla angosta (UI-04) viven en overlays.scss: sin `[style]`, porque
 * ui-modal y ui-drawer son los que permiten retirar `allowBindToStyle` del lint.
 */
export function claseOverlay(base: 'ui-modal' | 'ui-drawer', tamano: TamanoOverlay, angosta: boolean): string {
  return [base, 'ui-overlay', angosta ? 'ui-overlay--completo' : `ui-overlay--${tamano}`].join(' ');
}
