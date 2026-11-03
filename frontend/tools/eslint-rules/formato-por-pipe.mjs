export const RULE_NAME = 'formato-por-pipe';

const CAMPOS = /(precio|monto|total|cantidad|stock)/i;
const PIPES_OK = new Set(['dinero', 'cantidad', 'porcentaje']);
const PIPES_PROHIBIDOS = new Set(['date', 'currency', 'number', 'percent', 'decimal']);

function recorrer(expresion, visitar, vistos = new WeakSet()) {
  if (expresion === null || typeof expresion !== 'object' || vistos.has(expresion)) {
    return;
  }

  vistos.add(expresion);
  visitar(expresion);

  for (const [clave, valor] of Object.entries(expresion)) {
    // parent sube al resto de la plantilla: sin este corte, una interpolacion "ve" todo el archivo.
    if (clave === 'parent' || clave === 'loc' || clave === 'sourceSpan' || clave === 'span' || clave === 'nameSpan') {
      continue;
    }

    if (Array.isArray(valor)) {
      valor.forEach((item) => recorrer(item, visitar, vistos));
    } else if (valor && typeof valor === 'object') {
      recorrer(valor, visitar, vistos);
    }
  }
}

function pipeFinal(expresion) {
  if (expresion?.type === 'ParenthesizedExpression') {
    return pipeFinal(expresion.expression);
  }

  return expresion?.type === 'BindingPipe' ? expresion.name : null;
}

// Se recorre el arbol completo para no depender de enumerar cada tipo de nodo
// (navegacion segura, lectura por clave, aserciones, plantillas de texto...).
function pipeProhibidoEn(expresion) {
  let prohibido = null;

  recorrer(expresion, (nodo) => {
    if (prohibido === null && nodo.type === 'BindingPipe' && PIPES_PROHIBIDOS.has(nodo.name)) {
      prohibido = nodo.name;
    }
  });

  return prohibido;
}

function nombresDe(expresion) {
  const nombres = new Set();

  recorrer(expresion, (nodo) => {
    if (nodo.type === 'PropertyRead' || nodo.type === 'SafePropertyRead') {
      nombres.add(nodo.name);
    } else if ((nodo.type === 'KeyedRead' || nodo.type === 'SafeKeyedRead') && typeof nodo.key?.value === 'string') {
      nombres.add(nodo.key.value);
    }
  });

  return nombres;
}

function leeCampoDeFormato(expresion) {
  return [...nombresDe(expresion)].some((nombre) => CAMPOS.test(String(nombre)));
}
export const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Exige los pipes de ui/format para importes, cantidades y fechas.',
    },
    schema: [],
    messages: {
      requierePipe:
        'La interpolacion muestra {{campo}} sin dinero, cantidad o porcentaje. Usa un pipe de ui/format.',
      pipeProhibido:
        'No uses el pipe "{{pipe}}" en plantillas: usa los pipes de ui/format.',
    },
  },
  create(context) {
    if (context.filename.includes('.spec.ts')) {
      return {};
    }

    return {
      BoundAttribute(node) {
        const pipeProhibido = pipeProhibidoEn(node.value?.ast);

        if (pipeProhibido !== null) {
          context.report({
            loc: node.loc,
            messageId: 'pipeProhibido',
            data: { pipe: pipeProhibido },
          });
        }
      },
      BoundText(node) {
        const expresion = node.value?.ast;

        if (expresion?.type !== 'Interpolation') {
          return;
        }

        for (const item of expresion.expressions) {
          const pipeProhibido = pipeProhibidoEn(item);

          if (pipeProhibido !== null) {
            context.report({
              loc: item.loc ?? node.loc,
              messageId: 'pipeProhibido',
              data: { pipe: pipeProhibido },
            });
            continue;
          }

          if (leeCampoDeFormato(item) && !PIPES_OK.has(pipeFinal(item))) {
            context.report({
              loc: item.loc ?? node.loc,
              messageId: 'requierePipe',
              data: { campo: node.value?.source ?? 'un campo' },
            });
          }
        }
      },
    };
  },
};
