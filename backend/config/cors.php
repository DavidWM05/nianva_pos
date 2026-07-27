<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | supports_credentials en true es obligatorio para que el navegador
    | envie/reciba la cookie de sesion de Sanctum en peticiones cross-origin
    | (frontend en un puerto distinto al backend). allowed_origins viene de
    | env, nunca '*' -- '*' es incompatible con supports_credentials segun
    | la especificacion CORS (el navegador lo rechaza silenciosamente).
    |
    */

    'paths' => [
        'login',
        'login/2fa-verify',
        'logout',
        'password/forgot',
        'password/reset',
        'sanctum/csrf-cookie',
        'api/*',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:4200')))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
