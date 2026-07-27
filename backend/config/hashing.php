<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Hash Driver
    |--------------------------------------------------------------------------
    |
    | Argon2id (no bcrypt): resistente a ataques por GPU/ASIC gracias al
    | costo de memoria configurable, ademas de tiempo -- bcrypt solo tiene
    | costo de tiempo. Usuario::casts() ya usa 'password' => 'hashed', que
    | lee este driver automaticamente sin tocar el modelo.
    |
    */

    'driver' => env('HASH_DRIVER', 'argon2id'),

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Argon Options
    |--------------------------------------------------------------------------
    |
    | Compartido por los drivers 'argon' (Argon2i) y 'argon2id' -- Laravel
    | no tiene una clave separada por variante, solo por el 'driver' de arriba.
    | Valores por defecto de PHP (PASSWORD_ARGON2_DEFAULT_MEMORY_COST=64MB,
    | ..._TIME_COST=4, ..._THREADS=1), explicitos aqui en vez de implicitos.
    |
    */

    'argon' => [
        'memory' => env('HASH_ARGON_MEMORY', 65536),
        'threads' => env('HASH_ARGON_THREADS', 1),
        'time' => env('HASH_ARGON_TIME', 4),
        'verify' => true,
    ],

];
