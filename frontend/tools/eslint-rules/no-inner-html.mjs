export const RULE_NAME = 'no-inner-html';

export const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallows binding or setting innerHTML/outerHTML in Angular templates.',
    },
    schema: [],
    messages: {
      noInnerHtml:
        'No uses innerHTML ni outerHTML en plantillas: muestra el texto por interpolación o usa un componente seguro.',
    },
  },
  create(context) {
    const parserServices = context.sourceCode.parserServices;

    return {
      Element(node) {
        const atributos = [...(node.attributes ?? []), ...(node.inputs ?? [])];
        const prohibido = atributos.find((atributo) =>
          ['innerhtml', 'outerhtml'].includes(String(atributo.name ?? '').toLowerCase()),
        );

        if (!prohibido) {
          return;
        }

        context.report({
          loc: parserServices.convertElementSourceSpanToLoc(context, node),
          messageId: 'noInnerHtml',
        });
      },
    };
  },
};
