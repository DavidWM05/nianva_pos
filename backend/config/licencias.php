<?php

// El emisor de licencias vive en otro repositorio. Este cliente usa el slug fijo nianva-pos.
return [
    // URL base del emisor que valida los códigos del POS.
    'servidor_url' => env('LICENCIAS_SERVIDOR_URL'),
    // Tiempo máximo de espera por solicitud al emisor.
    'timeout_segundos' => (int) env('LICENCIAS_TIMEOUT_SEGUNDOS', 10),
    // Cron del comando programado en routes/console.php. Por defecto, a las 03:00 diariamente.
    'revalidacion_cron' => env('LICENCIAS_REVALIDACION_CRON', '0 3 * * *'),
    // Habilita la concesión local para desarrollo y e2e cuando falta una licencia.
    'permitir_concesion_local' => (bool) env('LICENCIAS_PERMITIR_CONCESION_LOCAL', false),
    // Archivo privado con el UUID persistente de esta instalación.
    'archivo_instancia' => env('LICENCIAS_ARCHIVO_INSTANCIA', storage_path('app/private/identidad-licencia')),
    // El responsable fija aquí el ID oficial de nianva-pos al darlo de alta en producción.
    // Va en código para que el entorno no pueda cambiar qué producto acepta el verificador.
    'producto_id' => null,
    // PEM públicos versionados por kid para verificar y rotar la firma.
    // Se distribuyen con el código para que el entorno no pueda sustituir la raíz de confianza.
    'llaves' => collect(glob(resource_path('licencias/*.pem')) ?: [])
        ->mapWithKeys(fn (string $ruta): array => [pathinfo($ruta, PATHINFO_FILENAME) => $ruta])
        ->all(),
];
