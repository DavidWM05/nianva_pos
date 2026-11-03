import { readFileSync } from 'node:fs';

import nx from '@nx/eslint-plugin';

import { RULE_NAME as formatoPorPipeName, rule as formatoPorPipe } from './tools/eslint-rules/formato-por-pipe.mjs';
import { RULE_NAME as noInnerHtmlName, rule as noInnerHtml } from './tools/eslint-rules/no-inner-html.mjs';
import { RULE_NAME as sinColorName, rule as sinColor } from './tools/eslint-rules/sin-color-en-plantilla.mjs';

const formatoPendientes = JSON.parse(
  readFileSync(new URL('./tools/eslint-rules/formato-pendientes.json', import.meta.url), 'utf8'),
);

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
    files: ['**/*.html'],
    plugins: {
      nianva: {
        rules: {
          [noInnerHtmlName]: noInnerHtml,
          [formatoPorPipeName]: formatoPorPipe,
          [sinColorName]: sinColor,
        },
      },
    },
    rules: {
      [`nianva/${noInnerHtmlName}`]: 'error',
      [`nianva/${formatoPorPipeName}`]: 'error',
      [`nianva/${sinColorName}`]: 'error',
      // Temporal: el binding [style] se permite hasta que ui-modal (Fase 2,
      // encargo 8) reemplace los p-dialog. Al terminar la migracion se quita
      // allowBindToStyle y la regla queda estricta.
      '@angular-eslint/template/no-inline-styles': ['error', { allowBindToStyle: true }],
    },
  },
  ...formatoPendientes.map((ruta) => ({
    files: [ruta],
    rules: {
      [`nianva/${formatoPorPipeName}`]: 'off',
    },
  })),
];
