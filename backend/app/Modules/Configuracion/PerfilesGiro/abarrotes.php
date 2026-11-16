<?php

declare(strict_types=1);

// ARQ-07: perfil de giro como datos. Agregar un giro es agregar un archivo como este.
return [
    'clave' => 'abarrotes',
    'nombre' => 'Abarrotes',
    'atributos' => [],
    'unidades' => [
        ['nombre' => 'Pieza', 'abreviatura' => 'pz', 'tipo' => 'entero'],
        ['nombre' => 'Kilogramo', 'abreviatura' => 'kg', 'tipo' => 'fraccionario'],
        ['nombre' => 'Litro', 'abreviatura' => 'l', 'tipo' => 'fraccionario'],
    ],
    'categorias' => ['Abarrotes', 'Bebidas', 'Granel'],
    'modulos_sugeridos' => ['cxc'],
];
