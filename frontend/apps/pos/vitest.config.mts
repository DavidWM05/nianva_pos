import { defineConfig } from 'vitest/config';

// Limites de tiempo de los specs de pos (lo demas lo pone @angular/build:unit-test).
//
// Sin carga, el test mas lento tarda ~1.5 s; el costo esta en el beforeEach que compila el
// componente (compileComponents con PrimeNG y RecordTabs). Con la maquina cargada (nx
// run-many en paralelo, el servidor de desarrollo o otra sesion corriendo tests) ese mismo
// paso llego a 5-11 s y rompia los limites por defecto de Vitest: testTimeout de 5 s y
// hookTimeout de 10 s. Estos limites dejan margen sin esconder un test que se cuelga.
export default defineConfig({
  test: {
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
