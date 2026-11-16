<?php

declare(strict_types=1);

// ARQ-07: perfil de giro como datos. Agregar un giro es agregar un archivo como este.
return [
    'clave' => 'ferreteria',
    'nombre' => 'Ferretería',
    'atributos' => [
        ['nombre' => 'Medida', 'valores' => ['1/4"', '1/2"', '3/4"', '1"']],
        ['nombre' => 'Material', 'valores' => ['Acero', 'Cobre', 'PVC']],
    ],
    'unidades' => [
        ['nombre' => 'Pieza', 'abreviatura' => 'pz', 'tipo' => 'entero'],
        ['nombre' => 'Metro', 'abreviatura' => 'm', 'tipo' => 'fraccionario'],
        ['nombre' => 'Kilogramo', 'abreviatura' => 'kg', 'tipo' => 'fraccionario'],
    ],
    'categorias' => ['Herramientas', 'Tornillería', 'Plomería', 'Eléctrico'],
    'modulos_sugeridos' => ['cotizaciones', 'cxc'],
];
