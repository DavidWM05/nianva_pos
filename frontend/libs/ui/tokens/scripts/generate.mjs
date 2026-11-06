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

const colorSchemeLight = {
  primary: {
    color: datos.primitive.color.primary['600'],
    contrastColor: '#ffffff',
    hoverColor: datos.primitive.color.primary['700'],
    activeColor: datos.primitive.color.primary['800'],
  },
};

const colorSchemeDark = {
  primary: {
    color: datos.semantic.dark.primario,
    contrastColor: datos.semantic.dark['primario-texto'],
    hoverColor: datos.semantic.dark.foco,
    activeColor: datos.semantic.dark.primario,
  },
  surface: {
    0: datos.primitive.color.surface['0'],
    50: datos.primitive.color.surface['50'],
    100: datos.primitive.color.surface['100'],
    200: datos.primitive.color.surface['200'],
    300: datos.primitive.color.surface['300'],
    400: datos.primitive.color.surface['400'],
    500: datos.primitive.color.surface['500'],
    600: datos.primitive.color.surface['600'],
    700: datos.primitive.color.surface['700'],
    800: datos.primitive.color.surface['800'],
    900: datos.primitive.color.surface['900'],
    950: datos.primitive.color.surface['950'],
  },
  text: {
    color: datos.semantic.dark.texto,
    hoverColor: datos.semantic.dark.texto,
    mutedColor: datos.semantic.dark['texto-suave'],
    hoverMutedColor: datos.semantic.dark.texto,
  },
};

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

// Botones de severidad: el fondo es el color de texto del tono (contraste AA con texto
// blanco); el hover y el activo lo oscurecen para que el boton responda al puntero.
const SEVERIDADES = { danger: 'peligro-texto', warn: 'advertencia-texto', success: 'exito-texto', info: 'info-texto' };
const botonesSeveridad = Object.entries(SEVERIDADES)
  .map(([severidad, token]) => {
    const base = datos.semantic.light[token];
    const hover = `color-mix(in srgb, ${base} 88%, #000000)`;
    const activo = `color-mix(in srgb, ${base} 76%, #000000)`;

    return [
      `        ${severidad}: {`,
      `          background: '${base}',`,
      `          hoverBackground: '${hover}',`,
      `          activeBackground: '${activo}',`,
      `          borderColor: '${base}',`,
      `          hoverBorderColor: '${hover}',`,
      `          activeBorderColor: '${activo}',`,
      `          color: '#ffffff',`,
      `          hoverColor: '#ffffff',`,
      `          activeColor: '#ffffff',`,
      `        },`,
    ].join('\n');
  })
  .join('\n');

const preset = `import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Generado por scripts/generate.mjs. No editar a mano. */
export const nucleoPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '${datos.primitive.radius.sm}',
      md: '${datos.primitive.radius.md}',
      lg: '${datos.primitive.radius.lg}',
      xl: '${datos.primitive.radius.xl}',
    },
  },
  semantic: {
    primary: {
${Object.entries(datos.primitive.color.primary).map(([nombre, valor]) => `      ${nombre}: '${valor}',`).join('\n')}
      color: '{primary.600}',
      contrastColor: '#ffffff',
      hoverColor: '{primary.700}',
      activeColor: '{primary.800}',
    },
    surface: {
${Object.entries(datos.primitive.color.surface).map(([nombre, valor]) => `      ${nombre}: '${valor}',`).join('\n')}
    },
    colorScheme: {
      light: ${formatearTs(colorSchemeLight, 6)},
      dark: ${formatearTs(colorSchemeDark, 6)},
    },
  },
  components: {
    button: {
      root: {
${botonesSeveridad}
      },
    },
  },
});
`;

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
};

const rolesMaterialCss = Object.entries(rolesMaterial)
  .map(([rol, token]) => `  --mat-sys-${rol}: var(--nv-${token});`)
  .join('\n');

const formaMaterialSass = Object.entries(formaMaterial)
  .map(([nombre, valor]) => `      ${nombre}: ${valor},`)
  .join('\n');

const overridesMaterialCss = Object.entries(overridesMaterial)
  .map(([nombre, token]) => `  --mat-${nombre}: var(--nv-${token});`)
  .join('\n');

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
  [join(raiz, 'src/lib/primeng-preset.ts'), preset],
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
