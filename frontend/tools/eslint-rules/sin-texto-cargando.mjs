export const RULE_NAME = 'sin-texto-cargando';

const TEXTO_CARGA = /\b(cargando|generando)\b/i;

export const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prohibe el texto "Cargando" o "Generando" suelto en plantillas (UI-18).',
    },
    schema: [],
    messages: {
      textoCarga:
        'No muestres "{{texto}}" como texto: usa ui-skeleton con la forma del contenido, o el indicador del boton.',
    },
  },
  create(context) {
    function revisar(texto, loc) {
      const coincidencia = TEXTO_CARGA.exec(texto ?? '');

      if (coincidencia !== null) {
        context.report({ loc, messageId: 'textoCarga', data: { texto: coincidencia[1] } });
      }
    }

    return {
      Text(node) {
        revisar(node.value, node.loc);
      },
      BoundText(node) {
        const expresion = node.value?.ast;

        if (expresion?.type === 'Interpolation') {
          revisar(expresion.strings.join(' '), node.loc);
        }
      },
    };
  },
};
