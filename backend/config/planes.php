<?php

$instalacion = env('POS_CONCESION_INSTALACION');

return [
    'entorno' => env('POS_ENTORNO_INSTALADO', 'escritorio'),
    'concesiones' => [],
    'instalacion' => is_string($instalacion) && $instalacion !== ''
        ? json_decode($instalacion, true, flags: JSON_THROW_ON_ERROR)
        : null,
];
