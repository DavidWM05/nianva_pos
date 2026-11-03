export default {
  ignoreFiles: ['**/node_modules/**'],
  customSyntax: 'postcss-scss',
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    // stylelint no expone declaration-property-disallowed-list; esta regla
    // prohibe cualquier font-family que no venga de un token --nv-*.
    'declaration-property-value-disallowed-list': {
      'font-family': [/^(?!var\(--nv-font-family(?:\)|-))/],
    },
  },
  overrides: [
    {
      files: ['apps/**/*.scss', 'apps/**/*.css', 'feature/**/*.scss', 'feature/**/*.css'],
      rules: {
        'at-rule-disallowed-list': ['media'],
      },
    },
    {
      files: ['libs/ui/tokens/**/*.scss', 'libs/ui/tokens/**/*.css'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
        'declaration-property-value-disallowed-list': null,
        'at-rule-disallowed-list': null,
      },
    },
  ],
};
