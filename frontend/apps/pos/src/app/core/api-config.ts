// La base del backend y urlApi()/urlSesion() viven en @nianva/core-http (ARQ-12b), para que los
// servicios de libs/domain/* las usen sin depender de la app. Este archivo las reexporta.
export { baseApiActual, configurarBaseApi, esUrlBackend, urlApi, urlSesion } from '@nianva/core-http';
