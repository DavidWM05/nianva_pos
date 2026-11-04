import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import openapiTS, { astToString } from 'openapi-typescript';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const especificacion = join(raiz, '../../../docs/api/openapi.json');
const destino = join(raiz, 'src/lib/openapi.ts');

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

export function contenidoEquivalente(enDisco, esperado) {
  return enDisco.replace(/\r\n/g, '\n') === esperado.replace(/\r\n/g, '\n');
}

async function principal() {
  const check = process.argv.includes('--check');
  const generado = await generarContrato(JSON.parse(readFileSync(especificacion, 'utf8')));

  if (!check) {
    writeFileSync(destino, generado);
    console.log('Tipos del contrato generados.');

    return;
  }

  let actual = '';

  try {
    actual = readFileSync(destino, 'utf8');
  } catch {
    actual = '';
  }

  if (!contenidoEquivalente(actual, generado)) {
    console.error('Tipos del contrato desactualizados: corre node libs/api-contrato/scripts/generar.mjs');
    process.exit(1);
  }

  console.log('Tipos del contrato al dia.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await principal();
}
