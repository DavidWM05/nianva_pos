<?php

use Dedoc\Scramble\Http\Middleware\RestrictedDocsAccess;

return [
    'api_path' => 'api/v1',

    'api_domain' => null,

    // Regenerar (igual que CI): contra una SQLite nueva y migrada, nunca contra la BD
    // de desarrollo, porque Scramble lee el esquema de los modelos. Desde backend/:
    //   touch storage/framework/testing/openapi.sqlite
    //   DB_CONNECTION=sqlite DB_DATABASE=$PWD/storage/framework/testing/openapi.sqlite php artisan migrate --force
    //   DB_CONNECTION=sqlite DB_DATABASE=$PWD/storage/framework/testing/openapi.sqlite php artisan scramble:export
    'export_path' => '../docs/api/openapi.json',

    'cache' => [
        'key' => 'scramble.openapi',
        'store' => 'file',
    ],

    'info' => [
        'version' => '1',
        'description' => '',
    ],

    'ui' => [
        'title' => 'Nianva POS API',
    ],

    'dev_tools' => [
        'enabled' => env('SCRAMBLE_DEV_TOOLS', env('APP_DEBUG', false)),
    ],

    'renderer' => 'elements',

    'renderers' => [
        'elements' => [
            'view' => 'scramble::docs',
            'theme' => 'light',
            'hideTryIt' => false,
            'hideSchemas' => false,
            'logo' => '',
            'tryItCredentialsPolicy' => 'include',
            'layout' => 'responsive',
            'router' => 'hash',
        ],
        'scalar' => [
            'view' => 'scramble::scalar',
            'cdn' => 'https://cdn.jsdelivr.net/npm/@scalar/api-reference',
            'theme' => 'laravel',
            'proxyUrl' => 'https://proxy.scalar.com',
            'darkMode' => false,
            'showDeveloperTools' => 'never',
            'agent' => ['disabled' => true],
            'credentials' => 'include',
        ],
    ],

    // Fijo a proposito: con null, Scramble antepone APP_URL y el archivo exportado
    // cambiaria segun el .env de cada maquina (CI compara byte a byte). El frontend
    // no lo usa: toma la direccion del backend de config.json (ARQ-13).
    'servers' => [
        'Servidor local de desarrollo' => 'http://localhost/api/v1',
    ],

    'enum_cases_description_strategy' => 'description',

    'enum_cases_names_strategy' => false,

    'flatten_deep_query_parameters' => true,

    'middleware' => [
        'web',
        RestrictedDocsAccess::class,
    ],

    'extensions' => [],

    'security_strategy' => null,
];
