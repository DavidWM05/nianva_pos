import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
${primitivos.map(([nombre, valor]) => `  ${nombre}: ${valor};`).join('\n')}

${bloques('light')}

  /* Compatibilidad temporal: las pantallas aun usan --nucleo-*.
     Se retiran al completar la migracion de pantallas (plan, punto 12). */
${aliasCss}
}

.nv-tema-oscuro {
${bloques('dark')}
}
`;

const colorSchemeLight = {
  primary: {
    color: datos.primitive.color.primary['500'],
    contrastColor: '#ffffff',
    hoverColor: datos.primitive.color.primary['600'],
    activeColor: datos.primitive.color.primary['700'],
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
    0: datos.semantic.dark.superficie,
    50: datos.semantic.dark.fondo,
    100: datos.semantic.dark.superficie,
    200: datos.semantic.dark.borde,
    300: datos.semantic.dark['texto-suave'],
    400: datos.semantic.dark['texto-suave'],
    500: datos.semantic.dark['texto-suave'],
    600: datos.semantic.dark.texto,
    700: datos.semantic.dark.texto,
    800: datos.semantic.dark.texto,
    900: datos.semantic.dark.texto,
    950: datos.semantic.dark.texto,
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
      color: '{primary.500}',
      contrastColor: '#ffffff',
      hoverColor: '{primary.600}',
      activeColor: '{primary.700}',
    },
    surface: {
${Object.entries(datos.primitive.color.surface).map(([nombre, valor]) => `      ${nombre}: '${valor}',`).join('\n')}
    },
    colorScheme: {
      light: ${formatearTs(colorSchemeLight, 6)},
      dark: ${formatearTs(colorSchemeDark, 6)},
    },
  },
});
`;

const breakpoints = `/** Generado por scripts/generate.mjs. No editar a mano. */
export const breakpoints = ${formatearTs(datos.breakpoints, 0)} as const;

export type Breakpoint = keyof typeof breakpoints;
`;

const archivos = new Map([
  [join(raiz, 'src/styles/tokens.css'), css],
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

    if (actual !== contenido) {
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
