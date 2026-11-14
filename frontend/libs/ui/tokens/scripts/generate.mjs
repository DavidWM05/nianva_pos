import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { contenidoEquivalente } from './contenido-equivalente.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const datos = JSON.parse(readFileSync(join(raiz, 'tokens.json'), 'utf8'));

const kebab = (valor) => valor.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`).replace(/^-/, '');

const primitivos = [];

for (const [nombre, valor] of Object.entries(datos.primitive.color.primary)) {
  primitivos.push([`--nv-color-primary-${nombre}`, valor]);
}
for (const [nombre, valor] of Object.entries(datos.primitive.color.surface)) {
  primitivos.push([`--nv-color-surface-${nombre}`, valor]);
}
for (const nombre of ['success', 'warning', 'danger', 'info']) {
  primitivos.push([`--nv-color-${nombre}`, datos.primitive.color[nombre]]);
}
for (const [nombre, valor] of Object.entries(datos.primitive.spacing)) {
  primitivos.push([`--nv-spacing-${nombre}`, valor]);
}
primitivos.push(['--nv-font-family', datos.primitive.typography.fontFamily]);
primitivos.push(['--nv-font-family-mono', datos.primitive.typography.fontFamilyMono]);
for (const [nombre, valor] of Object.entries(datos.primitive.typography.fontSize)) {
  primitivos.push([`--nv-font-size-${nombre}`, valor]);
}
for (const [nombre, valor] of Object.entries(datos.primitive.typography.fontWeight)) {
  primitivos.push([`--nv-font-weight-${nombre}`, String(valor)]);
}
for (const [nombre, valor] of Object.entries(datos.primitive.radius)) {
  primitivos.push([`--nv-radius-${nombre}`, valor]);
}
for (const [nombre, valor] of Object.entries(datos.primitive.shadow)) {
  primitivos.push([`--nv-shadow-${nombre}`, valor]);
}
for (const [nombre, valor] of Object.entries(datos.primitive.zIndex)) {
  primitivos.push([`--nv-z-${kebab(nombre)}`, String(valor)]);
}

const semanticos = (tema) =>
  Object.entries(datos.semantic[tema]).map(([nombre, valor]) => [`--nv-${nombre}`, valor]);

const bloques = (tema) => semanticos(tema).map(([nombre, valor]) => `  ${nombre}: ${valor};`).join('\n');

const alias = [];

for (const nombre of Object.keys(datos.primitive.color.primary)) {
  alias.push([`--nucleo-color-primary-${nombre}`, `--nv-color-primary-${nombre}`]);
}
for (const nombre of Object.keys(datos.primitive.color.surface)) {
  alias.push([`--nucleo-color-surface-${nombre}`, `--nv-color-surface-${nombre}`]);
}
for (const [viejo, nuevo] of [
  ['success', 'exito'],
  ['warning', 'advertencia'],
  ['danger', 'peligro'],
  ['info', 'info'],
]) {
  alias.push([`--nucleo-color-${viejo}`, `--nv-${nuevo}`]);
}
for (const nombre of Object.keys(datos.primitive.spacing)) {
  alias.push([`--nucleo-spacing-${nombre}`, `--nv-spacing-${nombre}`]);
}
for (const nombre of Object.keys(datos.primitive.radius)) {
  alias.push([`--nucleo-radius-${nombre}`, `--nv-radius-${nombre}`]);
}
alias.push(['--nucleo-font-family', '--nv-font-family']);
for (const nombre of Object.keys(datos.primitive.typography.fontSize)) {
  alias.push([`--nucleo-font-size-${nombre}`, `--nv-font-size-${nombre}`]);
}

const aliasCss = alias.map(([viejo, nuevo]) => `  ${viejo}: var(${nuevo});`).join('\n');

const css = `/* Generado por scripts/generate.mjs. No editar a mano. */
:root {
  color-scheme: light;
${primitivos.map(([nombre, valor]) => `  ${nombre}: ${valor};`).join('\n')}

${bloques('light')}

  /* Compatibilidad temporal: las pantallas aun usan --nucleo-*.
     Se retiran al completar la migracion de pantallas (plan, punto 12). */
${aliasCss}
}

.nv-tema-oscuro {
  color-scheme: dark;
${bloques('dark')}
}
`;

const formatearTs = (valor, sangria = 0) => {
  const pad = ' '.repeat(sangria);

  if (Array.isArray(valor)) {
    return `[${valor.map((item) => formatearTs(item, sangria + 2)).join(', ')}]`;
  }

  if (valor !== null && typeof valor === 'object') {
    const lineas = Object.entries(valor).map(([clave, contenido]) => {
      const nombre = /^[A-Za-z_$][\w$]*$/.test(clave) ? clave : JSON.stringify(clave);

      return `${pad}  ${nombre}: ${formatearTs(contenido, sangria + 2)},`;
    });

    return `{\n${lineas.join('\n')}\n${pad}}`;
  }

  return JSON.stringify(valor);
};

const breakpoints = `/** Generado por scripts/generate.mjs. No editar a mano. */
export const breakpoints = ${formatearTs(datos.breakpoints, 0)} as const;

export type Breakpoint = keyof typeof breakpoints;
`;

const rolesMaterial = {
  background: 'fondo',
  'on-background': 'texto',
  surface: 'superficie',
  'on-surface': 'texto',
  'surface-variant': 'fondo-elevado',
  'on-surface-variant': 'texto-suave',
  'surface-bright': 'superficie',
  'surface-dim': 'fondo',
  'surface-tint': 'primario',
  'surface-container-lowest': 'superficie',
  'surface-container-low': 'fondo',
  'surface-container': 'superficie',
  'surface-container-high': 'fondo-elevado',
  'surface-container-highest': 'fondo-elevado',
  primary: 'primario',
  'on-primary': 'primario-texto',
  // Tono primario suave, como en M3: con 'fondo-elevado' (igual a la superficie) el sombreado
  // de un rango en el calendario no se veia.
  'primary-container': 'primario-suave',
  'on-primary-container': 'primario',
  'primary-fixed': 'fondo-elevado',
  'primary-fixed-dim': 'fondo-elevado',
  'on-primary-fixed': 'primario',
  'on-primary-fixed-variant': 'primario',
  secondary: 'texto-suave',
  'on-secondary': 'superficie',
  'secondary-container': 'fondo-elevado',
  'on-secondary-container': 'texto',
  'secondary-fixed': 'fondo-elevado',
  'secondary-fixed-dim': 'fondo-elevado',
  'on-secondary-fixed': 'texto',
  'on-secondary-fixed-variant': 'texto-suave',
  tertiary: 'info-texto',
  'on-tertiary': 'superficie',
  'tertiary-container': 'fondo-elevado',
  'on-tertiary-container': 'info-texto',
  'tertiary-fixed': 'fondo-elevado',
  'tertiary-fixed-dim': 'fondo-elevado',
  'on-tertiary-fixed': 'info-texto',
  'on-tertiary-fixed-variant': 'info-texto',
  error: 'peligro',
  'on-error': 'texto-invertido',
  'error-container': 'fondo-elevado',
  'on-error-container': 'peligro-texto',
  outline: 'borde',
  'outline-variant': 'borde',
  'inverse-surface': 'texto',
  'inverse-on-surface': 'superficie',
  'inverse-primary': 'primario',
  // Casi negros en los dos temas, como en M3: con 'texto', en oscuro las sombras y el velo
  // de los dialogos salian claros.
  scrim: 'sombra',
  shadow: 'sombra',
  neutral10: 'sombra',
  // Material solo lo usa para el velo del drawer: con 'texto-suave' salia gris claro en oscuro.
  'neutral-variant20': 'sombra',
};

const formaMaterial = {
  'corner-extra-large': 'var(--nv-radius-xl)',
  'corner-extra-large-top': 'var(--nv-radius-xl) var(--nv-radius-xl) 0 0',
  'corner-extra-small': 'var(--nv-radius-sm)',
  'corner-extra-small-top': 'var(--nv-radius-sm) var(--nv-radius-sm) 0 0',
  'corner-full': 'var(--nv-radius-full)',
  'corner-large': 'var(--nv-radius-lg)',
  'corner-large-end': '0 var(--nv-radius-lg) var(--nv-radius-lg) 0',
  'corner-large-start': 'var(--nv-radius-lg) 0 0 var(--nv-radius-lg)',
  'corner-large-top': 'var(--nv-radius-lg) var(--nv-radius-lg) 0 0',
  'corner-medium': 'var(--nv-radius-md)',
  'corner-none': '0',
  'corner-small': 'var(--nv-radius-md)',
};

const overridesMaterial = {
  'form-field-outlined-disabled-input-text-color': 'deshabilitado-texto',
  'form-field-outlined-disabled-label-text-color': 'deshabilitado-texto',
  'form-field-outlined-disabled-outline-color': 'borde',
  'form-field-filled-disabled-input-text-color': 'deshabilitado-texto',
  'form-field-filled-disabled-label-text-color': 'deshabilitado-texto',
  'form-field-filled-disabled-container-color': 'deshabilitado-fondo',
  'form-field-disabled-input-text-placeholder-color': 'deshabilitado-texto',
  'form-field-disabled-leading-icon-color': 'deshabilitado-texto',
  'form-field-disabled-select-arrow-color': 'deshabilitado-texto',
  'form-field-disabled-trailing-icon-color': 'deshabilitado-texto',
  // El velo de foco y hover del boton relleno toma por defecto el color de su texto: en claro
  // aclaraba el primario bajo texto blanco (4.18:1 con foco). Con el texto del tema oscurece el
  // primario en claro y lo aclara en oscuro: sube el contraste en los dos (material.spec.ts).
  'button-filled-state-layer-color': 'texto',
};

// Overrides que no son un token directo. La onda del clic (ripple) del boton relleno usa por
// defecto el texto del boton al 12%: el mismo problema que el velo, y en CI seguia visible
// cuando axe media. Usa el texto del tema con la opacidad de "presionado" de Material.
const overridesMaterialValor = {
  'button-filled-ripple-color':
    'color-mix(in srgb, var(--nv-texto) calc(var(--mat-sys-pressed-state-layer-opacity) * 100%), transparent)',
  // 50i: botones de texto y outlined; el porque esta en comentariosMaterialValor.
  'button-text-focus-state-layer-opacity': '0.08',
  'button-text-pressed-state-layer-opacity': '0.08',
  'button-outlined-focus-state-layer-opacity': '0.08',
  'button-outlined-pressed-state-layer-opacity': '0.08',
  'button-text-ripple-color': 'color-mix(in srgb, var(--nv-primario) 8%, transparent)',
  'button-outlined-ripple-color': 'color-mix(in srgb, var(--nv-primario) 8%, transparent)',
};

// Los comentarios de overridesMaterialValor que tambien van a material.scss, antes de su linea.
const comentariosMaterialValor = {
  'button-text-focus-state-layer-opacity': [
    '50i: con el 12% de M3, el texto primario de un boton de texto u outlined con foco (o con su',
    'menu abierto) quedaba en 4.37:1 sobre la capa de estado en claro. Al 8% (el de hover en M3)',
    'queda en 4.65:1 en claro y 5.03:1 en oscuro (material-botones-estado.spec.ts).',
  ],
  'button-text-ripple-color': ['El ripple del clic es otra capa, con su propio color (12% de primario en M3).'],
};

const rolesMaterialCss = Object.entries(rolesMaterial)
  .map(([rol, token]) => `  --mat-sys-${rol}: var(--nv-${token});`)
  .join('\n');

const formaMaterialSass = Object.entries(formaMaterial)
  .map(([nombre, valor]) => `      ${nombre}: ${valor},`)
  .join('\n');

const overridesMaterialCss = [
  ...Object.entries(overridesMaterial).map(([nombre, token]) => `  --mat-${nombre}: var(--nv-${token});`),
  ...Object.entries(overridesMaterialValor).flatMap(([nombre, valor]) => [
    ...(comentariosMaterialValor[nombre] ?? []).map((linea) => `  // ${linea}`),
    `  --mat-${nombre}: ${valor};`,
  ]),
].join('\n');

const materialScss = `/* Generado por scripts/generate.mjs. No editar a mano. */
@use '@angular/material' as mat;

html {
  @include mat.theme(
    (
      typography: (
        plain-family: var(--nv-font-family),
        brand-family: var(--nv-font-family),
        bold-weight: var(--nv-font-weight-bold),
        medium-weight: var(--nv-font-weight-medium),
        regular-weight: var(--nv-font-weight-normal),
      ),
      density: 0,
    ),
    (
${formaMaterialSass}
    )
  );
}

:root {
${rolesMaterialCss}
${overridesMaterialCss}
}
`;

const archivos = new Map([
  [join(raiz, 'src/styles/tokens.css'), css],
  [join(raiz, 'src/styles/material.scss'), materialScss],
  [join(raiz, 'src/lib/breakpoints.ts'), breakpoints],
]);

let fallos = 0;

for (const [ruta, contenido] of archivos) {
  if (check) {
    let actual = '';

    try {
      actual = readFileSync(ruta, 'utf8');
    } catch {
      actual = '';
    }

    if (! contenidoEquivalente(actual, contenido)) {
      console.error(`Desactualizado: ${ruta.slice(raiz.length + 1)}`);
      fallos++;
    }

    continue;
  }

  writeFileSync(ruta, contenido);
}

if (check && fallos > 0) {
  console.error(`Tokens generados desactualizados: ${fallos} archivo(s).`);
  process.exit(1);
}

console.log(check ? 'Tokens generados al dia.' : 'Tokens generados.');
