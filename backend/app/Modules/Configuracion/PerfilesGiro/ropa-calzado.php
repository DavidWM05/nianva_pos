<?php

declare(strict_types=1);

// ARQ-07: perfil de giro como datos. Agregar un giro es agregar un archivo como este.
return [
    'clave' => 'ropa-calzado',
    'nombre' => 'Ropa y calzado',
    'atributos' => [
        ['nombre' => 'Talla', 'valores' => ['CH', 'M', 'G', 'XG']],
        ['nombre' => 'Color', 'valores' => ['Negro', 'Blanco', 'Azul', 'Rojo']],
    ],
    'unidades' => [
        ['nombre' => 'Pieza', 'abreviatura' => 'pz', 'tipo' => 'entero'],
    ],
    'categorias' => ['Ropa', 'Calzado', 'Accesorios'],
    'modulos_sugeridos' => ['gift_cards', 'notas_credito', 'ventas_plazos'],
];
