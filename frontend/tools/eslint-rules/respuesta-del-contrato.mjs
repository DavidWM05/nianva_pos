export const RULE_NAME = 'respuesta-del-contrato';

const CONTRATO = '@nianva/api-contrato';
const METODOS = new Set(['get', 'post', 'put', 'patch', 'delete']);
// Utilidades de TypeScript que solo transforman: se revisan sus argumentos.
const UTILIDADES = new Set(['Array', 'ReadonlyArray', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'NonNullable']);

function nombreRaiz(typeName) {
  let actual = typeName;

  while (actual.type === 'TSQualifiedName') {
    actual = actual.left;
  }

  return actual.type === 'Identifier' ? actual.name : null;
}

export const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'El tipo de respuesta de una llamada a urlApi sale del contrato generado (@nianva/api-contrato), nunca de una interfaz escrita a mano (API-08).',
    },
    schema: [],
    messages: {
      sinTipo: 'Tipa la respuesta con RespuestaDe<ruta, metodo> de @nianva/api-contrato.',
      aMano:
        'La respuesta usa "{{tipo}}", que no viene de @nianva/api-contrato: usa RespuestaDe<ruta, metodo> o un esquema generado.',
    },
  },
  create(context) {
    const delContrato = new Set();

    function primerTipoAjeno(nodo) {
      switch (nodo.type) {
        case 'TSVoidKeyword':
          return null;
        case 'TSArrayType':
          return primerTipoAjeno(nodo.elementType);
        case 'TSIndexedAccessType':
          return primerTipoAjeno(nodo.objectType);
        case 'TSTypeReference': {
          const nombre = nombreRaiz(nodo.typeName);

          if (nombre !== null && delContrato.has(nombre)) {
            return null;
          }

          if (nombre !== null && UTILIDADES.has(nombre)) {
            for (const argumento of nodo.typeArguments?.params ?? []) {
              const ajeno = primerTipoAjeno(argumento);

              if (ajeno !== null) {
                return ajeno;
              }
            }

            return null;
          }

          return nombre ?? context.sourceCode.getText(nodo);
        }
        default:
          return context.sourceCode.getText(nodo);
      }
    }

    return {
      ImportDeclaration(nodo) {
        if (nodo.source.value !== CONTRATO) {
          return;
        }

        for (const especificador of nodo.specifiers) {
          delContrato.add(especificador.local.name);
        }
      },
      CallExpression(nodo) {
        const { callee } = nodo;
        const url = nodo.arguments[0];

        if (
          callee.type !== 'MemberExpression' ||
          callee.property.type !== 'Identifier' ||
          !METODOS.has(callee.property.name) ||
          url?.type !== 'CallExpression' ||
          url.callee.type !== 'Identifier' ||
          url.callee.name !== 'urlApi'
        ) {
          return;
        }

        const tipos = nodo.typeArguments?.params ?? [];

        if (tipos.length === 0) {
          context.report({ node: callee.property, messageId: 'sinTipo' });

          return;
        }

        const ajeno = primerTipoAjeno(tipos[0]);

        if (ajeno !== null) {
          context.report({ node: tipos[0], messageId: 'aMano', data: { tipo: ajeno } });
        }
      },
    };
  },
};
