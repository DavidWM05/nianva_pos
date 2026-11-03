import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const rutaBase = join(raiz, 'ui-baseline.json');
const modo = process.argv.includes('--actualizar') ? 'actualizar' : process.argv.includes('--check') ? 'check' : 'generar';

function recorrer(directorio) {
  if (! existsSync(directorio)) {
    return [];
  }

  return readdirSync(directorio).flatMap((nombre) => {
    const ruta = join(directorio, nombre);

    return statSync(ruta).isDirectory() ? recorrer(ruta) : [ruta];
  });
}

function lineasNoVacias(texto) {
  return texto.split(/\r?\n/).filter((linea) => linea.trim() !== '').length;
}

function estilosInline(archivo) {
  const contenido = readFileSync(archivo, 'utf8');
  const bloques = [...contenido.matchAll(/styles\s*:\s*(?:\[([\s\S]*?)\]|`([\s\S]*?)`)/g)];

  return bloques.reduce((total, bloque) => total + lineasNoVacias(bloque[1] ?? bloque[2]), 0);
}

const archivos = {};

for (const directorio of ['apps', 'feature']) {
  for (const archivo of recorrer(join(raiz, directorio))) {
    const extension = archivo.split('.').pop();

    if (extension === 'scss' || extension === 'css') {
      const ruta = relative(raiz, archivo).split(sep).join('/');
      archivos[ruta] = lineasNoVacias(readFileSync(archivo, 'utf8'));
    } else if (archivo.endsWith('.component.ts')) {
      const lineas = estilosInline(archivo);

      if (lineas > 0) {
        archivos[relative(raiz, archivo).split(sep).join('/')] = lineas;
      }
    }
  }
}

const ordenados = Object.fromEntries(Object.entries(archivos).sort(([a], [b]) => a.localeCompare(b)));
const total = Object.values(ordenados).reduce((suma, lineas) => suma + lineas, 0);
const siguiente = { total, archivos: ordenados };
const anterior = existsSync(rutaBase) ? JSON.parse(readFileSync(rutaBase, 'utf8')) : null;

if (modo === 'generar') {
  writeFileSync(rutaBase, `${JSON.stringify(siguiente, null, 2)}\n`);
  console.log(`Línea base generada: ${total} líneas en ${Object.keys(ordenados).length} archivos.`);
  process.exit(0);
}

if (anterior === null) {
  console.error('No existe ui-baseline.json.');
  process.exit(1);
}

const aumentos = [];
const bajadas = [];
const previos = anterior.archivos ?? {};

for (const [ruta, lineas] of Object.entries(ordenados)) {
  if (!(ruta in previos)) {
    aumentos.push(`${ruta}: archivo nuevo (${lineas} líneas).`);
  } else if (lineas > previos[ruta]) {
    aumentos.push(`${ruta}: subió de ${previos[ruta]} a ${lineas} líneas.`);
  } else if (lineas < previos[ruta]) {
    bajadas.push(`${ruta}: bajó de ${previos[ruta]} a ${lineas} líneas sin actualizar la línea base.`);
  }
}

for (const ruta of Object.keys(previos)) {
  if (!(ruta in ordenados)) {
    bajadas.push(`${ruta}: desapareció y sigue en la línea base.`);
  }
}

if (total > anterior.total) {
  aumentos.push(`El total subió de ${anterior.total} a ${total}.`);
} else if (total < anterior.total) {
  bajadas.push(`El total bajó de ${anterior.total} a ${total} sin actualizar la línea base.`);
}

if (modo === 'check') {
  const errores = [...aumentos, ...bajadas];

  if (errores.length > 0) {
    console.error(errores.join('\n'));
    process.exit(1);
  }

  console.log(`Línea base al día: ${total} líneas en ${Object.keys(ordenados).length} archivos.`);
  process.exit(0);
}

if (aumentos.length > 0) {
  console.error(aumentos.join('\n'));
  console.error('No se actualiza la línea base porque hay aumentos o archivos nuevos.');
  process.exit(1);
}

writeFileSync(rutaBase, `${JSON.stringify(siguiente, null, 2)}\n`);
console.log(`Línea base actualizada: ${total} líneas en ${Object.keys(ordenados).length} archivos.`);
