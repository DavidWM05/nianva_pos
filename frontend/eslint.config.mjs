import { readFileSync } from 'node:fs';

import nx from '@nx/eslint-plugin';

import { RULE_NAME as formatoPorPipeName, rule as formatoPorPipe } from './tools/eslint-rules/formato-por-pipe.mjs';
import { RULE_NAME as noInnerHtmlName, rule as noInnerHtml } from './tools/eslint-rules/no-inner-html.mjs';
import { RULE_NAME as respuestaContratoName, rule as respuestaContrato } from './tools/eslint-rules/respuesta-del-contrato.mjs';
import { RULE_NAME as sinColorName, rule as sinColor } from './tools/eslint-rules/sin-color-en-plantilla.mjs';
import { RULE_NAME as sinCargandoName, rule as sinCargando } from './tools/eslint-rules/sin-texto-cargando.mjs';

const formatoPendientes = JSON.parse(
  readFileSync(new URL('./tools/eslint-rules/formato-pendientes.json', import.meta.url), 'utf8'),
);
const cargandoPendientes = JSON.parse(
  readFileSync(new URL('./tools/eslint-rules/cargando-pendientes.json', import.meta.url), 'utf8'),
);
const contratoPendientes = JSON.parse(
  readFileSync(new URL('./tools/eslint-rules/contrato-pendientes.json', import.meta.url), 'utf8'),
);

// Serie 50: modulos de apps/pos ya migrados a libs/ui (carpeta bajo src/app/modules). Cada
// encargo agrega el suyo al cerrar, y desde ahi ESLint prohibe PrimeNG en ese modulo, specs
// incluidos. La lista solo crece; al final de la serie, PrimeNG sale de todo apps/pos.
const MODULOS_POS_SIN_PRIMENG = ['unidades-medida', 'auditoria', 'nucleo', 'configuracion', 'precios', 'crm', 'administracion'];

const sinPrimeNg = ['primeng', 'primeng/*', '@primeuix/themes', '@primeuix/themes/*'];
const sinHttpClientEnComponentes = {
  name: '@angular/common/http',
  importNames: ['HttpClient'],
  message: 'Un componente no llama a la API: mueve la llamada a un servicio de dominio.',
};
const archivosDeModulos = (sufijo) =>
  MODULOS_POS_SIN_PRIMENG.map((modulo) => `apps/pos/src/app/modules/${modulo}/**/${sufijo}`);
// Sin modulos no se agrega nada: `files: []` aplicaria el bloque a todos los archivos. El bloque
// de componentes repite la regla de HttpClient porque un bloque posterior reemplaza la regla
// completa, no la suma.
const bloquesSinPrimeNgEnPos =
  MODULOS_POS_SIN_PRIMENG.length === 0
    ? []
    : [
        {
          files: archivosDeModulos('*.ts'),
          rules: { 'no-restricted-imports': ['error', { patterns: sinPrimeNg }] },
        },
        {
          files: archivosDeModulos('*.component.ts'),
          rules: {
            'no-restricted-imports': ['error', { paths: [sinHttpClientEnComponentes], patterns: sinPrimeNg }],
          },
        },
      ];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          // Nueva lib: agrega una etiqueta type:* y, si es feature, scope:<modulo>.
          // Un feature no puede importar otro feature porque type:feature no esta
          // en su lista de destinos permitidos.
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:domain',
                'type:ui',
                'type:core',
                'type:tokens',
              ],
            },
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:domain',
                'type:ui',
                'type:core',
                'type:tokens',
              ],
            },
            {
              sourceTag: 'type:domain',
              onlyDependOnLibsWithTags: ['type:core'],
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:tokens'],
            },
            {
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'type:tokens',
              onlyDependOnLibsWithTags: [],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^bypassSecurityTrust/]',
          message:
            'No uses bypassSecurityTrust*: deja que Angular sanitice el contenido o usa interpolacion.',
        },
      ],
    },
  },
  {
    files: ['**/*.component.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              message:
                'Un componente no llama a la API: mueve la llamada a un servicio de dominio.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['libs/ui/**/*.ts'],
    ignores: ['libs/ui/tokens/src/lib/primeng-preset.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              message:
                'Un componente no llama a la API: mueve la llamada a un servicio de dominio.',
            },
          ],
          patterns: ['primeng', 'primeng/*', '@primeuix/themes', '@primeuix/themes/*'],
        },
      ],
    },
  },
  {
    files: ['libs/ui/tokens/src/lib/primeng-preset.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['primeng', 'primeng/*'] }],
    },
  },
  ...bloquesSinPrimeNgEnPos,
  {
    // API-08: las respuestas de urlApi se tipan con el contrato generado. Los servicios que
    // aun usan interfaces escritas a mano estan en contrato-pendientes.json y salen con la
    // migracion de pantallas; la lista solo baja.
    files: ['apps/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    plugins: {
      'nianva-ts': {
        rules: {
          [respuestaContratoName]: respuestaContrato,
        },
      },
    },
    rules: {
      [`nianva-ts/${respuestaContratoName}`]: 'error',
    },
  },
  {
    files: ['**/*.html'],
    plugins: {
      nianva: {
        rules: {
          [noInnerHtmlName]: noInnerHtml,
          [formatoPorPipeName]: formatoPorPipe,
          [sinColorName]: sinColor,
          [sinCargandoName]: sinCargando,
        },
      },
    },
    rules: {
      [`nianva/${noInnerHtmlName}`]: 'error',
      [`nianva/${formatoPorPipeName}`]: 'error',
      [`nianva/${sinColorName}`]: 'error',
      [`nianva/${sinCargandoName}`]: 'error',
      // Temporal: el binding [style] se permite hasta que ui-modal (Fase 2,
      // encargo 8) reemplace los p-dialog. Al terminar la migracion se quita
      // allowBindToStyle y la regla queda estricta.
      '@angular-eslint/template/no-inline-styles': ['error', { allowBindToStyle: true }],
    },
  },
  {
    // libs/ui/* ya no necesita la excepcion: ui-modal y ui-drawer son los que la retiran.
    // La opcion va explicita: un override que solo cambia la severidad conserva
    // allowBindToStyle: true del bloque anterior.
    files: ['libs/ui/**/*.html'],
    rules: {
      '@angular-eslint/template/no-inline-styles': ['error', { allowBindToStyle: false }],
    },
  },
  ...formatoPendientes.map((ruta) => ({
    files: [ruta],
    rules: {
      [`nianva/${formatoPorPipeName}`]: 'off',
    },
  })),
  ...cargandoPendientes.map((ruta) => ({
    files: [ruta],
    rules: {
      [`nianva/${sinCargandoName}`]: 'off',
    },
  })),
  ...contratoPendientes.map((ruta) => ({
    files: [ruta],
    rules: {
      [`nianva-ts/${respuestaContratoName}`]: 'off',
    },
  })),
];
