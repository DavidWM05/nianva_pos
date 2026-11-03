export const RULE_NAME = 'sin-color-en-plantilla';

const COLORES = [
  'white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'gray', 'grey',
  'purple', 'pink', 'brown', 'cyan', 'magenta', 'lime', 'navy', 'teal', 'olive',
  'maroon', 'silver', 'aqua', 'fuchsia',
];
const COLOR_RE = new RegExp(`#(?:[0-9a-f]{3,8})\\b|\\brgba?\\(|\\bhsla?\\(|\\b(?:${COLORES.join('|')})\\b`, 'i');
const CLASE_RE = new RegExp(`(?:^|\\s)(?:bg|text|border)-(?:${COLORES.join('|')})(?:-\\d{1,3})?(?=\\s|$)`, 'i');
const ATRIBUTOS_COLOR = new Set(['style', 'fill', 'stroke', 'color', 'ngStyle']);

function textosDe(expresion, textos = []) {
  if (expresion === null || typeof expresion !== 'object') {
    return textos;
  }

  if (expresion.type === 'LiteralPrimitive' && typeof expresion.value === 'string') {
    textos.push(expresion.value);
  }

  if (expresion.type === 'LiteralMap') {
    expresion.values?.forEach((valor) => textosDe(valor, textos));
  }

  if (expresion.type === 'LiteralArray') {
    expresion.expressions?.forEach((valor) => textosDe(valor, textos));
  }

  return textos;
}

function tieneColor(texto) {
  return COLOR_RE.test(texto);
}

function clasesConColor(texto) {
  return String(texto)
    .split(/\s+/)
    .some((clase) => CLASE_RE.test(clase));
}

export const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibe colores literales y clases de color fijo en plantillas.',
    },
    schema: [],
    messages: {
      color: 'No uses colores literales en plantillas: usa un token --nv-*.',
      claseColor: 'No uses clases de color fijo como "{{clase}}": usa un token --nv-*.',
    },
  },
  create(context) {
    return {
      Element(node) {
        for (const atributo of node.attributes ?? []) {
          if (atributo.name === 'class' && clasesConColor(atributo.value)) {
            context.report({
              loc: atributo.loc,
              messageId: 'claseColor',
              data: { clase: atributo.value },
            });
          } else if (ATRIBUTOS_COLOR.has(atributo.name) && tieneColor(atributo.value)) {
            context.report({
              loc: atributo.loc,
              messageId: 'color',
            });
          }
        }

        for (const input of node.inputs ?? []) {
          if (input.name === 'class' || input.name.startsWith('class.') || clasesConColor(input.name)) {
            const valores = textosDe(input.value?.ast);
            const clase = input.name.startsWith('class.')
              ? input.name.slice(6)
              : input.name === 'class'
                ? valores.join(' ')
                : input.name;

            if (clasesConColor(clase)) {
              context.report({
                loc: input.loc,
                messageId: 'claseColor',
                data: { clase },
              });
            }
          } else if (ATRIBUTOS_COLOR.has(input.name) || input.name.startsWith('style.')) {
            const valores = textosDe(input.value?.ast);

            if (valores.some(tieneColor)) {
              context.report({
                loc: input.loc,
                messageId: 'color',
              });
            }
          }
        }
      },
    };
  },
};
