import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const especificacion = join(raiz, '../../../docs/api/openapi.json');
const destino = join(raiz, 'src/lib/openapi.ts');
const destinoLimites = join(raiz, 'src/lib/limites.ts');

const ENCABEZADO = `// Generado desde docs/api/openapi.json (API-08). No lo edites a mano: cambia el backend,
// regenera la especificacion y corre \`node libs/api-contrato/scripts/generar.mjs\`.
`;

/**
 * Tipos TypeScript del contrato. rootTypes exporta cada esquema con su nombre
 * (SesionResource, GastoResource...) para importarlo sin pasar por components.
 */
export async function generarContrato(spec) {
  const ast = await openapiTS(spec, { rootTypes: true, rootTypesNoSchemaPrefix: true });

  return ENCABEZADO + astToString(ast);
}

const ENCABEZADO_LIMITES = `// Generado desde docs/api/openapi.json (UI-11b). No lo edites a mano: cambia el FormRequest,
// regenera la especificacion y corre \`node libs/api-contrato/scripts/generar.mjs\`.
`;

const METODOS = ['get', 'put', 'post', 'delete', 'patch'];

function resolver(spec, esquema) {
  const ref = esquema?.$ref;
  if (typeof ref !== 'string') {
    return esquema;
  }

  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((nodo, parte) => nodo?.[parte], spec);
}

/** Decimales de un `multipleOf` (0.01 -> 2) o de un `pattern` D2/D3/D4 (`...[0-9]{2}$`). */
function decimalesDe(propiedad) {
  if (typeof propiedad.multipleOf === 'number' && propiedad.multipleOf > 0 && propiedad.multipleOf < 1) {
    return Math.round(-Math.log10(propiedad.multipleOf));
  }
  const patron = typeof propiedad.pattern === 'string' ? /\[0-9\]\{(\d+)\}\$$/.exec(propiedad.pattern) : null;

  return patron ? Number(patron[1]) : undefined;
}

function limiteDe(spec, propiedad, requerido) {
  const limite = { requerido };
  for (const clave of ['maxLength', 'minimum', 'maximum']) {
    if (typeof propiedad[clave] === 'number') {
      limite[clave] = propiedad[clave];
    }
  }
  const decimales = decimalesDe(propiedad);
  if (decimales !== undefined) {
    limite.decimales = decimales;
  }
  const elemento = resolver(spec, propiedad.items);
  if (elemento?.properties) {
    limite.elemento = limitesDeCampos(spec, elemento);
  }

  return limite;
}

function limitesDeCampos(spec, esquema) {
  const requeridos = new Set(esquema.required ?? []);
  const campos = {};
  for (const [campo, propiedad] of Object.entries(esquema.properties)) {
    campos[campo] = limiteDe(spec, resolver(spec, propiedad), requeridos.has(campo));
  }

  return campos;
}

/**
 * Limites por ruta, metodo y campo del cuerpo JSON de la peticion: `maxLength`, `minimum`,
 * `maximum`, decimales y requerido. Un arreglo de objetos (las lineas, `items.*`, o los pagos)
 * lleva en `elemento` los limites de cada campo de una linea.
 */
export function limitesDelContrato(spec) {
  const limites = {};
  for (const [ruta, operaciones] of Object.entries(spec.paths ?? {})) {
    for (const metodo of METODOS) {
      const esquema = resolver(spec, operaciones[metodo]?.requestBody?.content?.['application/json']?.schema);
      if (!esquema?.properties) {
        continue;
      }
      limites[ruta] ??= {};
      limites[ruta][metodo] = limitesDeCampos(spec, esquema);
    }
  }

  return limites;
}

export function generarLimites(spec) {
  return `${ENCABEZADO_LIMITES}export const LIMITES = ${JSON.stringify(limitesDelContrato(spec), null, 2)} as const;\n`;
}

export function contenidoEquivalente(enDisco, esperado) {
  return enDisco.replace(/\r\n/g, '\n') === esperado.replace(/\r\n/g, '\n');
}

async function principal() {
  const check = process.argv.includes('--check');
  const spec = JSON.parse(readFileSync(especificacion, 'utf8'));
  const generado = await generarContrato(spec);
  const limites = generarLimites(spec);

  if (!check) {
    writeFileSync(destino, generado);
    writeFileSync(destinoLimites, limites);
    console.log('Tipos del contrato generados.');

    return;
  }

  const leer = (ruta) => {
    try {
      return readFileSync(ruta, 'utf8');
    } catch {
      return '';
    }
  };

  if (!contenidoEquivalente(leer(destino), generado)) {
    console.error('Tipos del contrato desactualizados: corre node libs/api-contrato/scripts/generar.mjs');
    process.exit(1);
  }

  if (!contenidoEquivalente(leer(destinoLimites), limites)) {
    console.error('Limites del contrato desactualizados: corre node libs/api-contrato/scripts/generar.mjs');
    process.exit(1);
  }

  console.log('Tipos del contrato al dia.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await principal();
}
