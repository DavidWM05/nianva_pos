/**
 * URL base del backend Laravel. Hardcodeada a la instancia de desarrollo
 * local por ahora -- este proyecto todavia no tiene un sistema de
 * environments (Angular ya no lo genera por defecto en apps nuevas).
 * Antes de un deploy real, esto debe moverse a un archivo de environment
 * por configuracion (development/production) con fileReplacements.
 */
export const API_BASE_URL = 'http://localhost:8000';
