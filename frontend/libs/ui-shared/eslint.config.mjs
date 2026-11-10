import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'nucleo',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'nucleo',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    // Serie 50d: ui-shared sin PrimeNG, specs incluidos. data-table/ lo conserva hasta el 50n,
    // cuando se retira. Repite la regla de HttpClient porque un bloque posterior reemplaza la
    // regla completa, no la suma.
    files: ['**/*.ts'],
    ignores: ['**/data-table/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              message: 'Un componente no llama a la API: mueve la llamada a un servicio de dominio.',
            },
          ],
          patterns: ['primeng', 'primeng/*', '@primeuix/themes', '@primeuix/themes/*'],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    // Override or add rules here
    rules: {},
  },
];
