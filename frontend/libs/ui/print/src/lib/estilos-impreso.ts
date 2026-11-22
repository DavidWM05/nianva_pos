/**
 * Estilos de los impresos (UI-12): blanco y negro, sin tema (ningún token `--nv-*`), fuente del
 * sistema y sin recursos de red. Son un texto porque se usan dos veces: en `ui-impreso` (pantalla
 * y catálogo) y dentro del documento del iframe que se imprime.
 *
 * Anchos útiles: el papel de 58 mm imprime 48 mm y el de 80 mm, 72 mm; la carta deja 15 mm de
 * margen.
 */
export const ESTILOS_IMPRESO = `
.ui-impreso {
  box-sizing: border-box;
  color: #000;
  background: #fff;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 11px;
  line-height: 1.35;
}
.ui-impreso *, .ui-impreso *::before, .ui-impreso *::after { box-sizing: inherit; }
.ui-impreso--ticket-58 { width: 48mm; }
.ui-impreso--ticket-80 { width: 72mm; font-size: 12px; }
.ui-impreso--carta { width: 100%; max-width: 186mm; font-size: 12px; }
.ui-impreso__encabezado, .ui-impreso__pie { text-align: center; }
.ui-impreso__empresa { margin: 0; font-size: 1.2em; font-weight: 700; }
.ui-impreso__dato { margin: 0; }
.ui-impreso__titulo { margin: 2mm 0 0; font-size: 1.1em; font-weight: 700; }
.ui-impreso__separador { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
.ui-impreso__tabla { width: 100%; border-collapse: collapse; }
.ui-impreso__tabla th, .ui-impreso__tabla td { padding: 0.5mm 0; text-align: left; vertical-align: top; }
.ui-impreso__tabla .ui-impreso__num { text-align: right; white-space: nowrap; }
.ui-impreso__totales { width: 100%; border-collapse: collapse; }
.ui-impreso__totales td { padding: 0.5mm 0; }
.ui-impreso__totales .ui-impreso__num { text-align: right; white-space: nowrap; }
.ui-impreso__destacado td { font-weight: 700; font-size: 1.15em; }
.ui-impreso__pie p { margin: 0; white-space: pre-line; }
@page { margin: 0; }
@media print {
  body { margin: 0; }
  .ui-impreso--carta { padding: 15mm; max-width: none; }
}
`;
