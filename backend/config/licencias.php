<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cliente del servidor central de licencias
    |--------------------------------------------------------------------------
    |
    | El servidor de licencias es un proyecto aparte (no vive en este repo).
    | Este archivo solo configura CÓMO esta instalación de Núcleo le habla.
    | producto_slug/servidor_url nunca se hardcodean -- cada instalación de
    | cada producto vertical (POS Ropa, Angara Dental, etc.) trae su propio
    | .env con su propio slug y, potencialmente, su propio servidor.
    */

    'producto_slug' => env('LICENCIAS_PRODUCTO_SLUG'),

    'servidor_url' => env('LICENCIAS_SERVIDOR_URL'),

    /*
    | Segundos de espera antes de dar por caída la conexión al servidor de
    | licencias -- ver LicenciaClienteService::llamarServidor().
    */
    'timeout_segundos' => (int) env('LICENCIAS_TIMEOUT_SEGUNDOS', 10),

    /*
    | Días desde la última validación EXITOSA durante los cuales el sistema
    | sigue funcionando con el último estado conocido si el servidor no
    | responde -- ver LicenciaClienteService::revalidar(). Nunca aplica si el
    | servidor SÍ respondió (aunque la respuesta sea "revocada"/"vencida":
    | eso se refleja de inmediato, sin gracia).
    */
    'periodo_gracia_dias' => (int) env('LICENCIAS_PERIODO_GRACIA_DIAS', 7),

    /*
    | Expresión cron para el job programado de revalidación (ver
    | routes/console.php). Default: todos los días a las 3:00 AM.
    */
    'revalidacion_cron' => env('LICENCIAS_REVALIDACION_CRON', '0 3 * * *'),
];
